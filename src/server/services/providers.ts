import type { ProviderType } from '@/lib/email/types/provider'
import { providerFrom } from '@/lib/email/registry'
import { listProviders, upsertProvider, findDefaultProvider } from '@/server/repositories/providers'
import { recordAuditEvent } from '@/server/repositories/audit'

export async function saveProvider(input: {
  id?: string
  projectId: string
  orgId: string
  actorUserId: string
  type: ProviderType
  name: string
  is_default: boolean
  config: Record<string, unknown>
}) {
  const row = await upsertProvider({
    id: input.id,
    project_id: input.projectId,
    org_id: input.orgId,
    type: input.type,
    name: input.name,
    is_default: input.is_default,
    config: input.config,
    meta: { host: (input.config as { host?: string }).host ?? null },
  })
  await recordAuditEvent({
    org_id: input.orgId,
    project_id: input.projectId,
    actor_user_id: input.actorUserId,
    action: 'provider.saved',
    resource_type: 'email_provider',
    resource_id: row.id,
    metadata: { type: input.type, is_default: input.is_default },
  })
  return row
}

export async function testProviderConfig(input: {
  type: ProviderType
  config: Record<string, unknown>
}) {
  const provider = providerFrom(input.type, input.config)
  if (!provider.validateConfiguration) return { ok: true }
  return provider.validateConfiguration()
}

export { listProviders, findDefaultProvider }
