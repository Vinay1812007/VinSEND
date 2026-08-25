// Admin service. All exports require an is_staff caller — the route layer
// enforces this via `requireStaff` before invoking any of these.

import { getServiceRoleClient } from '@/lib/db/service'
import { requireCurrentUser } from '@/lib/auth/server'

export async function requireStaff(): Promise<{ id: string; email: string }> {
  const user = await requireCurrentUser()
  const sb = getServiceRoleClient()
  const { data } = await sb.from('profiles').select('is_staff').eq('id', user.id).maybeSingle()
  if (!data || !(data as { is_staff: boolean }).is_staff) {
    throw new Error('FORBIDDEN')
  }
  return { id: user.id, email: user.email ?? '' }
}

export interface AdminOverview {
  orgCount: number
  projectCount: number
  emailCount: number
  emailsLast24h: number
  failedLast24h: number
  activeWebhooks: number
  webhookFailuresLast24h: number
  activeApiKeys: number
}

export async function overview(): Promise<AdminOverview> {
  const sb = getServiceRoleClient()
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString()

  const results = await Promise.all([
    sb.from('organizations').select('*', { count: 'exact', head: true }),
    sb.from('projects').select('*', { count: 'exact', head: true }),
    sb.from('emails').select('*', { count: 'exact', head: true }),
    sb.from('emails').select('*', { count: 'exact', head: true }).gte('created_at', since24h),
    sb
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', since24h),
    sb.from('webhooks').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    sb
      .from('webhook_deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'abandoned')
      .gte('created_at', since24h),
    sb.from('api_keys').select('*', { count: 'exact', head: true }).is('revoked_at', null),
  ])

  const c = (i: number) => (results[i]?.count as number | null) ?? 0
  return {
    orgCount: c(0),
    projectCount: c(1),
    emailCount: c(2),
    emailsLast24h: c(3),
    failedLast24h: c(4),
    activeWebhooks: c(5),
    webhookFailuresLast24h: c(6),
    activeApiKeys: c(7),
  }
}

export interface AdminOrgRow {
  id: string
  name: string
  slug: string
  owner_id: string
  created_at: string
  project_count: number
  member_count: number
  email_count_30d: number
}

export async function listOrgs(limit = 50): Promise<AdminOrgRow[]> {
  const sb = getServiceRoleClient()
  const { data: orgs, error } = await sb
    .from('organizations')
    .select('id, name, slug, owner_id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`admin.listOrgs: ${error.message}`)

  const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

  const results: AdminOrgRow[] = []
  for (const o of orgs ?? []) {
    const org = o as { id: string; name: string; slug: string; owner_id: string; created_at: string }
    const [{ count: projectCount }, { count: memberCount }, { count: emailCount }] =
      await Promise.all([
        sb.from('projects').select('*', { count: 'exact', head: true }).eq('org_id', org.id),
        sb
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', org.id),
        sb
          .from('emails')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', org.id)
          .gte('created_at', since30d),
      ])
    results.push({
      ...org,
      project_count: projectCount ?? 0,
      member_count: memberCount ?? 0,
      email_count_30d: emailCount ?? 0,
    })
  }
  return results
}

export interface AdminOrgDetail {
  org: AdminOrgRow
  projects: Array<{ id: string; name: string; public_id: string; created_at: string }>
  members: Array<{ user_id: string; role: string }>
  recentFailedEmails: Array<{
    id: string
    public_id: string
    subject: string
    from_address: string
    error_code: string | null
    created_at: string
  }>
}

export async function orgDetail(orgId: string): Promise<AdminOrgDetail | null> {
  const sb = getServiceRoleClient()
  const { data: org } = await sb
    .from('organizations')
    .select('id, name, slug, owner_id, created_at')
    .eq('id', orgId)
    .maybeSingle()
  if (!org) return null

  const [projects, members, failed] = await Promise.all([
    sb
      .from('projects')
      .select('id, name, public_id, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false }),
    sb.from('organization_members').select('user_id, role').eq('org_id', orgId),
    sb
      .from('emails')
      .select('id, public_id, subject, from_address, error_code, created_at')
      .eq('org_id', orgId)
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const enriched: AdminOrgRow = {
    ...(org as AdminOrgRow),
    project_count: projects.data?.length ?? 0,
    member_count: members.data?.length ?? 0,
    email_count_30d: 0,
  }
  return {
    org: enriched,
    projects: (projects.data ?? []) as AdminOrgDetail['projects'],
    members: (members.data ?? []) as AdminOrgDetail['members'],
    recentFailedEmails: (failed.data ?? []) as AdminOrgDetail['recentFailedEmails'],
  }
}

export interface SystemHealth {
  postgres: { ok: boolean; latency_ms: number; error?: string }
  pendingWebhookDeliveries: number
  oldestPendingWebhookAt: string | null
  suppressionsLast24h: number
}

export interface AdminUserRow {
  id: string
  email: string | null
  display_name: string | null
  is_staff: boolean
  memberships: Array<{ org_id: string; org_name: string; role: string }>
  created_at: string
}

export async function findUserById(userId: string): Promise<AdminUserRow | null> {
  const sb = getServiceRoleClient()
  const [{ data: profile }, adminResult, memberships] = await Promise.all([
    sb
      .from('profiles')
      .select('display_name, is_staff, created_at')
      .eq('id', userId)
      .maybeSingle(),
    sb.auth.admin.getUserById(userId).catch(() => ({ data: null })),
    sb
      .from('organization_members')
      .select('org_id, role, organizations!inner(name)')
      .eq('user_id', userId),
  ])
  if (!profile) return null
  const email =
    (adminResult as { data?: { user?: { email?: string } } }).data?.user?.email ?? null
  const mems = (memberships.data ?? []).map((m) => ({
    org_id: (m as { org_id: string }).org_id,
    role: (m as { role: string }).role,
    org_name:
      ((m as { organizations?: { name?: string } | { name?: string }[] }).organizations as {
        name?: string
      })?.name ?? '',
  }))
  return {
    id: userId,
    email,
    display_name: (profile as { display_name: string | null }).display_name,
    is_staff: (profile as { is_staff: boolean }).is_staff,
    memberships: mems,
    created_at: (profile as { created_at: string }).created_at,
  }
}

export async function listUsers(limit = 100): Promise<AdminUserRow[]> {
  const sb = getServiceRoleClient()
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, display_name, is_staff, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  const out: AdminUserRow[] = []
  for (const p of profiles ?? []) {
    const row = p as {
      id: string
      display_name: string | null
      is_staff: boolean
      created_at: string
    }
    const adminResult = await sb.auth.admin.getUserById(row.id).catch(() => ({ data: null }))
    out.push({
      ...row,
      email:
        (adminResult as { data?: { user?: { email?: string } } }).data?.user?.email ?? null,
      memberships: [],
    })
  }
  return out
}

export async function suspendOrganization(input: {
  actorUserId: string
  orgId: string
}): Promise<void> {
  const sb = getServiceRoleClient()
  // Revoke every API key + pause every webhook. Mark the org name with a
  // "[SUSPENDED]" prefix so it's obvious in the dashboard.
  const nowIso = new Date().toISOString()
  await Promise.all([
    sb.from('api_keys').update({ revoked_at: nowIso }).eq('org_id', input.orgId).is('revoked_at', null),
    sb.from('webhooks').update({ status: 'disabled' }).eq('org_id', input.orgId),
  ])
  const { data: org } = await sb
    .from('organizations')
    .select('name')
    .eq('id', input.orgId)
    .maybeSingle()
  if (org && !((org as { name: string }).name.startsWith('[SUSPENDED]'))) {
    await sb
      .from('organizations')
      .update({ name: `[SUSPENDED] ${(org as { name: string }).name}` })
      .eq('id', input.orgId)
  }
  const { recordAuditEvent } = await import('@/server/repositories/audit')
  await recordAuditEvent({
    org_id: input.orgId,
    actor_user_id: input.actorUserId,
    action: 'organization.suspended',
    resource_type: 'organization',
    resource_id: input.orgId,
  })
}

export interface FailingWebhookRow {
  id: string
  webhook_id: string
  webhook_url: string
  event_id: string
  event_type: string
  attempt: number
  http_status: number | null
  updated_at: string
}

export async function listFailingWebhookDeliveries(limit = 50): Promise<FailingWebhookRow[]> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('webhook_deliveries')
    .select('id, webhook_id, event_id, event_type, attempt, http_status, updated_at, webhooks!inner(url)')
    .eq('status', 'abandoned')
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`listFailingWebhookDeliveries: ${error.message}`)
  return (data ?? []).map((r) => {
    const row = r as {
      id: string
      webhook_id: string
      event_id: string
      event_type: string
      attempt: number
      http_status: number | null
      updated_at: string
      webhooks: { url?: string } | { url?: string }[]
    }
    const webhookUrl = Array.isArray(row.webhooks) ? row.webhooks[0]?.url : row.webhooks?.url
    return {
      id: row.id,
      webhook_id: row.webhook_id,
      webhook_url: webhookUrl ?? '',
      event_id: row.event_id,
      event_type: row.event_type,
      attempt: row.attempt,
      http_status: row.http_status,
      updated_at: row.updated_at,
    }
  })
}

export async function retryWebhookDelivery(input: { deliveryId: string; actorUserId: string }) {
  const sb = getServiceRoleClient()
  const { error } = await sb
    .from('webhook_deliveries')
    .update({ status: 'pending', next_retry_at: new Date().toISOString(), attempt: 0 })
    .eq('id', input.deliveryId)
  if (error) throw new Error(`retryWebhookDelivery: ${error.message}`)
  const { recordAuditEvent } = await import('@/server/repositories/audit')
  const { data: delivery } = await sb
    .from('webhook_deliveries')
    .select('webhook_id, webhooks!inner(org_id, project_id)')
    .eq('id', input.deliveryId)
    .maybeSingle()
  const wh = delivery
    ? ((delivery as { webhooks: { org_id?: string; project_id?: string } | { org_id?: string; project_id?: string }[] }).webhooks)
    : null
  const orgId = Array.isArray(wh) ? wh[0]?.org_id : wh?.org_id
  const projectId = Array.isArray(wh) ? wh[0]?.project_id : wh?.project_id
  if (orgId) {
    await recordAuditEvent({
      org_id: orgId,
      project_id: projectId ?? null,
      actor_user_id: input.actorUserId,
      action: 'webhook.retry_forced',
      resource_type: 'webhook_delivery',
      resource_id: input.deliveryId,
    })
  }
}

export async function systemHealth(): Promise<SystemHealth> {
  const sb = getServiceRoleClient()
  const start = Date.now()
  let pgOk = true
  let pgErr: string | undefined
  try {
    const { error } = await sb.from('organizations').select('*', { count: 'exact', head: true })
    if (error) throw error
  } catch (err) {
    pgOk = false
    pgErr = (err as Error).message
  }
  const pgLatency = Date.now() - start

  const [{ count: pending }, { data: oldest }, { count: suppressions }] = await Promise.all([
    sb
      .from('webhook_deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    sb
      .from('webhook_deliveries')
      .select('created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1),
    sb
      .from('suppressions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
  ])

  return {
    postgres: { ok: pgOk, latency_ms: pgLatency, ...(pgErr ? { error: pgErr } : {}) },
    pendingWebhookDeliveries: pending ?? 0,
    oldestPendingWebhookAt: (oldest as { created_at: string }[] | null)?.[0]?.created_at ?? null,
    suppressionsLast24h: suppressions ?? 0,
  }
}
