// Mailgun event webhook receiver.
// Configure your Mailgun domain to POST to
//   POST /v1/providers/webhooks/mailgun?token=<API_KEY_PEPPER>&signing_key=<mailgun signing key>
// (The signing_key query param is used because Mailgun has no header we can
// use to identify the project. Rotate it whenever you rotate the Mailgun key.)

import { NextResponse } from 'next/server'
import { serverEnv } from '@/lib/validation/env'
import { verifyMailgunSignature } from '@/lib/email/providers/mailgun'
import { applyProviderEvent } from '@/server/services/provider-events'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface MailgunWebhook {
  signature?: { timestamp?: string; token?: string; signature?: string }
  'event-data'?: {
    event?: string
    id?: string
    recipient?: string
    'user-variables'?: Record<string, string>
    severity?: string
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get('token') !== serverEnv().API_KEY_PEPPER) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const signingKey = url.searchParams.get('signing_key')
  if (!signingKey) {
    return NextResponse.json({ error: 'missing_signing_key' }, { status: 400 })
  }

  let body: MailgunWebhook
  try {
    body = (await request.json()) as MailgunWebhook
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const sig = body.signature
  if (!sig?.timestamp || !sig.token || !sig.signature) {
    return NextResponse.json({ error: 'invalid_signature_block' }, { status: 400 })
  }
  const ok = verifyMailgunSignature({
    signingKey,
    timestamp: sig.timestamp,
    token: sig.token,
    signature: sig.signature,
  })
  if (!ok) return NextResponse.json({ error: 'signature_mismatch' }, { status: 401 })

  const e = body['event-data']
  if (!e) return NextResponse.json({ ok: true, applied: false, reason: 'no_event_data' })

  const vinsendId = e['user-variables']?.vinsend_id ?? null
  const mapped: Record<string, string> = {
    delivered: 'delivered',
    failed: 'bounce',
    complained: 'complaint',
    opened: 'open',
    clicked: 'click',
    accepted: 'send',
    rejected: 'reject',
  }
  const rawEvent = (e.event ?? '').toLowerCase()
  const normalizedType = (mapped[rawEvent] ?? 'unknown') as
    | 'delivered' | 'bounce' | 'complaint' | 'open' | 'click' | 'reject' | 'send' | 'unknown'

  const hardBounce = rawEvent === 'failed' && (e.severity ?? '').toLowerCase() === 'permanent'

  const result = await applyProviderEvent({
    vinsendMessageId: vinsendId,
    eventType: normalizedType,
    hardBounce,
    affectedRecipients: e.recipient ? [e.recipient] : [],
    providerEventId: e.id ?? null,
    raw: body as unknown as Record<string, unknown>,
  })
  return NextResponse.json({ ok: true, ...result })
}
