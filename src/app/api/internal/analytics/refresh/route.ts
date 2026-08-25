// Hourly cron endpoint that refreshes the materialized analytics view.
// Protect with the same shared secret as the webhook sweep.

import { NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/db/service'
import { serverEnv } from '@/lib/validation/env'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (request.headers.get('x-vinsend-cron') !== serverEnv().API_KEY_PEPPER) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const started = Date.now()
  try {
    const sb = getServiceRoleClient()
    const { error } = await sb.rpc('refresh_email_events_daily')
    if (error) throw error
    return NextResponse.json({ ok: true, duration_ms: Date.now() - started })
  } catch (err) {
    logger.error('analytics.refresh_failed', { err: (err as Error).message })
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    )
  }
}
