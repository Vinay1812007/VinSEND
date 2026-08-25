// CSV download of all contacts for the current project. Streamed via a
// standard Response — dashboard-only, session-authenticated.

import { NextResponse } from 'next/server'
import { toCsv } from '@/lib/csv/write'
import { loadDashboardContext } from '@/server/services/current-context'
import { listContactsByProject } from '@/server/services/contacts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ org: string; project: string }> },
) {
  const { org, project } = await params
  const ctx = await loadDashboardContext(org, project)
  const rows = await listContactsByProject(ctx.project.id, { limit: 5000 })

  const propertyKeys = Array.from(
    rows.reduce<Set<string>>((set, r) => {
      for (const k of Object.keys(r.properties ?? {})) set.add(k)
      return set
    }, new Set()),
  )

  const headers = ['email', 'first_name', 'last_name', 'status', ...propertyKeys]
  const flat = rows.map((r) => ({
    email: r.email,
    first_name: r.first_name ?? '',
    last_name: r.last_name ?? '',
    status: r.status,
    ...(r.properties as Record<string, unknown>),
  }))
  const csv = toCsv(headers, flat)

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="contacts-${ctx.project.public_id}.csv"`,
    },
  })
}
