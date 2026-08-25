import Link from 'next/link'
import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { loadDashboardContext } from '@/server/services/current-context'
import { listEmails } from '@/server/services/emails-query'
import { listDomainsByProject } from '@/server/services/domains'
import { listProviders } from '@/server/services/providers'
import { listApiKeys } from '@/server/services/api-keys'
import { Tag, statusToTone } from '@/components/ui/tag'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'

export const dynamic = 'force-dynamic'

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ org: string; project: string }>
}) {
  const { org, project } = await params
  const ctx = await loadDashboardContext(org, project)
  const [{ rows: emails }, domains, providers, keys] = await Promise.all([
    listEmails(ctx.project.id, { limit: 5 }),
    listDomainsByProject(ctx.project.id),
    listProviders(ctx.project.id),
    listApiKeys(ctx.project.id),
  ])

  const base = `/app/${ctx.org.slug}/${ctx.project.public_id}`

  const stats = [
    { label: 'Emails sent (30d)', value: emails.length ? String(emails.length) : '—' },
    { label: 'Verified domains', value: String(domains.filter((d) => d.status === 'verified').length) },
    { label: 'Configured providers', value: String(providers.length) },
    { label: 'Active API keys', value: String(keys.filter((k) => !k.revoked_at).length) },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={ctx.project.name}
        description={`Workspace ${ctx.org.name}.`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-[color:var(--rule)] rounded bg-[color:var(--sunk)] mb-10 overflow-hidden">
        {stats.map((s, i) => (
          <div key={s.label} className={`p-5 ${i < stats.length - 1 ? 'border-r border-[color:var(--rule)]' : ''}`}>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
              {s.label}
            </div>
            <div className="font-display text-2xl font-medium text-[color:var(--ink)]">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader
            title="Recent emails"
            eyebrow="Activity"
            action={
              <Link href={`${base}/emails`}>
                <Button variant="secondary" size="sm">
                  View all
                </Button>
              </Link>
            }
          />
          {emails.length === 0 ? (
            <CardBody>
              <EmptyState
                title="No emails sent yet"
                description="Configure a provider, verify a domain, create an API key, then call POST /v1/emails."
                action={
                  <Link href={`${base}/providers`}>
                    <Button size="sm">Configure a provider</Button>
                  </Link>
                }
              />
            </CardBody>
          ) : (
            <DataTable
              columns={[
                { key: 'id', label: 'ID' },
                { key: 'from', label: 'From' },
                { key: 'subject', label: 'Subject' },
                { key: 'status', label: 'Status' },
                { key: 'when', label: 'When', align: 'right' },
              ]}
            >
              {emails.map((e) => (
                <TableRow key={e.id}>
                  <TableCell mono>
                    <Link href={`${base}/emails/${e.public_id}`} className="hover:underline">
                      {e.public_id.slice(0, 20)}…
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
      </div>
    </>
  )
}
