import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { loadDashboardContext } from '@/server/services/current-context'
import { GdprPanel } from './gdpr-panel'

export const dynamic = 'force-dynamic'

export default async function GdprSettingsPage({
  params,
}: {
  params: Promise<{ org: string; project: string }>
}) {
  const { org, project } = await params
  const ctx = await loadDashboardContext(org, project)
  if (ctx.role !== 'owner') redirect(`/app/${org}/${project}/settings`)
  return (
    <>
      <PageHeader
        eyebrow="Settings · Compliance"
        title="Data export &amp; deletion"
        description="Owner-only controls that satisfy GDPR §17 and §20."
      />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Export" eyebrow="Article 20" description="Download a JSON bundle of everything under this workspace." />
          <CardBody>
            <GdprPanel
              mode="export"
              orgSlug={ctx.org.slug}
              projectPublicId={ctx.project.public_id}
              orgName={ctx.org.name}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Delete workspace" eyebrow="Article 17" description="Permanently removes the org and every project, key, message, and audit record under it." />
          <CardBody>
            <GdprPanel
              mode="delete"
              orgSlug={ctx.org.slug}
              projectPublicId={ctx.project.public_id}
              orgName={ctx.org.name}
            />
          </CardBody>
        </Card>
      </div>
    </>
  )
}
