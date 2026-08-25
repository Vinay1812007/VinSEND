// Resolves the current user's active workspace + project. Used by dashboard
// layouts/pages.

import { redirect } from 'next/navigation'
import { requireCurrentUser } from '@/lib/auth/server'
import {
  findMembershipsForUser,
  findProjectByPublicId,
  isMember,
  type OrgRow,
  type ProjectRow,
} from '@/server/repositories/orgs'

export interface DashboardContext {
  user: { id: string; email: string }
  org: OrgRow
  project: ProjectRow
  role: 'owner' | 'admin' | 'member'
}

export async function loadDashboardContext(
  orgSlug: string,
  projectPublicId: string,
): Promise<DashboardContext> {
  const user = await requireCurrentUser()
  const memberships = await findMembershipsForUser(user.id)
  const membership = memberships.find((m) => m.org.slug === orgSlug)
  if (!membership) redirect('/onboarding')

  const project =
    membership.projects.find((p) => p.public_id === projectPublicId) ??
    (await findProjectByPublicId(projectPublicId))
  if (!project) redirect(`/app/${membership.org.slug}/${membership.projects[0]?.public_id ?? ''}/overview`)

  const alsoMember = await isMember(project.org_id, user.id)
  if (!alsoMember) redirect('/onboarding')

  return {
    user: { id: user.id, email: user.email ?? '' },
    org: membership.org,
    project,
    role: membership.role,
  }
}

export async function findFirstProject() {
  const user = await requireCurrentUser()
  const memberships = await findMembershipsForUser(user.id)
  const first = memberships[0]
  if (!first) return null
  const project = first.projects[0]
  if (!project) return null
  return { user, org: first.org, project }
}
