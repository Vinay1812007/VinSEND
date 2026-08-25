import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Tag, statusToTone } from '@/components/ui/tag'
import { loadDashboardContext } from '@/server/services/current-context'
import { getEmail } from '@/server/services/emails-query'

export const dynamic = 'force-dynamic'

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ org: string; project: string; id: string }>
}) {
  const { org, project, id } = await params
  const ctx = await loadDashboardContext(org, project)
  const raw = await getEmail(ctx.project.id, id)
  if (!raw) notFound()

  const row = raw as Record<string, unknown>
  const events = ((row.email_events as { type: string; occurred_at: string; payload: unknown }[]) ?? []).slice().sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
  const recipients = ((row.email_recipients as { kind: string; address: string; status: string }[]) ?? [])

  return (
    <>
      <PageHeader
        eyebrow="Email detail"
        title={String(row.subject ?? '')}
        description={String(row.public_id ?? '')}
        action={<Tag tone={statusToTone(String(row.status ?? ''))}>{String(row.status ?? '')}</Tag>}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader eyebrow="Message" title="Delivery" />
          <CardBody>
            <dl className="grid grid-cols-[130px_1fr] gap-y-2 text-sm">
              <dt className="font-mono text-[11px] text-[color:var(--muted)] pt-1">ID</dt>
              <dd className="font-mono text-[12.5px]">{String(row.public_id ?? '')}</dd>
              <dt className="font-mono text-[11px] text-[color:var(--muted)] pt-1">From</dt>
              <dd className="font-mono text-[12.5px]">{String(row.from_address ?? '')}</dd>
              <dt className="font-mono text-[11px] text-[color:var(--muted)] pt-1">Provider ID</dt>
              <dd className="font-mono text-[12.5px] break-all">{String(row.provider_message_id ?? '—')}</dd>
              <dt className="font-mono text-[11px] text-[color:var(--muted)] pt-1">Created</dt>
              <dd className="font-mono text-[12.5px]">{new Date(String(row.created_at)).toLocaleString()}</dd>
              {row.error_code ? (
                <>
                  <dt className="font-mono text-[11px] text-[color:var(--muted)] pt-1">Error</dt>
                  <dd className="font-mono text-[12.5px] text-[color:var(--bad)]">
                    {String(row.error_code)}: {String(row.error_message ?? '')}
                  </dd>
                </>
              ) : null}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader eyebrow="Recipients" title={`${recipients.length} address${recipients.length === 1 ? '' : 'es'}`} />
          <CardBody>
            <ul className="flex flex-col gap-2 text-sm">
              {recipients.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[12.5px]">{r.address}</span>
                  <div className="flex items-center gap-2">
                    <Tag tone="neutral">{r.kind}</Tag>
                    <Tag tone={statusToTone(r.status)}>{r.status}</Tag>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader eyebrow="Timeline" title={`${events.length} event${events.length === 1 ? '' : 's'}`} />
          <CardBody>
            <ol className="flex flex-col gap-3">
              {events.map((e, i) => (
                <li key={i} className="flex items-start gap-4 border-l-2 border-[color:var(--rule)] pl-4">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[color:var(--muted)]">
                      {new Date(e.occurred_at).toLocaleString()}
                    </div>
                    <div className="font-display text-base font-medium text-[color:var(--ink)]">{e.type}</div>
                  </div>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>
    </>
  )
}
