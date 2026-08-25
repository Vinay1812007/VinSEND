import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'
import { loadDashboardContext } from '@/server/services/current-context'
import { listListsWithCounts } from '@/server/services/contact-lists'
import { CreateListForm } from './create-list-form'
import { DeleteListButton } from './delete-list-button'

export const dynamic = 'force-dynamic'

export default async function ListsPage({
  params,
}: {
  params: Promise<{ org: string; project: string }>
}) {
  const { org, project } = await params
  const ctx = await loadDashboardContext(org, project)
  const rows = await listListsWithCounts(ctx.project.id)

  return (
    <>
      <PageHeader
        eyebrow="Contacts · Lists"
        title="Contact lists"
        description="Explicitly-managed collections. Use segments for property-based filters."
      />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader title={`${rows.length} list${rows.length === 1 ? '' : 's'}`} eyebrow="Current" />
            {rows.length === 0 ? (
              <CardBody>
                <EmptyState title="No lists yet" description="Create one on the right." />
              </CardBody>
            ) : (
              <DataTable
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'members', label: 'Members', align: 'right' },
                  { key: 'actions', label: '', align: 'right' },
                ]}
              >
                {rows.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.name}</TableCell>
                    <TableCell mono align="right">{l.member_count}</TableCell>
                    <TableCell align="right">
                      <DeleteListButton
                        orgSlug={ctx.org.slug}
                        projectPublicId={ctx.project.public_id}
                        listId={l.id}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </DataTable>
            )}
          </Card>
        </div>
        <Card>
          <CardHeader title="Create list" eyebrow="New" />
          <CardBody>
            <CreateListForm orgSlug={ctx.org.slug} projectPublicId={ctx.project.public_id} />
          </CardBody>
        </Card>
      </div>
    </>
  )
}
