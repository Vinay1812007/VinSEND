import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Liveness probe. Returns 200 if the process can respond to HTTP.
 * Never touches the database (Render's health-check must not depend on it).
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'vinsend',
    commit: process.env.RENDER_GIT_COMMIT?.slice(0, 12) ?? 'dev',
    node: process.version,
    uptime_seconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  })
}
