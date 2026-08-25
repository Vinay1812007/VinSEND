import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader } from '@/components/ui/card'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'
import { Tag, statusToTone } from '@/components/ui/tag'
import { loadDashboardContext } from '@/server/services/current-context'
import { findDomainWithRecords } from '@/server/services/domains'
import { VerifyButton } from './verify-button'

export const dynamic = 'force-dynamic'

export default async function DomainDetailPage({
  params,
}: {
  params: Promise<{ org: string; project: string; id: string }>
}) {
  const { org, project, id } = await params
  const ctx = await loadDashboardContext(org, project)
  const found = await findDomainWithRecords(ctx.project.id, id)
  if (!found) notFound()

  return (
    <>
      <PageHeader
        eyebrow="Domain"
        title={found.domain.domain}
        description="Add these records at your DNS host, then click Verify."
        action={
          <div className="flex items-center gap-3">
            <Tag tone={statusToTone(found.domain.status)}>{found.domain.status}</Tag>
            <VerifyButton
              orgSlug={ctx.org.slug}
              projectPublicId={ctx.project.public_id}
              publicId={found.domain.public_id}
            />
          </div>
        }
      />

      <Card>
        <CardHeader title="DNS records" eyebrow="Required" />
        <DataTable
          columns={[
            { key: 'type', label: 'Type' },
            { key: 'host', label: 'Host' },
            { key: 'value', label: 'Value' },
            { key: 'status', label: 'Status', align: 'right' },
          ]}
        >
          {found.records.map((r) => (
            <TableRow key={r.id}>
              <TableCell mono>{r.type.toUpperCase()}</TableCell>
              <TableCell mono>{r.host}</TableCell>
              <TableCell>
                <code className="font-mono text-[12px] block break-all">{r.expected_value}</code>
                {r.notes && <p className="mt-1 text-xs text-[color:var(--muted)]">{r.notes}</p>}
                {r.last_seen_value && (
                  <p className="mt-1 text-xs text-[color:var(--muted)]">Seen: <code className="font-mono">{r.last_seen_value}</code></p>
                )}
              </TableCell>
              <TableCell align="right">
                <Tag tone={statusToTone(r.status)}>{r.status}</Tag>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      </Card>
    </>
  )
}
