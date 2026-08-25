import Link from 'next/link'
import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader } from '@/components/ui/card'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'
import { Tag } from '@/components/ui/tag'
import { listUsers } from '@/server/services/admin'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const rows = await listUsers(100)
  return (
    <>
      <PageHeader eyebrow="Admin" title="Users" description={`${rows.length} listed.`} />
      <Card>
        <CardHeader title="All users" eyebrow="Newest first" />
        <DataTable
          columns={[
            { key: 'who', label: 'User' },
            { key: 'staff', label: 'Staff' },
            { key: 'joined', label: 'Joined', align: 'right' },
          ]}
        >
          {rows.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <Link href={`/admin/users/${u.id}`} className="hover:underline text-[color:var(--accent)]">
                  {u.display_name ?? u.email ?? u.id.slice(0, 8)}
                </Link>
                <div className="font-mono text-xs text-[color:var(--muted)]">{u.email ?? '—'}</div>
              </TableCell>
              <TableCell>{u.is_staff && <Tag tone="accent">staff</Tag>}</TableCell>
              <TableCell mono align="right">{new Date(u.created_at).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </DataTable>
      </Card>
    </>
  )
}
