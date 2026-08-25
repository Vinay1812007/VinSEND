'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentUser } from '@/lib/auth/server'
import { loadDashboardContext } from '@/server/services/current-context'
import { registerWebhook, removeWebhook, rotateSigningSecret } from '@/server/services/webhooks'

export async function createWebhookAction(input: {
  orgSlug: string
  projectPublicId: string
  url: string
  events: string[]
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  if (ctx.role === 'member') return { error: 'You need admin permissions to add webhooks' }
  const user = await requireCurrentUser()
  try {
    const result = await registerWebhook({
      projectId: ctx.project.id,
      orgId: ctx.org.id,
      actorUserId: user.id,
      url: input.url,
      events: input.events,
    })
    revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/webhooks`)
    return {
      id: result.row.public_id,
      url: result.row.url,
      secret: result.secret,
    }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export async function deleteWebhookAction(input: {
  orgSlug: string
  projectPublicId: string
  publicId: string
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  if (ctx.role === 'member') return { error: 'You need admin permissions to delete webhooks' }
  const user = await requireCurrentUser()
  try {
    await removeWebhook({
      projectId: ctx.project.id,
      orgId: ctx.org.id,
      publicId: input.publicId,
      actorUserId: user.id,
    })
    revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/webhooks`)
    return { ok: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export async function rotateWebhookSecretAction(input: {
  orgSlug: string
  projectPublicId: string
  publicId: string
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  if (ctx.role === 'member') return { error: 'You need admin permissions to rotate webhook secrets' }
  const user = await requireCurrentUser()
  try {
    const secret = await rotateSigningSecret({
      projectId: ctx.project.id,
      orgId: ctx.org.id,
      publicId: input.publicId,
      actorUserId: user.id,
    })
    revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/webhooks`)
    return { secret }
  } catch (err) {
    return { error: (err as Error).message }
  }
}
