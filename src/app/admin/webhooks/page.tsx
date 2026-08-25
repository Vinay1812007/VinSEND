import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'
import { listFailingWebhookDeliveries } from '@/server/services/admin'
import { RetryButton } from './retry-button'

export const dynamic = 'force-dynamic'

export default async function AdminWebhooksPage() {
  const rows = await listFailingWebhookDeliveries(100)
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Abandoned webhook deliveries"
        description="Deliveries that exhausted their retry budget. Force-retry after fixing the receiver."
      />
      <Card>
        <CardHeader title={`${rows.length} abandoned`} eyebrow="Newest first" />
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Nothing abandoned"
              description="All webhooks are either succeeding or still within their retry window."
            />
          </div>
        ) : (
          <DataTable
            columns={[
              { key: 'evt', label: 'Event' },
              { key: 'url', label: 'URL' },
              { key: 'attempts', label: 'Attempts', align: 'right' },
              { key: 'status', label: 'Last HTTP', align: 'right' },
              { key: 'when', label: 'Last try', align: 'right' },
              { key: 'actions', label: '', align: 'right' },
            ]}
          >
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell mono>
                  {r.event_type}
                  <div className="text-[color:var(--muted)] text-[11px]">{r.event_id}</div>
                </TableCell>
                <TableCell mono>{r.webhook_url}</TableCell>
                <TableCell mono align="right">{r.attempt}</TableCell>
                <TableCell mono align="right">{r.http_status ?? '—'}</TableCell>
                <TableCell mono align="right">{new Date(r.updated_at).toLocaleString()}</TableCell>
                <TableCell align="right"><RetryButton deliveryId={r.id} /></TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  )
}
