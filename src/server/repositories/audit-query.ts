import { getServiceRoleClient } from '@/lib/db/service'

export interface AuditRow {
  id: string
  org_id: string
  project_id: string | null
  actor_user_id: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export async function listAuditEventsByOrg(
  orgId: string,
  opts: { limit?: number } = {},
): Promise<AuditRow[]> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('audit_events')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(Math.min(opts.limit ?? 100, 500))
  if (error) throw new Error(`listAuditEventsByOrg: ${error.message}`)
  return (data ?? []) as AuditRow[]
}
