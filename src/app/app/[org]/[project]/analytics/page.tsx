import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { loadDashboardContext } from '@/server/services/current-context'
import { projectSummary } from '@/server/services/analytics'
import { Sparkline } from '@/features/analytics/sparkline'

export const dynamic = 'force-dynamic'

function pct(n: number | null): string {
  if (n == null) return '—'
  return `${(n * 100).toFixed(1)}%`
}

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ org: string; project: string }>
}) {
  const { org, project } = await params
  const ctx = await loadDashboardContext(org, project)
  const summary = await projectSummary(ctx.project.id, 30)

  const totalActivity =
    summary.totals.queued +
    summary.totals.sent +
    summary.totals.delivered +
    summary.totals.bounced +
    summary.totals.complained +
    summary.totals.failed

  const sentSeries = summary.buckets.map((b) => b.sent)
  const bounceSeries = summary.buckets.map((b) => b.bounced)

  const stats = [
    { label: 'Sent (30d)', value: String(summary.totals.sent) },
    { label: 'Delivered (30d)', value: String(summary.totals.delivered) },
    { label: 'Bounced (30d)', value: String(summary.totals.bounced) },
    { label: 'Delivery rate', value: pct(summary.rates.delivery) },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="Volume &amp; rates"
        description="Aggregated from the persisted event stream. Delivery-based rates require a provider that emits delivery events."
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-[color:var(--rule)] rounded bg-[color:var(--sunk)] mb-8 overflow-hidden">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`p-5 ${i < stats.length - 1 ? 'border-r border-[color:var(--rule)]' : ''}`}
          >
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
              {s.label}
            </div>
            <div className="font-display text-2xl font-medium text-[color:var(--ink)]">{s.value}</div>
          </div>
        ))}
      </div>

      {totalActivity === 0 ? (
        <Card>
          <div className="p-6">
            <EmptyState
              title="No activity in the last 30 days"
              description="Once messages start flowing, this page fills in with sparklines and rate cards derived from the persisted event stream."
            />
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader title="Sent per day" eyebrow="Last 30 days" />
            <CardBody>
              <Sparkline values={sentSeries} width={480} height={80} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Bounces per day" eyebrow="Last 30 days" />
            <CardBody>
              <Sparkline values={bounceSeries} width={480} height={80} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Rates" eyebrow="Denominator = sent" />
            <CardBody>
              <dl className="grid grid-cols-[130px_1fr] gap-y-2 text-sm">
                <dt className="font-mono text-[11px] text-[color:var(--muted)]">Delivery</dt>
                <dd className="font-mono">{pct(summary.rates.delivery)}</dd>
                <dt className="font-mono text-[11px] text-[color:var(--muted)]">Bounce</dt>
                <dd className="font-mono">{pct(summary.rates.bounce)}</dd>
                <dt className="font-mono text-[11px] text-[color:var(--muted)]">Complaint</dt>
                <dd className="font-mono">{pct(summary.rates.complaint)}</dd>
                <dt className="font-mono text-[11px] text-[color:var(--muted)]">Failure</dt>
                <dd className="font-mono">{pct(summary.rates.failure)}</dd>
              </dl>
            </CardBody>
          </Card>
        </div>
      )}
    </>
  )
}
