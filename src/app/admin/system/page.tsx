import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Tag } from '@/components/ui/tag'
import { systemHealth } from '@/server/services/admin'

export const dynamic = 'force-dynamic'

export default async function AdminSystemPage() {
  const h = await systemHealth()
  const oldestAgeMin = h.oldestPendingWebhookAt
    ? Math.round((Date.now() - new Date(h.oldestPendingWebhookAt).getTime()) / 60_000)
    : null

  return (
    <>
      <PageHeader eyebrow="System" title="Health &amp; queues" description="Live view of dependency health and worker backlog." />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Postgres" eyebrow="Primary datastore" />
          <CardBody>
            <div className="mb-2 flex items-center gap-3">
              <Tag tone={h.postgres.ok ? 'good' : 'bad'}>{h.postgres.ok ? 'ok' : 'down'}</Tag>
              <span className="font-mono text-[12.5px] text-[color:var(--muted)]">
                {h.postgres.latency_ms} ms
              </span>
            </div>
            {!h.postgres.ok && (
              <Alert tone="bad" title="Error">
                {h.postgres.error ?? 'Unknown'}
              </Alert>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Webhook queue" eyebrow="Pending deliveries" />
          <CardBody>
            <dl className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
              <dt className="font-mono text-[11px] text-[color:var(--muted)]">Pending</dt>
              <dd className="font-mono">{h.pendingWebhookDeliveries}</dd>
              <dt className="font-mono text-[11px] text-[color:var(--muted)]">Oldest</dt>
              <dd className="font-mono">
                {oldestAgeMin == null ? '—' : `${oldestAgeMin} min ago`}
              </dd>
            </dl>
            {oldestAgeMin != null && oldestAgeMin > 60 && (
              <div className="mt-3">
                <Alert tone="warn" title="Queue backlog">
                  The oldest pending delivery is older than an hour. Is the sweep cron running?
                </Alert>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Suppressions" eyebrow="Last 24h" />
          <CardBody>
            <div className="font-display text-2xl font-medium">{h.suppressionsLast24h}</div>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              A sustained rise here usually indicates a deliverability issue with one or more
              sending domains.
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  )
}
