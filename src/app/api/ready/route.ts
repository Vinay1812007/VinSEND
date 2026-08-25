import { NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/db/service'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Readiness probe. Returns 200 only if the service can reach Postgres.
 * Reports non-secret dependency versions so operators can spot drift.
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; latency_ms?: number; error?: string }> = {}

  try {
    const start = Date.now()
    const sb = getServiceRoleClient()
    // Cheap select: count(*) with head on the smallest table.
    const { error } = await sb
      .from('organizations')
      .select('*', { count: 'exact', head: true })
    if (error) throw error
    checks.postgres = { ok: true, latency_ms: Date.now() - start }
  } catch (err) {
    checks.postgres = { ok: false, error: (err as Error).message }
    logger.warn('ready.postgres_fail', { err: (err as Error).message })
  }

  const ok = Object.values(checks).every((c) => c.ok)
  return NextResponse.json(
    {
      status: ok ? 'ready' : 'degraded',
      checks,
      commit: process.env.RENDER_GIT_COMMIT?.slice(0, 12) ?? 'dev',
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  )
}
