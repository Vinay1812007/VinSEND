import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'
import { loadDashboardContext } from '@/server/services/current-context'
import { listContactsByProject, countContacts } from '@/server/services/contacts'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AddContactForm } from './add-contact-form'
import { DeleteContactButton } from './delete-contact-button'
import { ImportForm } from './import-form'

export const dynamic = 'force-dynamic'

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ org: string; project: string }>
}) {
  const { org, project } = await params
  const ctx = await loadDashboardContext(org, project)
  const [rows, total] = await Promise.all([
    listContactsByProject(ctx.project.id),
    countContacts(ctx.project.id),
  ])

  return (
    <>
      <PageHeader
        eyebrow="Contacts"
        title="Address book"
        description={`${total} contact${total === 1 ? '' : 's'}.`}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/app/${ctx.org.slug}/${ctx.project.public_id}/contacts/lists`}>
              <Button variant="secondary" size="sm">Lists</Button>
            </Link>
            <Link href={`/app/${ctx.org.slug}/${ctx.project.public_id}/contacts/segments`}>
              <Button variant="secondary" size="sm">Segments</Button>
            </Link>
            <a href={`/app/${ctx.org.slug}/${ctx.project.public_id}/contacts/export`} download>
              <Button variant="secondary" size="sm">Export CSV</Button>
            </a>
          </div>
        }
      />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader title="All contacts" eyebrow={`${rows.length} shown`} />
            {rows.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No contacts yet"
                  description="Add one on the right, or bulk-import via the API in a later release."
                />
              </div>
            ) : (
              <DataTable
                columns={[
                  { key: 'email', label: 'Email' },
                  { key: 'name', label: 'Name' },
                  { key: 'status', label: 'Status' },
                  { key: 'actions', label: '', align: 'right' },
                ]}
              >
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell mono>{c.email}</TableCell>
                    <TableCell>
                      {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                    </TableCell>
                    <TableCell mono>{c.status}</TableCell>
                    <TableCell align="right">
                      <DeleteContactButton
                        orgSlug={ctx.org.slug}
                        projectPublicId={ctx.project.public_id}
                        publicId={c.public_id}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </DataTable>
            )}
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Add contact" eyebrow="New" />
            <CardBody>
              <AddContactForm orgSlug={ctx.org.slug} projectPublicId={ctx.project.public_id} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Import CSV" eyebrow="Bulk" />
            <CardBody>
              <ImportForm orgSlug={ctx.org.slug} projectPublicId={ctx.project.public_id} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  )
}
