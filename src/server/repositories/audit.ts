import { getServiceRoleClient } from '@/lib/db/service'

export interface AuditEventInsert {
  org_id: string
  project_id?: string | null
  actor_user_id?: string | null
  action: string
  resource_type?: string | null
  resource_id?: string | null
  metadata?: Record<string, unknown>
}

export async function recordAuditEvent(input: AuditEventInsert): Promise<void> {
  const sb = getServiceRoleClient()
  const { error } = await sb.from('audit_events').insert({
    org_id: input.org_id,
    project_id: input.project_id ?? null,
    actor_user_id: input.actor_user_id ?? null,
    action: input.action,
    resource_type: input.resource_type ?? null,
    resource_id: input.resource_id ?? null,
    metadata: input.metadata ?? {},
  })
  if (error) {
    // Don't fail the caller for audit errors.
    // eslint-disable-next-line no-console
    console.error('audit:', error.message)
  }
}
