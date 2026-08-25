import Link from 'next/link'
import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader } from '@/components/ui/card'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'
import { Tag, statusToTone } from '@/components/ui/tag'
import { loadDashboardContext } from '@/server/services/current-context'
import { getServiceRoleClient } from '@/lib/db/service'

export const dynamic = 'force-dynamic'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default async function DayDrilldownPage({
  params,
}: {
  params: Promise<{ org: string; project: string; date: string }>
}) {
  const { org, project, date } = await params
  const ctx = await loadDashboardContext(org, project)
  if (!DATE_RE.test(date)) {
    return (
      <>
        <PageHeader eyebrow="Analytics" title="Invalid date" description="Expected yyyy-mm-dd." />
      </>
    )
  }
  const start = `${date}T00:00:00Z`
  const end = `${date}T23:59:59Z`

  const sb = getServiceRoleClient()
  const { data: emails } = await sb
    .from('emails')
    .select('public_id, from_address, subject, status, created_at')
    .eq('project_id', ctx.project.id)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false })
    .limit(500)
  const rows = (emails ?? []) as Array<{
    public_id: string
    from_address: string
    subject: string
    status: string
    created_at: string
  }>

  const base = `/app/${ctx.org.slug}/${ctx.project.public_id}`
  return (
    <>
      <PageHeader
        eyebrow="Analytics · Day"
        title={date}
        description={`${rows.length} email${rows.length === 1 ? '' : 's'} on this day (capped at 500).`}
      />
      <Card>
        <CardHeader title="Sent on this day" eyebrow="All statuses" />
        <DataTable
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'from', label: 'From' },
            { key: 'subject', label: 'Subject' },
            { key: 'status', label: 'Status' },
            { key: 'when', label: 'Time', align: 'right' },
          ]}
        >
          {rows.map((e) => (
            <TableRow key={e.public_id}>
              <TableCell mono>
                <Link href={`${base}/emails/${e.public_id}`} className="hover:underline text-[color:var(--accent)]">
                  {e.public_id.slice(0, 20)}…
                </Link>
              </TableCell>
              <TableCell mono>{e.from_address}</TableCell>
              <TableCell>{e.subject}</TableCell>
              <TableCell>
                <Tag tone={statusToTone(e.status)}>{e.status}</Tag>
              </TableCell>
              <TableCell align="right" mono>
                {new Date(e.created_at).toLocaleTimeString()}
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      </Card>
    </>
  )
}
