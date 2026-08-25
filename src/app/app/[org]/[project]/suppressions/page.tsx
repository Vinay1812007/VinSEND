import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'
import { Tag } from '@/components/ui/tag'
import { loadDashboardContext } from '@/server/services/current-context'
import { listSuppressions } from '@/server/services/suppressions'

export const dynamic = 'force-dynamic'

export default async function SuppressionsPage({
  params,
}: {
  params: Promise<{ org: string; project: string }>
}) {
  const { org, project } = await params
  const ctx = await loadDashboardContext(org, project)
  const rows = await listSuppressions(ctx.project.id)

  return (
    <>
      <PageHeader
        eyebrow="Suppressions"
        title="Do-not-send list"
        description="Addresses on this list are silently dropped from outbound sends."
      />
      <Card>
        <CardHeader title={`${rows.length} address${rows.length === 1 ? '' : 'es'}`} eyebrow="Current" />
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Nothing suppressed"
              description="Complaints and hard bounces will land here automatically once webhook events are wired to your provider."
            />
          </div>
        ) : (
          <DataTable
            columns={[
              { key: 'email', label: 'Email' },
              { key: 'reason', label: 'Reason' },
              { key: 'source', label: 'Source' },
              { key: 'when', label: 'Added', align: 'right' },
            ]}
          >
            {rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell mono>{s.email}</TableCell>
                <TableCell>
                  <Tag tone={s.reason === 'complaint' || s.reason === 'hard_bounce' ? 'bad' : 'neutral'}>
                    {s.reason}
                  </Tag>
                </TableCell>
                <TableCell mono>{s.source}</TableCell>
                <TableCell align="right" mono>
                  {new Date(s.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  )
}
