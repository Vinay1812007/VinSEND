import { generateApiKey } from '@/lib/security/api-keys'
import { publicId } from '@/lib/ids'
import {
  insertApiKey,
  listByProject,
  revokeKey,
  type ApiKeyRow,
} from '@/server/repositories/api-keys'
import { getServiceRoleClient } from '@/lib/db/service'
import { recordAuditEvent } from '@/server/repositories/audit'

export interface CreatedApiKey {
  row: Omit<ApiKeyRow, 'hash'>
  /** Full plaintext key. Return once, never store. */
  secret: string
}

export async function createApiKey(input: {
  projectId: string
  orgId: string
  name: string
  environment: 'live' | 'test'
  scopes?: string[]
  actorUserId: string
}): Promise<CreatedApiKey> {
  const generated = generateApiKey(input.environment)
  const row = await insertApiKey({
    project_id: input.projectId,
    org_id: input.orgId,
    public_id: publicId('key'),
    name: input.name,
    prefix: generated.prefix,
    hash: generated.hash,
    environment: input.environment,
    scopes: input.scopes ?? ['emails.send', 'emails.read'],
    created_by: input.actorUserId,
  })

  await recordAuditEvent({
    org_id: input.orgId,
    project_id: input.projectId,
    actor_user_id: input.actorUserId,
    action: 'api_key.created',
    resource_type: 'api_key',
    resource_id: row.public_id,
    metadata: { name: input.name, environment: input.environment },
  })

  const { hash: _drop, ...safe } = row
  void _drop
  return { row: safe, secret: generated.secret }
}

export async function listApiKeys(projectId: string) {
  const rows = await listByProject(projectId)
  return rows.map(({ hash: _drop, ...safe }) => {
    void _drop
    return safe
  })
}

export async function revokeApiKey(input: {
  id: string
  orgId: string
  projectId: string
  actorUserId: string
  publicId: string
}): Promise<void> {
  await revokeKey(input.id, input.orgId)
  await recordAuditEvent({
    org_id: input.orgId,
    project_id: input.projectId,
    actor_user_id: input.actorUserId,
    action: 'api_key.revoked',
    resource_type: 'api_key',
    resource_id: input.publicId,
  })
}

export async function findApiKeyByPublicId(publicId: string): Promise<{
  id: string
  name: string
  environment: 'live' | 'test'
  scopes: string[]
} | null> {
  const sb = getServiceRoleClient()
  const { data } = await sb
    .from('api_keys')
    .select('id, name, environment, scopes')
    .eq('public_id', publicId)
    .maybeSingle()
  return (data as { id: string; name: string; environment: 'live' | 'test'; scopes: string[] } | null) ?? null
}

export async function renameApiKey(input: {
  publicId: string
  name: string
  orgId: string
  projectId: string
  actorUserId: string
}): Promise<void> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('api_keys')
    .update({ name: input.name.trim() })
    .eq('public_id', input.publicId)
    .eq('org_id', input.orgId)
    .select('id')
    .single()
  if (error || !data) throw new Error(`renameApiKey: ${error?.message ?? 'not found'}`)
  await recordAuditEvent({
    org_id: input.orgId,
    project_id: input.projectId,
    actor_user_id: input.actorUserId,
    action: 'api_key.renamed',
    resource_type: 'api_key',
    resource_id: input.publicId,
    metadata: { new_name: input.name.trim() },
  })
}

/**
 * Rotate: revoke the old key and issue a new one with the same name +
 * scopes + environment. Returns the plaintext new secret exactly once.
 */
export async function rotateApiKey(input: {
  publicId: string
  orgId: string
  projectId: string
  actorUserId: string
}): Promise<{ secret: string; publicId: string }> {
  const existing = await findApiKeyByPublicId(input.publicId)
  if (!existing) throw new Error('API key not found')
  await revokeApiKey({
    id: existing.id,
    orgId: input.orgId,
    projectId: input.projectId,
    actorUserId: input.actorUserId,
    publicId: input.publicId,
  })
  const created = await createApiKey({
    projectId: input.projectId,
    orgId: input.orgId,
    name: `${existing.name} (rotated)`,
    environment: existing.environment,
    scopes: existing.scopes,
    actorUserId: input.actorUserId,
  })
  await recordAuditEvent({
    org_id: input.orgId,
    project_id: input.projectId,
    actor_user_id: input.actorUserId,
    action: 'api_key.rotated',
    resource_type: 'api_key',
    resource_id: created.row.public_id,
    metadata: { rotated_from: input.publicId },
  })
  return { secret: created.secret, publicId: created.row.public_id }
}
