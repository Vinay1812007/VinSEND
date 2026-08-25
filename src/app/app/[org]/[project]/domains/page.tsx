import Link from 'next/link'
import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'
import { Tag, statusToTone } from '@/components/ui/tag'
import { loadDashboardContext } from '@/server/services/current-context'
import { listDomainsByProject } from '@/server/services/domains'
import { AddDomainForm } from './add-domain-form'

export const dynamic = 'force-dynamic'

export default async function DomainsPage({
  params,
}: {
  params: Promise<{ org: string; project: string }>
}) {
  const { org, project } = await params
  const ctx = await loadDashboardContext(org, project)
  const domains = await listDomainsByProject(ctx.project.id)
  const base = `/app/${ctx.org.slug}/${ctx.project.public_id}`

  return (
    <>
      <PageHeader
        eyebrow="Domains"
        title="Sending domains"
        description="Verify a domain to send email from any address at it."
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader title="Domains" eyebrow={`${domains.length} added`} />
            {domains.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No domains yet"
                  description="Add a domain, then add the SPF / DKIM / DMARC records at your DNS host."
                />
              </div>
            ) : (
              <DataTable
                columns={[
                  { key: 'domain', label: 'Domain' },
                  { key: 'status', label: 'Status' },
                  { key: 'verified', label: 'Verified', align: 'right' },
                ]}
              >
                {domains.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell mono>
                      <Link href={`${base}/domains/${d.public_id}`} className="hover:underline text-[color:var(--accent)]">
                        {d.domain}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Tag tone={statusToTone(d.status)}>{d.status}</Tag>
                    </TableCell>
                    <TableCell align="right" mono>
                      {d.verified_at ? new Date(d.verified_at).toLocaleDateString() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </DataTable>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader title="Add domain" eyebrow="New" />
          <div className="p-6">
            <AddDomainForm orgSlug={ctx.org.slug} projectPublicId={ctx.project.public_id} />
          </div>
        </Card>
      </div>
    </>
  )
}
