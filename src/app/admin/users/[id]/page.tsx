import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'
import { Tag } from '@/components/ui/tag'
import { findUserById } from '@/server/services/admin'

export const dynamic = 'force-dynamic'

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await findUserById(id)
  if (!user) notFound()
  return (
    <>
      <PageHeader
        eyebrow={`Admin · User`}
        title={user.display_name ?? user.email ?? user.id.slice(0, 8)}
        description={user.email ?? ''}
        action={user.is_staff ? <Tag tone="accent">staff</Tag> : null}
      />
      <Card>
        <CardHeader title="Profile" eyebrow="Identity" />
        <CardBody>
          <dl className="grid grid-cols-[130px_1fr] gap-y-2 text-sm">
            <dt className="font-mono text-[11px] text-[color:var(--muted)]">User ID</dt>
            <dd className="font-mono text-[12.5px]">{user.id}</dd>
            <dt className="font-mono text-[11px] text-[color:var(--muted)]">Joined</dt>
            <dd className="font-mono">{new Date(user.created_at).toLocaleString()}</dd>
          </dl>
        </CardBody>
      </Card>
      <div className="mt-6">
        <Card>
          <CardHeader
            title="Memberships"
            eyebrow={`${user.memberships.length} organization${user.memberships.length === 1 ? '' : 's'}`}
          />
          {user.memberships.length === 0 ? (
            <CardBody>
              <p className="text-sm text-[color:var(--muted)]">Not a member of any organization.</p>
            </CardBody>
          ) : (
            <DataTable
              columns={[
                { key: 'org', label: 'Organization' },
                { key: 'role', label: 'Role' },
              ]}
            >
              {user.memberships.map((m) => (
                <TableRow key={m.org_id}>
                  <TableCell>
                    <Link
                      href={`/admin/organizations/${m.org_id}`}
                      className="hover:underline text-[color:var(--accent)]"
                    >
                      {m.org_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Tag tone={m.role === 'owner' ? 'accent' : 'neutral'}>{m.role}</Tag>
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
