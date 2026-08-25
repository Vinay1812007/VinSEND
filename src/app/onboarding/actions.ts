'use server'

import { requireCurrentUser } from '@/lib/auth/server'
import { bootstrapWorkspace } from '@/server/services/onboarding'

export async function createWorkspaceAction(input: {
  orgName: string
  projectName: string
}): Promise<{ orgSlug: string; projectPublicId: string } | { error: string }> {
  try {
    const user = await requireCurrentUser()
    const trimmed = input.orgName.trim()
    if (trimmed.length < 2) return { error: 'Workspace name is too short' }
    const project = input.projectName.trim() || 'Production'
    const { org, project: proj } = await bootstrapWorkspace({
      userId: user.id,
      orgName: trimmed,
      projectName: project,
    })
    return { orgSlug: org.slug, projectPublicId: proj.public_id }
  } catch (err) {
    return { error: (err as Error).message }
  }
}
