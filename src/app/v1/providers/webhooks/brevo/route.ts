// Brevo webhook receiver. Brevo webhooks are unsigned; protect the URL with
// the ?token= query param.

import { NextResponse } from 'next/server'
import { serverEnv } from '@/lib/validation/env'
import { applyProviderEvent } from '@/server/services/provider-events'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface BrevoEvent {
  event?: string // delivered | hard_bounce | soft_bounce | spam | opened | click | request
  email?: string
  'message-id'?: string
  reason?: string
  X_Mailin_custom?: string
  params?: Record<string, string>
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get('token') !== serverEnv().API_KEY_PEPPER) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  let body: BrevoEvent
  try {
    body = (await request.json()) as BrevoEvent
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const type = (body.event ?? '').toLowerCase()
  const map: Record<string, 'delivered' | 'bounce' | 'complaint' | 'open' | 'click' | 'unknown'> = {
    delivered: 'delivered',
    hard_bounce: 'bounce',
    soft_bounce: 'bounce',
    spam: 'complaint',
    opened: 'open',
    click: 'click',
  }
  const normalized = map[type] ?? 'unknown'
  const hardBounce = type === 'hard_bounce'

  const result = await applyProviderEvent({
    vinsendMessageId: body.params?.vinsend_id ?? null,
    eventType: normalized,
    hardBounce,
    affectedRecipients: body.email ? [body.email] : [],
    providerEventId: body['message-id'] ?? null,
    raw: body as unknown as Record<string, unknown>,
  })
  return NextResponse.json({ ok: true, ...result })
}
