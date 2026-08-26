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

// PostgREST/Supabase-js does NOT know how to serialize a Node Buffer into a
// bytea column — it JSON-stringifies it as {"type":"Buffer","data":[...]} and
// stores that string, which then decrypts as garbage. To go safely over the
// wire we hand-encode as a Postgres hex-literal string ("\x<hex>"), which
// Postgres accepts natively for bytea inserts and updates.
function toByteaLiteral(buf: Buffer): string {
  return '\\x' + buf.toString('hex')
}

// Read the other direction: PostgREST usually returns bytea back as the same
// "\x<hex>" string on GET. Older configurations may hand it back as base64
// or as the corrupted JSON blob that predated this fix — normalize all three
// so an upgrade doesn't strand any existing rows.
function bufferFromByteaResponse(v: unknown): Buffer {
  if (v == null) return Buffer.alloc(0)
  if (Buffer.isBuffer(v)) return v
  if (v instanceof Uint8Array) return Buffer.from(v)
  if (typeof v === 'string') {
    if (v.startsWith('\\x')) return Buffer.from(v.slice(2), 'hex')
    // Pre-fix rows stored the literal JSON {"type":"Buffer","data":[...]} —
    // reconstruct the buffer from the `data` array so old providers keep working.
    if (v.startsWith('{')) {
      try {
        const parsed = JSON.parse(v) as { type?: string; data?: number[] }
        if (parsed?.type === 'Buffer' && Array.isArray(parsed.data)) {
          return Buffer.from(parsed.data)
        }
      } catch {
        // fall through to base64
      }
    }
    // Some deployments return base64 by default.
    try {
      return Buffer.from(v, 'base64')
    } catch {
      return Buffer.from(v, 'utf8')
    }
  }
  // Object shape from a JSON-parsed Buffer serialization: { type: 'Buffer', data: [...] }
  if (typeof v === 'object' && v !== null) {
    const asObj = v as { type?: string; data?: number[] }
    if (asObj.type === 'Buffer' && Array.isArray(asObj.data)) {
      return Buffer.from(asObj.data)
    }
  }
  return Buffer.alloc(0)
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
        config_encrypted: toByteaLiteral(encrypted),
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
      config_encrypted: toByteaLiteral(Buffer.alloc(29)),
      config_meta: input.meta ?? {},
    })
    .select('id')
    .single()
  if (e1 || !shell) throw new Error(`upsertProvider(insert): ${e1?.message}`)

  const scope = scopeFor(input.project_id, shell.id as string)
  const encrypted = encryptJson(input.config, scope)
  const { data: full, error: e2 } = await sb
    .from('email_providers')
    .update({ config_encrypted: toByteaLiteral(encrypted) })
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
  const buf = bufferFromByteaResponse((data as { config_encrypted: unknown }).config_encrypted)
  const config = decryptJson<Record<string, unknown>>(
    buf,
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
