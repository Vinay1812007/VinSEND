import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'
import { loadDashboardContext } from '@/server/services/current-context'
import { listAuditEventsByOrg } from '@/server/services/audit'

export const dynamic = 'force-dynamic'

export default async function AuditPage({
  params,
}: {
  params: Promise<{ org: string; project: string }>
}) {
  const { org, project } = await params
  const ctx = await loadDashboardContext(org, project)
  if (ctx.role === 'member') redirect(`/app/${org}/${project}/overview`)
  const rows = await listAuditEventsByOrg(ctx.org.id, { limit: 200 })

  return (
    <>
      <PageHeader
        eyebrow="Audit log"
        title="Sensitive actions"
        description="Every API key, provider, domain, webhook, and settings change recorded to date."
      />
      <Card>
        <CardHeader title={`${rows.length} event${rows.length === 1 ? '' : 's'}`} eyebrow="Newest first" />
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Nothing to audit yet"
              description="Actions like creating an API key or verifying a domain will appear here."
            />
          </div>
        ) : (
          <DataTable
            columns={[
              { key: 'when', label: 'When' },
              { key: 'action', label: 'Action' },
              { key: 'resource', label: 'Resource' },
              { key: 'actor', label: 'Actor' },
            ]}
          >
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell mono>{new Date(r.created_at).toLocaleString()}</TableCell>
                <TableCell mono>{r.action}</TableCell>
                <TableCell mono>
                  {r.resource_type ?? '—'}{' '}
                  <span className="text-[color:var(--muted)]">
                    {r.resource_id ? `· ${r.resource_id.slice(0, 24)}…` : ''}
                  </span>
                </TableCell>
                <TableCell mono>{r.actor_user_id ? r.actor_user_id.slice(0, 12) + '…' : '—'}</TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  )
}
