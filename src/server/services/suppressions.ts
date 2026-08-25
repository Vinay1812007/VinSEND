import {
  addSuppression,
  isSuppressed,
  listSuppressions,
  removeSuppression,
  type SuppressionRow,
} from '@/server/repositories/suppressions'
import { recordAuditEvent } from '@/server/repositories/audit'
import { ApiError } from '@/server/services/errors'

export async function createSuppression(input: {
  projectId: string
  orgId: string
  email: string
  reason: 'manual' | 'unsubscribe'
  notes?: string | null
  actorUserId?: string | null
}): Promise<SuppressionRow> {
  const row = await addSuppression({
    project_id: input.projectId,
    org_id: input.orgId,
    email: input.email,
    reason: input.reason,
    source: 'manual',
    notes: input.notes ?? null,
  })
  await recordAuditEvent({
    org_id: input.orgId,
    project_id: input.projectId,
    actor_user_id: input.actorUserId ?? null,
    action: 'suppression.added',
    resource_type: 'suppression',
    resource_id: row.id,
    metadata: { email_domain: row.email.split('@').pop() ?? '' },
  })
  return row
}

export async function deleteSuppression(input: {
  projectId: string
  orgId: string
  email: string
  actorUserId?: string | null
}) {
  const result = await removeSuppression(input.projectId, input.email)
  if (!result.removed && result.reason === 'protected_reason') {
    throw new ApiError(
      'conflict',
      'This suppression was created from a bounce or complaint event and cannot be removed via the API. Remove it from the dashboard with a documented reason.',
    )
  }
  if (!result.removed) throw new ApiError('not_found', 'Suppression not found', 404)
  await recordAuditEvent({
    org_id: input.orgId,
    project_id: input.projectId,
    actor_user_id: input.actorUserId ?? null,
    action: 'suppression.removed',
    resource_type: 'suppression',
    resource_id: input.email,
  })
}

export async function addSuppressionFromUnsubscribe(input: {
  projectId: string
  orgId: string
  email: string
}): Promise<SuppressionRow> {
  return addSuppression({
    project_id: input.projectId,
    org_id: input.orgId,
    email: input.email,
    reason: 'unsubscribe',
    source: 'system',
  })
}

export { listSuppressions, isSuppressed }
