'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentUser } from '@/lib/auth/server'
import { loadDashboardContext } from '@/server/services/current-context'
import { createApiKey, revokeApiKey, findApiKeyByPublicId } from '@/server/services/api-keys'

export async function createApiKeyAction(input: {
  orgSlug: string
  projectPublicId: string
  name: string
  environment: 'live' | 'test'
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  if (ctx.role === 'member') return { error: 'You need admin permissions to create API keys' }
  const user = await requireCurrentUser()
  const { row, secret } = await createApiKey({
    projectId: ctx.project.id,
    orgId: ctx.org.id,
    name: input.name.trim(),
    environment: input.environment,
    actorUserId: user.id,
  })
  revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/api-keys`)
  return { id: row.public_id, name: row.name, prefix: row.prefix, secret, environment: row.environment }
}

export async function revokeApiKeyAction(input: {
  orgSlug: string
  projectPublicId: string
  publicId: string
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  if (ctx.role === 'member') return { error: 'You need admin permissions to revoke API keys' }
  const user = await requireCurrentUser()
  const record = await findApiKeyByPublicId(input.publicId)
  if (!record) return { error: 'API key not found' }
  await revokeApiKey({
    id: record.id,
    orgId: ctx.org.id,
    projectId: ctx.project.id,
    publicId: input.publicId,
    actorUserId: user.id,
  })
  revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/api-keys`)
  return { ok: true }
}
