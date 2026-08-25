import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'
import { loadDashboardContext } from '@/server/services/current-context'
import { listSegments } from '@/server/services/contact-lists'
import { CreateSegmentForm } from './create-segment-form'
import { DeleteSegmentButton } from './delete-segment-button'

export const dynamic = 'force-dynamic'

export default async function SegmentsPage({
  params,
}: {
  params: Promise<{ org: string; project: string }>
}) {
  const { org, project } = await params
  const ctx = await loadDashboardContext(org, project)
  const rows = await listSegments(ctx.project.id)

  return (
    <>
      <PageHeader
        eyebrow="Contacts · Segments"
        title="Segments"
        description="Query-defined filters over contact properties. Evaluated when you send to them."
      />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader title={`${rows.length} segment${rows.length === 1 ? '' : 's'}`} eyebrow="Current" />
            {rows.length === 0 ? (
              <CardBody>
                <EmptyState title="No segments yet" description="Define one by property equality." />
              </CardBody>
            ) : (
              <DataTable
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'filter', label: 'Filter' },
                  { key: 'actions', label: '', align: 'right' },
                ]}
              >
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell mono>
                      <code className="font-mono text-[12px]">{JSON.stringify(s.filter)}</code>
                    </TableCell>
                    <TableCell align="right">
                      <DeleteSegmentButton
                        orgSlug={ctx.org.slug}
                        projectPublicId={ctx.project.public_id}
                        segmentId={s.id}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </DataTable>
            )}
          </Card>
        </div>
        <Card>
          <CardHeader title="New segment" eyebrow="Create" />
          <CardBody>
            <CreateSegmentForm orgSlug={ctx.org.slug} projectPublicId={ctx.project.public_id} />
          </CardBody>
        </Card>
      </div>
    </>
  )
}
