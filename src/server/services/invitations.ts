import { parseAddress } from '@/lib/security/addresses'
import { generateInviteToken, hashInviteToken } from '@/lib/security/invite-tokens'
import { publicEnv } from '@/lib/validation/env'
import { getServiceRoleClient } from '@/lib/db/service'
import {
  acceptInvitation,
  findInvitationByTokenHash,
  insertInvitation,
  listInvitationsByOrg,
  revokeInvitation,
  type InvitationRow,
} from '@/server/repositories/invitations'
import { recordAuditEvent } from '@/server/repositories/audit'

export interface CreatedInvitation {
  row: InvitationRow
  /** Full URL to send to the teammate. Show once, do not store. */
  acceptUrl: string
}

export async function inviteTeammate(input: {
  orgId: string
  actorUserId: string
  email: string
  role: 'admin' | 'member'
}): Promise<CreatedInvitation> {
  const parsed = parseAddress(input.email)
  const token = generateInviteToken()
  const row = await insertInvitation({
    org_id: input.orgId,
    email: parsed.address,
    role: input.role,
    token_hash: hashInviteToken(token),
    invited_by: input.actorUserId,
  })
  await recordAuditEvent({
    org_id: input.orgId,
    actor_user_id: input.actorUserId,
    action: 'invitation.created',
    resource_type: 'invitation',
    resource_id: row.id,
    metadata: { email_domain: parsed.domain, role: input.role },
  })
  const acceptUrl = `${publicEnv.APP_URL}/accept-invite?token=${encodeURIComponent(token)}`
  return { row, acceptUrl }
}

export async function acceptInvitationByToken(input: {
  token: string
  userId: string
  userEmail: string
}): Promise<{ orgId: string; orgSlug: string } | { error: string }> {
  const hash = hashInviteToken(input.token)
  const inv = await findInvitationByTokenHash(hash)
  if (!inv) return { error: 'This invite link is invalid.' }
  if (inv.status !== 'pending') return { error: `This invite has already been ${inv.status}.` }
  if (new Date(inv.expires_at).getTime() < Date.now()) {
    return { error: 'This invite has expired. Ask the workspace owner to resend it.' }
  }
  if (inv.email.toLowerCase() !== input.userEmail.toLowerCase()) {
    return {
      error: `This invite was issued to ${inv.email}. Sign in with that email to accept.`,
    }
  }

  const sb = getServiceRoleClient()
  // Add membership (idempotent).
  const { error: memErr } = await sb
    .from('organization_members')
    .upsert(
      {
        org_id: inv.org_id,
        user_id: input.userId,
        role: inv.role,
      },
      { onConflict: 'org_id,user_id' },
    )
  if (memErr) return { error: memErr.message }

  await acceptInvitation({ id: inv.id, userId: input.userId })
  await recordAuditEvent({
    org_id: inv.org_id,
    actor_user_id: input.userId,
    action: 'invitation.accepted',
    resource_type: 'invitation',
    resource_id: inv.id,
  })

  const { data: org } = await sb.from('organizations').select('slug').eq('id', inv.org_id).maybeSingle()
  return { orgId: inv.org_id, orgSlug: (org as { slug: string } | null)?.slug ?? '' }
}

export async function revokeInvite(input: {
  orgId: string
  actorUserId: string
  invitationId: string
}) {
  await revokeInvitation(input.invitationId)
  await recordAuditEvent({
    org_id: input.orgId,
    actor_user_id: input.actorUserId,
    action: 'invitation.revoked',
    resource_type: 'invitation',
    resource_id: input.invitationId,
  })
}

export { listInvitationsByOrg }
