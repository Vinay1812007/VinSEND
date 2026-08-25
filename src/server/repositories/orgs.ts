import { getServiceRoleClient } from '@/lib/db/service'

export interface OrgRow {
  id: string
  name: string
  slug: string
  owner_id: string
  created_at: string
}

export interface ProjectRow {
  id: string
  org_id: string
  name: string
  public_id: string
  created_at: string
}

export interface MembershipRow {
  org_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
}

export async function createOrganization(input: {
  name: string
  slug: string
  ownerId: string
}): Promise<OrgRow> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('organizations')
    .insert({ name: input.name, slug: input.slug, owner_id: input.ownerId })
    .select('*')
    .single()
  if (error || !data) throw new Error(`createOrganization: ${error?.message}`)
  await sb
    .from('organization_members')
    .insert({ org_id: data.id, user_id: input.ownerId, role: 'owner' })
  return data as OrgRow
}

export async function createProject(input: {
  orgId: string
  name: string
  publicId: string
}): Promise<ProjectRow> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('projects')
    .insert({ org_id: input.orgId, name: input.name, public_id: input.publicId })
    .select('*')
    .single()
  if (error || !data) throw new Error(`createProject: ${error?.message}`)
  return data as ProjectRow
}

export async function findMembershipsForUser(userId: string): Promise<
  Array<{
    org: OrgRow
    role: MembershipRow['role']
    projects: ProjectRow[]
  }>
> {
  const sb = getServiceRoleClient()
  const { data: members, error } = await sb
    .from('organization_members')
    .select('org_id, role, organizations!inner(id, name, slug, owner_id, created_at)')
    .eq('user_id', userId)
  if (error) throw new Error(`findMembershipsForUser: ${error.message}`)

  const results: Array<{ org: OrgRow; role: MembershipRow['role']; projects: ProjectRow[] }> = []
  for (const m of members ?? []) {
    const org = (m as unknown as { organizations: OrgRow }).organizations
    const { data: projects } = await sb
      .from('projects')
      .select('*')
      .eq('org_id', org.id)
      .order('created_at', { ascending: true })
    results.push({
      org,
      role: (m as { role: MembershipRow['role'] }).role,
      projects: (projects ?? []) as ProjectRow[],
    })
  }
  return results
}

export async function findProjectByPublicId(publicId: string): Promise<ProjectRow | null> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('projects')
    .select('*')
    .eq('public_id', publicId)
    .maybeSingle()
  if (error) throw new Error(`findProjectByPublicId: ${error.message}`)
  return (data as ProjectRow | null) ?? null
}

export async function findProjectById(id: string): Promise<ProjectRow | null> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb.from('projects').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`findProjectById: ${error.message}`)
  return (data as ProjectRow | null) ?? null
}

export async function isMember(orgId: string, userId: string): Promise<MembershipRow | null> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('organization_members')
    .select('*')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`isMember: ${error.message}`)
  return (data as MembershipRow | null) ?? null
}
