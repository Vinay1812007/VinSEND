import { PageHeader } from '@/components/layout/dashboard-shell'
import { overview } from '@/server/services/admin'

export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  const stats = await overview()
  const cells: [string, string, string?][] = [
    ['Organizations', String(stats.orgCount)],
    ['Projects', String(stats.projectCount)],
    ['Emails (all time)', String(stats.emailCount)],
    ['Emails (24h)', String(stats.emailsLast24h)],
    ['Failed (24h)', String(stats.failedLast24h), 'bad'],
    ['Active webhooks', String(stats.activeWebhooks)],
    ['Webhook fails (24h)', String(stats.webhookFailuresLast24h), 'bad'],
    ['Active API keys', String(stats.activeApiKeys)],
  ]
  return (
    <>
      <PageHeader eyebrow="Overview" title="Platform health" description="Rolling 24-hour and lifetime totals." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-[color:var(--rule)] rounded bg-[color:var(--sunk)] overflow-hidden">
        {cells.map(([label, value, tone], i) => (
          <div
            key={label}
            className={`p-5 border-r border-b border-[color:var(--rule)] ${
              (i + 1) % 4 === 0 ? 'border-r-0' : ''
            } ${i >= cells.length - 4 ? 'border-b-0' : ''}`}
          >
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
              {label}
            </div>
            <div
              className={`font-display text-2xl font-medium ${
                tone === 'bad' && value !== '0' ? 'text-[color:var(--bad)]' : 'text-[color:var(--ink)]'
              }`}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
