// SendGrid Event Webhook receiver.
// SendGrid POSTs an array of events. Verification uses ECDSA over the raw
// body: configure the public key in ?public_key=<base64 der or PEM>.

import { NextResponse } from 'next/server'
import { serverEnv } from '@/lib/validation/env'
import { verifySendGridSignature } from '@/lib/email/providers/sendgrid'
import { applyProviderEvent } from '@/server/services/provider-events'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface SgEvent {
  email?: string
  event?: string
  sg_event_id?: string
  reason?: string
  bounce_classification?: string
  vinsend_id?: string
  category?: string[]
  type?: string
}

const SIG_HEADER = 'x-twilio-email-event-webhook-signature'
const TS_HEADER = 'x-twilio-email-event-webhook-timestamp'

export async function POST(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get('token') !== serverEnv().API_KEY_PEPPER) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const publicKeyEnc = url.searchParams.get('public_key')
  if (!publicKeyEnc) return NextResponse.json({ error: 'missing_public_key' }, { status: 400 })

  const rawBody = await request.text()
  const publicKeyPem = decodePem(publicKeyEnc)
  const sig = request.headers.get(SIG_HEADER)
  const ts = request.headers.get(TS_HEADER)
  if (!sig || !ts) return NextResponse.json({ error: 'missing_headers' }, { status: 400 })

  const ok = verifySendGridSignature({
    publicKeyPem,
    timestamp: ts,
    signatureBase64: sig,
    rawBody,
  })
  if (!ok) return NextResponse.json({ error: 'signature_mismatch' }, { status: 401 })

  let events: SgEvent[]
  try {
    events = JSON.parse(rawBody) as SgEvent[]
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const map: Record<string, 'delivered' | 'bounce' | 'complaint' | 'open' | 'click' | 'unknown'> = {
    delivered: 'delivered',
    bounce: 'bounce',
    dropped: 'bounce',
    spamreport: 'complaint',
    open: 'open',
    click: 'click',
  }
  const applied: number[] = []
  for (const e of events) {
    const type = map[(e.event ?? '').toLowerCase()] ?? 'unknown'
    const hardBounce =
      type === 'bounce' &&
      ((e.type ?? '').toLowerCase() === 'bounce' ||
        (e.bounce_classification ?? '').toLowerCase() === 'invalid address')
    const res = await applyProviderEvent({
      vinsendMessageId: e.vinsend_id ?? null,
      eventType: type,
      hardBounce,
      affectedRecipients: e.email ? [e.email] : [],
      providerEventId: e.sg_event_id ?? null,
      raw: e as unknown as Record<string, unknown>,
    })
    applied.push(res.applied ? 1 : 0)
  }
  return NextResponse.json({ ok: true, applied: applied.reduce((a, b) => a + b, 0), total: events.length })
}

function decodePem(input: string): string {
  const decoded = decodeURIComponent(input)
  if (decoded.includes('BEGIN PUBLIC KEY')) return decoded
  // Assume base64 DER — wrap it as PEM.
  return `-----BEGIN PUBLIC KEY-----\n${decoded.match(/.{1,64}/g)?.join('\n') ?? decoded}\n-----END PUBLIC KEY-----\n`
}
