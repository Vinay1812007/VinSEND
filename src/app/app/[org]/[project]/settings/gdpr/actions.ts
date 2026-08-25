'use server'

import { requireCurrentUser } from '@/lib/auth/server'
import { loadDashboardContext } from '@/server/services/current-context'
import { deleteOrgData, exportOrgData } from '@/server/services/gdpr'

export async function exportOrgDataAction(input: {
  orgSlug: string
  projectPublicId: string
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  if (ctx.role !== 'owner') return { error: 'Only the owner can export org data' }
  const bundle = await exportOrgData(ctx.org.id)
  return { bundle }
}

export async function deleteOrgAction(input: {
  orgSlug: string
  projectPublicId: string
  reason: string
  confirm: string
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  if (ctx.role !== 'owner') return { error: 'Only the owner can request deletion' }
  if (input.confirm !== ctx.org.slug) {
    return { error: `Type the slug (${ctx.org.slug}) exactly to confirm.` }
  }
  const user = await requireCurrentUser()
  try {
    const result = await deleteOrgData({
      orgId: ctx.org.id,
      actorUserId: user.id,
      reason: input.reason,
    })
    return result
  } catch (err) {
    return { error: (err as Error).message }
  }
}
