import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardBody } from '@/components/ui/card'
import { loadDashboardContext } from '@/server/services/current-context'
import { TemplateForm } from '../template-form'

export const dynamic = 'force-dynamic'

export default async function NewTemplatePage({
  params,
}: {
  params: Promise<{ org: string; project: string }>
}) {
  const { org, project } = await params
  const ctx = await loadDashboardContext(org, project)
  return (
    <>
      <PageHeader eyebrow="Templates · New" title="Create template" />
      <Card>
        <CardBody>
          <TemplateForm
            mode="create"
            orgSlug={ctx.org.slug}
            projectPublicId={ctx.project.public_id}
          />
        </CardBody>
      </Card>
    </>
  )
}
