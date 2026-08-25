// Nightly audit-archive cron endpoint. Protect with the shared cron secret.

import { NextResponse } from 'next/server'
import { serverEnv } from '@/lib/validation/env'
import { runNightlyAuditArchive } from '@/server/services/audit-archive'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (request.headers.get('x-vinsend-cron') !== serverEnv().API_KEY_PEPPER) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const result = await runNightlyAuditArchive()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
