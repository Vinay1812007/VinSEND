import { getServiceRoleClient } from '@/lib/db/service'

export interface InvitationRow {
  id: string
  org_id: string
  email: string
  role: 'admin' | 'member'
  token_hash: string
  invited_by: string | null
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  expires_at: string
  accepted_at: string | null
  accepted_by: string | null
  created_at: string
}

export async function insertInvitation(row: {
  org_id: string
  email: string
  role: 'admin' | 'member'
  token_hash: string
  invited_by: string | null
}): Promise<InvitationRow> {
  const sb = getServiceRoleClient()
  // Revoke any existing pending invitation for the same (org, email) first.
  await sb
    .from('invitations')
    .update({ status: 'revoked' })
    .eq('org_id', row.org_id)
    .eq('email', row.email.toLowerCase())
    .eq('status', 'pending')
  const { data, error } = await sb
    .from('invitations')
    .insert({
      org_id: row.org_id,
      email: row.email.toLowerCase(),
      role: row.role,
      token_hash: row.token_hash,
      invited_by: row.invited_by,
    })
    .select('*')
    .single()
  if (error || !data) throw new Error(`insertInvitation: ${error?.message}`)
  return data as InvitationRow
}

export async function listInvitationsByOrg(orgId: string): Promise<InvitationRow[]> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('invitations')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(`listInvitationsByOrg: ${error.message}`)
  return (data ?? []) as InvitationRow[]
}

export async function findInvitationByTokenHash(hash: string): Promise<InvitationRow | null> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('invitations')
    .select('*')
    .eq('token_hash', hash)
    .maybeSingle()
  if (error) throw new Error(`findInvitationByTokenHash: ${error.message}`)
  return (data as InvitationRow | null) ?? null
}

export async function acceptInvitation(input: {
  id: string
  userId: string
}): Promise<void> {
  const sb = getServiceRoleClient()
  const { error } = await sb
    .from('invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_by: input.userId,
    })
    .eq('id', input.id)
  if (error) throw new Error(`acceptInvitation: ${error.message}`)
}

export async function revokeInvitation(id: string): Promise<void> {
  const sb = getServiceRoleClient()
  const { error } = await sb.from('invitations').update({ status: 'revoked' }).eq('id', id)
  if (error) throw new Error(`revokeInvitation: ${error.message}`)
}
