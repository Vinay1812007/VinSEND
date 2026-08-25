import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'
import { Tag } from '@/components/ui/tag'
import { loadDashboardContext } from '@/server/services/current-context'
import { listProviders } from '@/server/services/providers'
import { PROVIDER_LABEL } from '@/lib/email/registry'
import { SmtpForm } from './smtp-form'
import { SesForm } from './ses-form'

export const dynamic = 'force-dynamic'

export default async function ProvidersPage({
  params,
}: {
  params: Promise<{ org: string; project: string }>
}) {
  const { org, project } = await params
  const ctx = await loadDashboardContext(org, project)
  const providers = await listProviders(ctx.project.id)

  return (
    <>
      <PageHeader
        eyebrow="Providers"
        title="Delivery providers"
        description="VinSEND hands every message to a provider you configure. SMTP ships in the MVP."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Configured" eyebrow={`${providers.length} configured`} />
          {providers.length === 0 ? (
            <CardBody>
              <EmptyState
                title="No provider configured"
                description="Add one on the right. The first provider you save becomes the default."
              />
            </CardBody>
          ) : (
            <DataTable
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'type', label: 'Type' },
                { key: 'default', label: '' },
              ]}
            >
              {providers.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell mono>{PROVIDER_LABEL[p.type]}</TableCell>
                  <TableCell>{p.is_default ? <Tag tone="accent">default</Tag> : null}</TableCell>
                </TableRow>
              ))}
            </DataTable>
          )}
        </Card>

        <Card>
          <CardHeader title="Add SMTP" eyebrow="Generic" description="Credentials are encrypted at rest and never returned." />
          <CardBody>
            <SmtpForm orgSlug={ctx.org.slug} projectPublicId={ctx.project.public_id} />
          </CardBody>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader
            title="Add Amazon SES"
            eyebrow="AWS"
            description="Uses SESv2. Delivery events land in your project once you configure a Configuration Set with SNS pointing at /v1/providers/webhooks/ses."
          />
          <CardBody>
            <SesForm orgSlug={ctx.org.slug} projectPublicId={ctx.project.public_id} />
          </CardBody>
        </Card>
      </div>
    </>
  )
}
