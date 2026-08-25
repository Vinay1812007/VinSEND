import Link from 'next/link'
import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader } from '@/components/ui/card'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'
import { listOrgs } from '@/server/services/admin'

export const dynamic = 'force-dynamic'

export default async function AdminOrgsPage() {
  const rows = await listOrgs(100)
  return (
    <>
      <PageHeader eyebrow="Admin" title="Organizations" description={`${rows.length} listed.`} />
      <Card>
        <CardHeader title="All organizations" eyebrow="Newest first" />
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'slug', label: 'Slug' },
            { key: 'projects', label: 'Projects', align: 'right' },
            { key: 'members', label: 'Members', align: 'right' },
            { key: 'emails', label: 'Emails (30d)', align: 'right' },
            { key: 'created', label: 'Created', align: 'right' },
          ]}
        >
          {rows.map((o) => (
            <TableRow key={o.id}>
              <TableCell>
                <Link
                  href={`/admin/organizations/${o.id}`}
                  className="hover:underline text-[color:var(--accent)]"
                >
                  {o.name}
                </Link>
              </TableCell>
              <TableCell mono>{o.slug}</TableCell>
              <TableCell mono align="right">
                {o.project_count}
              </TableCell>
              <TableCell mono align="right">
                {o.member_count}
              </TableCell>
              <TableCell mono align="right">
                {o.email_count_30d}
              </TableCell>
              <TableCell mono align="right">
                {new Date(o.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      </Card>
    </>
  )
}
