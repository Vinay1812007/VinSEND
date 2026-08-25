import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'
import { Tag, statusToTone } from '@/components/ui/tag'
import { loadDashboardContext } from '@/server/services/current-context'
import { listWebhooks } from '@/server/services/webhooks'
import { CreateWebhookDialog } from './create-webhook-dialog'
import { DeleteWebhookButton } from './delete-webhook-button'
import { RotateSecretButton } from './rotate-button'

export const dynamic = 'force-dynamic'

export default async function WebhooksPage({
  params,
}: {
  params: Promise<{ org: string; project: string }>
}) {
  const { org, project } = await params
  const ctx = await loadDashboardContext(org, project)
  const rows = await listWebhooks(ctx.project.id)

  return (
    <>
      <PageHeader
        eyebrow="Webhooks"
        title="Endpoints"
        description="Signed events sent to your services. HMAC-SHA256 with a 5-minute timestamp tolerance."
        action={<CreateWebhookDialog orgSlug={ctx.org.slug} projectPublicId={ctx.project.public_id} />}
      />
      <Card>
        <CardHeader title={`${rows.length} endpoint${rows.length === 1 ? '' : 's'}`} eyebrow="Current" />
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No webhooks yet"
              description="Register an endpoint to start receiving signed events. Each webhook gets a whsec_ signing secret you copy once."
            />
          </div>
        ) : (
          <DataTable
            columns={[
              { key: 'url', label: 'URL' },
              { key: 'events', label: 'Events' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: '', align: 'right' },
            ]}
          >
            {rows.map((w) => (
              <TableRow key={w.id}>
                <TableCell mono>{w.url}</TableCell>
                <TableCell mono>{w.events.join(', ')}</TableCell>
                <TableCell>
                  <Tag tone={statusToTone(w.status)}>{w.status}</Tag>
                </TableCell>
                <TableCell align="right">
                  <div className="inline-flex items-center gap-1">
                    <RotateSecretButton
                      orgSlug={ctx.org.slug}
                      projectPublicId={ctx.project.public_id}
                      publicId={w.public_id}
                    />
                    <DeleteWebhookButton
                      orgSlug={ctx.org.slug}
                      projectPublicId={ctx.project.public_id}
                      publicId={w.public_id}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  )
}
