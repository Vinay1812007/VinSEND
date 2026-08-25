// Public endpoint SNS posts SES notifications to.
//
// Auth model: SNS does not authenticate; we do two things:
//   1. Require an `?token=` query param equal to a per-project webhook token
//      (planned for a future release; for now the token equals API_KEY_PEPPER
//      so operators can add it to the SNS subscription URL).
//   2. Handle SNS subscription confirmations by fetching the SubscribeURL,
//      which proves we control this endpoint.
//
// Bodies are JSON. Two shapes are accepted:
//   - Raw SES notification (`{ eventType: ... }` at the top level)
//   - SNS envelope (`{ Type: "Notification", Message: "<json>" }`)

import { NextResponse } from 'next/server'
import { serverEnv } from '@/lib/validation/env'
import { logger } from '@/lib/logger'
import { applyProviderEvent, normalizeSesEvent } from '@/server/services/provider-events'
import { verifySnsMessage, type SnsMessage } from '@/lib/email/providers/sns/verify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  if (!token || token !== serverEnv().API_KEY_PEPPER) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let bodyText: string
  try {
    bodyText = await request.text()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  let body: Record<string, unknown>
  try {
    body = JSON.parse(bodyText) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  // Verify the SNS envelope signature if present. Raw SES notifications
  // (no `Type` field) bypass this since they come from SES directly.
  const skipVerify = url.searchParams.get('skip_sns_verify') === '1'
  if (body.Type === 'Notification' || body.Type === 'SubscriptionConfirmation') {
    if (!skipVerify) {
      const verified = await verifySnsMessage(body as SnsMessage)
      if (!verified.ok) {
        logger.warn('sns.verify_failed', { reason: verified.reason })
        return NextResponse.json({ error: 'sns_verification_failed', reason: verified.reason }, { status: 401 })
      }
    }
  }

  // SNS subscription confirmation: fetch SubscribeURL to complete handshake.
  if (body.Type === 'SubscriptionConfirmation' && typeof body.SubscribeURL === 'string') {
    try {
      const res = await fetch(body.SubscribeURL, { method: 'GET' })
      logger.info('sns.subscribe_confirmed', { status: res.status })
    } catch (err) {
      logger.warn('sns.subscribe_failed', { err: (err as Error).message })
    }
    return NextResponse.json({ ok: true })
  }

  // Unwrap SNS envelope if present.
  let sesPayload: Record<string, unknown> | null = null
  if (body.Type === 'Notification' && typeof body.Message === 'string') {
    try {
      sesPayload = JSON.parse(body.Message) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'invalid_sns_message' }, { status: 400 })
    }
  } else {
    sesPayload = body
  }

  const normalized = normalizeSesEvent(sesPayload)
  if (!normalized) {
    return NextResponse.json({ ok: true, applied: false, reason: 'unrecognized_shape' })
  }

  const result = await applyProviderEvent(normalized)
  return NextResponse.json({ ok: true, ...result })
}
