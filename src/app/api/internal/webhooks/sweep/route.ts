// Internal cron endpoint. Protected by a shared secret in `x-vinsend-cron`.
// Ping it from Render Cron or any external scheduler once per minute.

import { NextResponse } from 'next/server'
import { runWebhookRetrySweep } from '@/server/workers/webhook-retry'
import { serverEnv } from '@/lib/validation/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const header = request.headers.get('x-vinsend-cron')
  const expected = serverEnv().API_KEY_PEPPER // reuse as shared secret for now
  if (!header || header !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const url = new URL(request.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 50), 1), 200)
  const result = await runWebhookRetrySweep(limit)
  return NextResponse.json({ ok: true, ...result })
}
