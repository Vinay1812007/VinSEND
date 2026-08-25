'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentUser } from '@/lib/auth/server'
import { loadDashboardContext } from '@/server/services/current-context'
import { changeMemberRole, removeMember, transferOwnership } from '@/server/services/members'

export async function changeMemberRoleAction(input: {
  orgSlug: string
  projectPublicId: string
  targetUserId: string
  newRole: 'admin' | 'member'
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return { error: 'Only owners and admins can change roles' }
  const user = await requireCurrentUser()
  try {
    await changeMemberRole({
      orgId: ctx.org.id,
      actorUserId: user.id,
      targetUserId: input.targetUserId,
      newRole: input.newRole,
    })
    revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/settings`)
    return { ok: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export async function removeMemberAction(input: {
  orgSlug: string
  projectPublicId: string
  targetUserId: string
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return { error: 'Only owners and admins can remove members' }
  const user = await requireCurrentUser()
  try {
    await removeMember({
      orgId: ctx.org.id,
      actorUserId: user.id,
      targetUserId: input.targetUserId,
    })
    revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/settings`)
    return { ok: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export async function transferOwnershipAction(input: {
  orgSlug: string
  projectPublicId: string
  newOwnerUserId: string
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  if (ctx.role !== 'owner') return { error: 'Only the current owner can transfer ownership' }
  const user = await requireCurrentUser()
  try {
    await transferOwnership({
      orgId: ctx.org.id,
      actorUserId: user.id,
      newOwnerUserId: input.newOwnerUserId,
    })
    revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/settings`)
    return { ok: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
}
