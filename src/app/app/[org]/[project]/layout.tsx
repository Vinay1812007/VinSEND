import { headers } from 'next/headers'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { loadDashboardContext } from '@/server/services/current-context'

export const dynamic = 'force-dynamic'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ org: string; project: string }>
}) {
  const { org, project } = await params
  const ctx = await loadDashboardContext(org, project)
  const h = await headers()
  const currentPath = h.get('x-pathname') || h.get('x-invoke-path') || ''

  return (
    <DashboardShell
      context={{
        orgSlug: ctx.org.slug,
        projectPublicId: ctx.project.public_id,
        orgName: ctx.org.name,
        projectName: ctx.project.name,
      }}
      currentPath={currentPath}
      userEmail={ctx.user.email}
    >
      {children}
    </DashboardShell>
  )
}
