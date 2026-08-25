import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'
import { Tag } from '@/components/ui/tag'
import { orgDetail } from '@/server/services/admin'

export const dynamic = 'force-dynamic'

export default async function AdminOrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await orgDetail(id)
  if (!detail) notFound()

  return (
    <>
      <PageHeader
        eyebrow={`Admin · ${detail.org.slug}`}
        title={detail.org.name}
        description={`Created ${new Date(detail.org.created_at).toLocaleString()}.`}
      />

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader title="Projects" eyebrow={`${detail.projects.length} project${detail.projects.length === 1 ? '' : 's'}`} />
          <CardBody className="p-0">
            <DataTable
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'id', label: 'Public ID' },
              ]}
            >
              {detail.projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell mono>{p.public_id}</TableCell>
                </TableRow>
              ))}
            </DataTable>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Members" eyebrow={`${detail.members.length} member${detail.members.length === 1 ? '' : 's'}`} />
          <CardBody className="p-0">
            <DataTable
              columns={[
                { key: 'uid', label: 'User' },
                { key: 'role', label: 'Role' },
              ]}
            >
              {detail.members.map((m) => (
                <TableRow key={m.user_id}>
                  <TableCell mono>{m.user_id.slice(0, 20)}…</TableCell>
                  <TableCell>
                    <Tag tone={m.role === 'owner' ? 'accent' : 'neutral'}>{m.role}</Tag>
                  </TableCell>
                </TableRow>
              ))}
            </DataTable>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent failed emails" eyebrow="Last 10" />
        {detail.recentFailedEmails.length === 0 ? (
          <CardBody>
            <p className="text-sm text-[color:var(--muted)]">No failures recorded.</p>
          </CardBody>
        ) : (
          <DataTable
            columns={[
              { key: 'id', label: 'Email' },
              { key: 'from', label: 'From' },
              { key: 'subject', label: 'Subject' },
              { key: 'code', label: 'Error' },
              { key: 'when', label: 'When', align: 'right' },
            ]}
          >
            {detail.recentFailedEmails.map((e) => (
              <TableRow key={e.id}>
                <TableCell mono>{e.public_id}</TableCell>
                <TableCell mono>{e.from_address}</TableCell>
                <TableCell>{e.subject}</TableCell>
                <TableCell mono>
                  <Tag tone="bad">{e.error_code ?? 'unknown'}</Tag>
                </TableCell>
                <TableCell align="right" mono>
                  {new Date(e.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  )
}
