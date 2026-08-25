import { getServiceRoleClient } from '@/lib/db/service'

export interface TemplateRow {
  id: string
  project_id: string
  org_id: string
  public_id: string
  name: string
  subject: string
  html: string
  text: string | null
  variables: string[]
  version: number
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
}

export async function listTemplatesByProject(projectId: string): Promise<TemplateRow[]> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('templates')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listTemplatesByProject: ${error.message}`)
  return (data ?? []) as TemplateRow[]
}

export async function findTemplateByPublicId(projectId: string, publicId: string) {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('templates')
    .select('*')
    .eq('project_id', projectId)
    .eq('public_id', publicId)
    .maybeSingle()
  if (error) throw new Error(`findTemplateByPublicId: ${error.message}`)
  return (data as TemplateRow | null) ?? null
}

export async function insertTemplate(row: Omit<TemplateRow, 'id' | 'created_at' | 'updated_at' | 'version' | 'status'>): Promise<TemplateRow> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb.from('templates').insert(row).select('*').single()
  if (error || !data) throw new Error(`insertTemplate: ${error?.message}`)
  return data as TemplateRow
}

export async function updateTemplate(
  id: string,
  update: Partial<Pick<TemplateRow, 'name' | 'subject' | 'html' | 'text' | 'variables' | 'status'>>,
): Promise<TemplateRow> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('templates')
    .update({ ...update, version: undefined })
    .eq('id', id)
    .select('*')
    .single()
  if (error || !data) throw new Error(`updateTemplate: ${error?.message}`)
  return data as TemplateRow
}

export async function bumpTemplateVersion(id: string): Promise<void> {
  const sb = getServiceRoleClient()
  const { data: current } = await sb
    .from('templates')
    .select('version')
    .eq('id', id)
    .maybeSingle()
  const version = ((current as { version: number } | null)?.version ?? 0) + 1
  await sb.from('templates').update({ version }).eq('id', id)
}

export async function deleteTemplate(id: string): Promise<void> {
  const sb = getServiceRoleClient()
  const { error } = await sb.from('templates').delete().eq('id', id)
  if (error) throw new Error(`deleteTemplate: ${error.message}`)
}
