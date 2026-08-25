// Contact lists (explicit membership) and segments (property filter).

import { getServiceRoleClient } from '@/lib/db/service'

export interface ContactListRow {
  id: string
  project_id: string
  org_id: string
  name: string
  created_at: string
}

export interface ContactListWithCount extends ContactListRow {
  member_count: number
}

export interface SegmentRow {
  id: string
  project_id: string
  org_id: string
  name: string
  filter: SegmentFilter
  created_at: string
}

export type SegmentFilter = {
  /** Simple AND of property equality checks. */
  equals?: Record<string, string>
  /** Contact status must be one of these. Defaults to ['active']. */
  statusIn?: string[]
}

export async function listListsWithCounts(projectId: string): Promise<ContactListWithCount[]> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('contact_lists')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listListsWithCounts: ${error.message}`)
  const out: ContactListWithCount[] = []
  for (const l of data ?? []) {
    const list = l as ContactListRow
    const { count } = await sb
      .from('contact_list_members')
      .select('*', { count: 'exact', head: true })
      .eq('list_id', list.id)
    out.push({ ...list, member_count: count ?? 0 })
  }
  return out
}

export async function createList(input: { projectId: string; orgId: string; name: string }) {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('contact_lists')
    .insert({ project_id: input.projectId, org_id: input.orgId, name: input.name.trim() })
    .select('*')
    .single()
  if (error || !data) throw new Error(`createList: ${error?.message}`)
  return data as ContactListRow
}

export async function addContactToList(input: { listId: string; contactId: string }) {
  const sb = getServiceRoleClient()
  const { error } = await sb
    .from('contact_list_members')
    .upsert(
      { list_id: input.listId, contact_id: input.contactId },
      { onConflict: 'list_id,contact_id' },
    )
  if (error) throw new Error(`addContactToList: ${error.message}`)
}

export async function removeContactFromList(input: { listId: string; contactId: string }) {
  const sb = getServiceRoleClient()
  const { error } = await sb
    .from('contact_list_members')
    .delete()
    .eq('list_id', input.listId)
    .eq('contact_id', input.contactId)
  if (error) throw new Error(`removeContactFromList: ${error.message}`)
}

export async function deleteList(input: { projectId: string; listId: string }) {
  const sb = getServiceRoleClient()
  const { error } = await sb
    .from('contact_lists')
    .delete()
    .eq('id', input.listId)
    .eq('project_id', input.projectId)
  if (error) throw new Error(`deleteList: ${error.message}`)
}

export async function listSegments(projectId: string): Promise<SegmentRow[]> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('contact_segments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listSegments: ${error.message}`)
  return (data ?? []) as SegmentRow[]
}

export async function createSegment(input: {
  projectId: string
  orgId: string
  name: string
  filter: SegmentFilter
}): Promise<SegmentRow> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('contact_segments')
    .insert({
      project_id: input.projectId,
      org_id: input.orgId,
      name: input.name.trim(),
      filter: input.filter,
    })
    .select('*')
    .single()
  if (error || !data) throw new Error(`createSegment: ${error?.message}`)
  return data as SegmentRow
}

export async function deleteSegment(input: { projectId: string; segmentId: string }) {
  const sb = getServiceRoleClient()
  const { error } = await sb
    .from('contact_segments')
    .delete()
    .eq('id', input.segmentId)
    .eq('project_id', input.projectId)
  if (error) throw new Error(`deleteSegment: ${error.message}`)
}

/**
 * Evaluate a segment against the contacts table. Returns matched contact IDs
 * (capped at `limit` for safety).
 */
export async function evaluateSegment(input: {
  projectId: string
  filter: SegmentFilter
  limit?: number
}): Promise<Array<{ id: string; email: string }>> {
  const sb = getServiceRoleClient()
  let q = sb
    .from('contacts')
    .select('id, email, properties, status')
    .eq('project_id', input.projectId)
    .limit(Math.min(input.limit ?? 500, 5000))

  const statuses = input.filter.statusIn ?? ['active']
  q = q.in('status', statuses)

  const { data, error } = await q
  if (error) throw new Error(`evaluateSegment: ${error.message}`)
  const rows = (data ?? []) as Array<{
    id: string
    email: string
    properties: Record<string, unknown>
  }>
  const equals = input.filter.equals ?? {}
  const keys = Object.keys(equals)
  const filtered = rows.filter((c) => {
    for (const k of keys) {
      if (String(c.properties?.[k] ?? '') !== equals[k]) return false
    }
    return true
  })
  return filtered.map((c) => ({ id: c.id, email: c.email }))
}
