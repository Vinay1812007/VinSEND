import { getServiceRoleClient } from '@/lib/db/service'

export interface ContactRow {
  id: string
  project_id: string
  org_id: string
  public_id: string
  email: string
  first_name: string | null
  last_name: string | null
  properties: Record<string, unknown>
  status: 'active' | 'unsubscribed' | 'archived'
  created_at: string
  updated_at: string
}

export async function listContactsByProject(
  projectId: string,
  opts: { limit?: number; search?: string } = {},
): Promise<ContactRow[]> {
  const sb = getServiceRoleClient()
  const limit = Math.min(opts.limit ?? 100, 500)
  let q = sb
    .from('contacts')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (opts.search) q = q.ilike('email', `%${opts.search}%`)
  const { data, error } = await q
  if (error) throw new Error(`listContactsByProject: ${error.message}`)
  return (data ?? []) as ContactRow[]
}

export async function findContactByPublicId(projectId: string, publicId: string) {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('contacts')
    .select('*')
    .eq('project_id', projectId)
    .eq('public_id', publicId)
    .maybeSingle()
  if (error) throw new Error(`findContactByPublicId: ${error.message}`)
  return (data as ContactRow | null) ?? null
}

export async function insertContact(row: Omit<ContactRow, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<ContactRow> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb.from('contacts').insert(row).select('*').single()
  if (error || !data) throw new Error(`insertContact: ${error?.message}`)
  return data as ContactRow
}

export async function updateContact(
  id: string,
  update: Partial<Pick<ContactRow, 'first_name' | 'last_name' | 'properties' | 'status'>>,
): Promise<ContactRow> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb.from('contacts').update(update).eq('id', id).select('*').single()
  if (error || !data) throw new Error(`updateContact: ${error?.message}`)
  return data as ContactRow
}

export async function deleteContact(id: string): Promise<void> {
  const sb = getServiceRoleClient()
  const { error } = await sb.from('contacts').delete().eq('id', id)
  if (error) throw new Error(`deleteContact: ${error.message}`)
}

export async function countContacts(projectId: string): Promise<number> {
  const sb = getServiceRoleClient()
  const { count, error } = await sb
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
  if (error) throw new Error(`countContacts: ${error.message}`)
  return count ?? 0
}
