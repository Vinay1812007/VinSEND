'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentUser } from '@/lib/auth/server'
import { loadDashboardContext } from '@/server/services/current-context'
import { addDomain, verifyDomain } from '@/server/services/domains'

export async function addDomainAction(input: {
  orgSlug: string
  projectPublicId: string
  domain: string
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  if (ctx.role === 'member') return { error: 'You need admin permissions to add domains' }
  const user = await requireCurrentUser()
  try {
    const result = await addDomain({
      projectId: ctx.project.id,
      orgId: ctx.org.id,
      actorUserId: user.id,
      domain: input.domain.trim().toLowerCase(),
    })
    revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/domains`)
    return { publicId: result?.domain.public_id ?? '' }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export async function verifyDomainAction(input: {
  orgSlug: string
  projectPublicId: string
  publicId: string
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  const user = await requireCurrentUser()
  try {
    await verifyDomain({
      projectId: ctx.project.id,
      orgId: ctx.org.id,
      publicId: input.publicId,
      actorUserId: user.id,
    })
  } catch (err) {
    return { error: (err as Error).message }
  }
  revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/domains/${input.publicId}`)
  return { ok: true }
}
