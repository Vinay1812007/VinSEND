import { getServiceRoleClient } from '@/lib/db/service'
import { decryptJson, encryptJson } from '@/lib/security/crypto'
import type { ProviderType } from '@/lib/email/types/provider'

export interface ProviderRow {
  id: string
  project_id: string
  org_id: string
  type: ProviderType
  name: string
  is_default: boolean
  config_meta: Record<string, unknown>
  created_at: string
}

export interface ProviderRowWithConfig extends ProviderRow {
  config: Record<string, unknown>
}

function scopeFor(projectId: string, providerId: string): string {
  return `provider:${projectId}:${providerId}`
}

export async function upsertProvider(input: {
  id?: string
  project_id: string
  org_id: string
  type: ProviderType
  name: string
  is_default: boolean
  config: Record<string, unknown>
  meta?: Record<string, unknown>
}): Promise<ProviderRow> {
  const sb = getServiceRoleClient()

  // If setting default, clear the other default first.
  if (input.is_default) {
    await sb
      .from('email_providers')
      .update({ is_default: false })
      .eq('project_id', input.project_id)
      .eq('is_default', true)
  }

  if (input.id) {
    const scope = scopeFor(input.project_id, input.id)
    const encrypted = encryptJson(input.config, scope)
    const { data, error } = await sb
      .from('email_providers')
      .update({
        type: input.type,
        name: input.name,
        is_default: input.is_default,
        config_encrypted: encrypted,
        config_meta: input.meta ?? {},
      })
      .eq('id', input.id)
      .select('id, project_id, org_id, type, name, is_default, config_meta, created_at')
      .single()
    if (error || !data) throw new Error(`upsertProvider: ${error?.message}`)
    return data as ProviderRow
  }

  // Insert flow: two-step so we know the row id to derive the scope.
  const { data: shell, error: e1 } = await sb
    .from('email_providers')
    .insert({
      project_id: input.project_id,
      org_id: input.org_id,
      type: input.type,
      name: input.name,
      is_default: input.is_default,
      config_encrypted: Buffer.alloc(29), // placeholder; overwritten below
      config_meta: input.meta ?? {},
    })
    .select('id')
    .single()
  if (e1 || !shell) throw new Error(`upsertProvider(insert): ${e1?.message}`)

  const scope = scopeFor(input.project_id, shell.id as string)
  const encrypted = encryptJson(input.config, scope)
  const { data: full, error: e2 } = await sb
    .from('email_providers')
    .update({ config_encrypted: encrypted })
    .eq('id', shell.id)
    .select('id, project_id, org_id, type, name, is_default, config_meta, created_at')
    .single()
  if (e2 || !full) throw new Error(`upsertProvider(finalize): ${e2?.message}`)
  return full as ProviderRow
}

export async function findDefaultProvider(
  projectId: string,
): Promise<ProviderRowWithConfig | null> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('email_providers')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_default', true)
    .maybeSingle()
  if (error) throw new Error(`findDefaultProvider: ${error.message}`)
  if (!data) return null
  const config = decryptJson<Record<string, unknown>>(
    Buffer.from((data as { config_encrypted: string }).config_encrypted, 'hex').length > 0
      ? Buffer.from((data as { config_encrypted: string }).config_encrypted.replace(/^\\x/, ''), 'hex')
      : bufferFromMaybeBase64((data as { config_encrypted: unknown }).config_encrypted),
    scopeFor(projectId, (data as { id: string }).id),
  )
  const { config_encrypted: _drop, ...rest } = data as Record<string, unknown>
  void _drop
  return { ...(rest as unknown as ProviderRow), config } as ProviderRowWithConfig
}

export async function listProviders(projectId: string): Promise<ProviderRow[]> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('email_providers')
    .select('id, project_id, org_id, type, name, is_default, config_meta, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`listProviders: ${error.message}`)
  return (data ?? []) as ProviderRow[]
}

// Supabase returns bytea as either "\\x...." hex or as a base64 string depending on
// the request path. Normalize both.
function bufferFromMaybeBase64(v: unknown): Buffer {
  if (v == null) return Buffer.alloc(0)
  if (Buffer.isBuffer(v)) return v
  if (typeof v === 'string') {
    if (v.startsWith('\\x')) return Buffer.from(v.slice(2), 'hex')
    // Assume base64 as a fallback.
    try {
      return Buffer.from(v, 'base64')
    } catch {
      return Buffer.from(v, 'utf8')
    }
  }
  if (v instanceof Uint8Array) return Buffer.from(v)
  return Buffer.alloc(0)
}
