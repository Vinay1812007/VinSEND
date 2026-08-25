// Team membership management: change role, remove member, transfer ownership.

import { getServiceRoleClient } from '@/lib/db/service'
import { recordAuditEvent } from '@/server/repositories/audit'

export type MemberRole = 'owner' | 'admin' | 'member'

export interface MemberRow {
  user_id: string
  role: MemberRole
  display_name: string | null
  email: string | null
}

export async function listMembers(orgId: string): Promise<MemberRow[]> {
  const sb = getServiceRoleClient()
  const { data: rows, error } = await sb
    .from('organization_members')
    .select('user_id, role')
    .eq('org_id', orgId)
  if (error) throw new Error(`listMembers: ${error.message}`)

  const results: MemberRow[] = []
  for (const r of rows ?? []) {
    const row = r as { user_id: string; role: MemberRole }
    const [{ data: profile }, adminResult] = await Promise.all([
      sb.from('profiles').select('display_name').eq('id', row.user_id).maybeSingle(),
      sb.auth.admin.getUserById(row.user_id).catch(() => ({ data: null })),
    ])
    const email = (adminResult as { data?: { user?: { email?: string } } }).data?.user?.email ?? null
    results.push({
      user_id: row.user_id,
      role: row.role,
      display_name: (profile as { display_name: string | null } | null)?.display_name ?? null,
      email,
    })
  }
  return results
}

export async function changeMemberRole(input: {
  orgId: string
  actorUserId: string
  targetUserId: string
  newRole: 'admin' | 'member' // owner is only granted via transferOwnership
}): Promise<void> {
  const sb = getServiceRoleClient()
  // Never demote / promote away the owner via this path.
  const { data: existing } = await sb
    .from('organization_members')
    .select('role')
    .eq('org_id', input.orgId)
    .eq('user_id', input.targetUserId)
    .maybeSingle()
  if (!existing) throw new Error('Member not found')
  if ((existing as { role: MemberRole }).role === 'owner') {
    throw new Error('Cannot change the owner\'s role. Use transferOwnership.')
  }
  const { error } = await sb
    .from('organization_members')
    .update({ role: input.newRole })
    .eq('org_id', input.orgId)
    .eq('user_id', input.targetUserId)
  if (error) throw new Error(`changeMemberRole: ${error.message}`)
  await recordAuditEvent({
    org_id: input.orgId,
    actor_user_id: input.actorUserId,
    action: 'member.role_changed',
    resource_type: 'member',
    resource_id: input.targetUserId,
    metadata: { new_role: input.newRole },
  })
}

export async function removeMember(input: {
  orgId: string
  actorUserId: string
  targetUserId: string
}): Promise<void> {
  const sb = getServiceRoleClient()
  const { data: existing } = await sb
    .from('organization_members')
    .select('role')
    .eq('org_id', input.orgId)
    .eq('user_id', input.targetUserId)
    .maybeSingle()
  if (!existing) return
  if ((existing as { role: MemberRole }).role === 'owner') {
    throw new Error('Cannot remove the owner. Transfer ownership first.')
  }
  const { error } = await sb
    .from('organization_members')
    .delete()
    .eq('org_id', input.orgId)
    .eq('user_id', input.targetUserId)
  if (error) throw new Error(`removeMember: ${error.message}`)
  await recordAuditEvent({
    org_id: input.orgId,
    actor_user_id: input.actorUserId,
    action: 'member.removed',
    resource_type: 'member',
    resource_id: input.targetUserId,
  })
}

export async function transferOwnership(input: {
  orgId: string
  actorUserId: string
  newOwnerUserId: string
}): Promise<void> {
  const sb = getServiceRoleClient()
  // Verify the actor is the current owner.
  const { data: org } = await sb
    .from('organizations')
    .select('owner_id')
    .eq('id', input.orgId)
    .maybeSingle()
  if (!org) throw new Error('Organization not found')
  if ((org as { owner_id: string }).owner_id !== input.actorUserId) {
    throw new Error('Only the current owner can transfer ownership.')
  }
  // Verify the target is a member.
  const { data: newOwnerMembership } = await sb
    .from('organization_members')
    .select('user_id')
    .eq('org_id', input.orgId)
    .eq('user_id', input.newOwnerUserId)
    .maybeSingle()
  if (!newOwnerMembership) throw new Error('The new owner must already be a member.')

  // Swap roles + org.owner_id atomically-ish.
  await sb
    .from('organization_members')
    .update({ role: 'admin' })
    .eq('org_id', input.orgId)
    .eq('user_id', input.actorUserId)
  await sb
    .from('organization_members')
    .update({ role: 'owner' })
    .eq('org_id', input.orgId)
    .eq('user_id', input.newOwnerUserId)
  await sb
    .from('organizations')
    .update({ owner_id: input.newOwnerUserId })
    .eq('id', input.orgId)
  await recordAuditEvent({
    org_id: input.orgId,
    actor_user_id: input.actorUserId,
    action: 'ownership.transferred',
    resource_type: 'organization',
    resource_id: input.orgId,
    metadata: { new_owner: input.newOwnerUserId },
  })
}
