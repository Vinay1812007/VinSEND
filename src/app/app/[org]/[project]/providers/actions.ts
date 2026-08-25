'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentUser } from '@/lib/auth/server'
import { loadDashboardContext } from '@/server/services/current-context'
import { saveProvider, testProviderConfig } from '@/server/services/providers'
import type { ProviderType } from '@/lib/email/types/provider'

export async function saveProviderAction(input: {
  orgSlug: string
  projectPublicId: string
  id?: string
  type: ProviderType
  name: string
  is_default: boolean
  config: Record<string, unknown>
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  if (ctx.role === 'member') return { error: 'You need admin permissions to configure providers' }
  const user = await requireCurrentUser()
  try {
    await saveProvider({
      id: input.id,
      projectId: ctx.project.id,
      orgId: ctx.org.id,
      actorUserId: user.id,
      type: input.type,
      name: input.name,
      is_default: input.is_default,
      config: input.config,
    })
  } catch (err) {
    return { error: (err as Error).message }
  }
  revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/providers`)
  return { ok: true }
}

export async function testProviderAction(input: {
  type: ProviderType
  config: Record<string, unknown>
}) {
  try {
    const result = await testProviderConfig(input)
    return { ok: result.ok, message: result.message ?? null }
  } catch (err) {
    return { ok: false, message: (err as Error).message }
  }
}
