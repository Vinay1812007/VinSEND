import { getServiceRoleClient } from '@/lib/db/service'

export interface ApiKeyRow {
  id: string
  project_id: string
  org_id: string
  public_id: string
  name: string
  prefix: string
  hash: string
  scopes: string[]
  environment: 'live' | 'test'
  created_by: string | null
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
}

export async function insertApiKey(row: {
  project_id: string
  org_id: string
  public_id: string
  name: string
  prefix: string
  hash: string
  environment: 'live' | 'test'
  scopes: string[]
  created_by: string | null
}): Promise<ApiKeyRow> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb.from('api_keys').insert(row).select('*').single()
  if (error || !data) throw new Error(`insertApiKey: ${error?.message}`)
  return data as ApiKeyRow
}

export async function findByPrefix(prefix: string): Promise<ApiKeyRow | null> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('api_keys')
    .select('*')
    .eq('prefix', prefix)
    .is('revoked_at', null)
    .maybeSingle()
  if (error) throw new Error(`findByPrefix: ${error.message}`)
  return (data as ApiKeyRow | null) ?? null
}

export async function markUsed(id: string): Promise<void> {
  const sb = getServiceRoleClient()
  // Fire-and-forget best-effort. Errors are logged by the caller if desired.
  await sb.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', id)
}

export async function revokeKey(id: string, orgId: string): Promise<void> {
  const sb = getServiceRoleClient()
  const { error } = await sb
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', orgId)
  if (error) throw new Error(`revokeKey: ${error.message}`)
}

export async function listByProject(projectId: string): Promise<ApiKeyRow[]> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('api_keys')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listByProject: ${error.message}`)
  return (data ?? []) as ApiKeyRow[]
}
