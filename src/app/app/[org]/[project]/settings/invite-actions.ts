'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentUser } from '@/lib/auth/server'
import { loadDashboardContext } from '@/server/services/current-context'
import { inviteTeammate, revokeInvite } from '@/server/services/invitations'

export async function inviteTeammateAction(input: {
  orgSlug: string
  projectPublicId: string
  email: string
  role: 'admin' | 'member'
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  if (ctx.role === 'member') return { error: 'You need admin permissions to invite teammates' }
  const user = await requireCurrentUser()
  try {
    const { acceptUrl, row } = await inviteTeammate({
      orgId: ctx.org.id,
      actorUserId: user.id,
      email: input.email,
      role: input.role,
    })
    revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/settings`)
    return { acceptUrl, email: row.email, role: row.role }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export async function revokeInviteAction(input: {
  orgSlug: string
  projectPublicId: string
  invitationId: string
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  if (ctx.role === 'member') return { error: 'You need admin permissions to revoke invites' }
  const user = await requireCurrentUser()
  try {
    await revokeInvite({
      orgId: ctx.org.id,
      actorUserId: user.id,
      invitationId: input.invitationId,
    })
    revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/settings`)
    return { ok: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
}
