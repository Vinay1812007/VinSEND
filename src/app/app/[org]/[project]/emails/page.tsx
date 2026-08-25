import Link from 'next/link'
import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'
import { Tag, statusToTone } from '@/components/ui/tag'
import { loadDashboardContext } from '@/server/services/current-context'
import { listEmails } from '@/server/services/emails-query'

export const dynamic = 'force-dynamic'

export default async function EmailsPage({
  params,
}: {
  params: Promise<{ org: string; project: string }>
}) {
  const { org, project } = await params
  const ctx = await loadDashboardContext(org, project)
  const { rows } = await listEmails(ctx.project.id, { limit: 100 })
  const base = `/app/${ctx.org.slug}/${ctx.project.public_id}`

  return (
    <>
      <PageHeader eyebrow="Emails" title="Message log" description="Every message sent through this project." />
      <Card>
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No emails yet"
              description="Once you send through POST /v1/emails, every message shows up here with full lifecycle events."
            />
          </div>
        ) : (
          <DataTable
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'from', label: 'From' },
              { key: 'subject', label: 'Subject' },
              { key: 'status', label: 'Status' },
              { key: 'when', label: 'Created', align: 'right' },
            ]}
          >
            {rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell mono>
                  <Link href={`${base}/emails/${e.public_id}`} className="hover:underline text-[color:var(--accent)]">
                    {e.public_id}
                  </Link>
                </TableCell>
                <TableCell mono>{e.from_address}</TableCell>
                <TableCell>{e.subject}</TableCell>
                <TableCell>
                  <Tag tone={statusToTone(e.status)}>{e.status}</Tag>
                </TableCell>
                <TableCell align="right" mono>
                  {new Date(e.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  )
}
