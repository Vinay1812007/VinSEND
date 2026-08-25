import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardBody } from '@/components/ui/card'
import { loadDashboardContext } from '@/server/services/current-context'
import { findTemplateByPublicId, listTemplateVersions } from '@/server/services/templates'
import { TemplateForm } from '../template-form'
import { ArchiveButton } from './archive-button'
import { DuplicateButton } from './duplicate-button'
import { VersionList } from './version-list'

export const dynamic = 'force-dynamic'

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ org: string; project: string; id: string }>
}) {
  const { org, project, id } = await params
  const ctx = await loadDashboardContext(org, project)
  const tmpl = await findTemplateByPublicId(ctx.project.id, id)
  if (!tmpl) notFound()
  const versions = await listTemplateVersions({ projectId: ctx.project.id, publicId: id })

  return (
    <>
      <PageHeader
        eyebrow={`Template · v${tmpl.version}`}
        title={tmpl.name}
        description={tmpl.public_id}
        action={
          <div className="flex items-center gap-2">
            <DuplicateButton
              orgSlug={ctx.org.slug}
              projectPublicId={ctx.project.public_id}
              publicId={tmpl.public_id}
            />
            <ArchiveButton
              orgSlug={ctx.org.slug}
              projectPublicId={ctx.project.public_id}
              publicId={tmpl.public_id}
            />
          </div>
        }
      />
      <Card>
        <CardBody>
          <TemplateForm
            mode="edit"
            orgSlug={ctx.org.slug}
            projectPublicId={ctx.project.public_id}
            publicId={tmpl.public_id}
            initial={{
              name: tmpl.name,
              subject: tmpl.subject,
              html: tmpl.html,
              text: tmpl.text,
            }}
          />
        </CardBody>
      </Card>

      {versions.length > 0 && (
        <div className="mt-6">
          <VersionList
            orgSlug={ctx.org.slug}
            projectPublicId={ctx.project.public_id}
            publicId={tmpl.public_id}
            versions={versions}
          />
        </div>
      )}
    </>
  )
}
