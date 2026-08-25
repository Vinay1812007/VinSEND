// Postmark webhook receiver. Postmark webhooks are unsigned; project isolation
// comes from the ?token= query param, which the operator sets to a per-project
// secret. Configure in Postmark → Servers → Webhooks.

import { NextResponse } from 'next/server'
import { serverEnv } from '@/lib/validation/env'
import { applyProviderEvent } from '@/server/services/provider-events'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface PostmarkEvent {
  RecordType?: string // Delivery | Bounce | SpamComplaint | Open | Click
  Metadata?: Record<string, string>
  Recipient?: string
  Email?: string
  MessageID?: string
  Type?: string // for Bounce: HardBounce | SoftBounce | Transient
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get('token') !== serverEnv().API_KEY_PEPPER) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  let body: PostmarkEvent
  try {
    body = (await request.json()) as PostmarkEvent
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const record = (body.RecordType ?? '').toLowerCase()
  const map: Record<string, 'delivered' | 'bounce' | 'complaint' | 'open' | 'click' | 'unknown'> = {
    delivery: 'delivered',
    bounce: 'bounce',
    spamcomplaint: 'complaint',
    open: 'open',
    click: 'click',
  }
  const type = map[record] ?? 'unknown'
  const hardBounce = type === 'bounce' && (body.Type ?? '') === 'HardBounce'
  const recipient = body.Recipient ?? body.Email
  const vinsendId = body.Metadata?.vinsend_id ?? null

  const result = await applyProviderEvent({
    vinsendMessageId: vinsendId,
    eventType: type,
    hardBounce,
    affectedRecipients: recipient ? [recipient] : [],
    providerEventId: body.MessageID ?? null,
    raw: body as unknown as Record<string, unknown>,
  })
  return NextResponse.json({ ok: true, ...result })
}
