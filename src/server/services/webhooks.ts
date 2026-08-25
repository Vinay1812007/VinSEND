import { publicId } from '@/lib/ids'
import { generateSigningSecret } from '@/lib/webhooks/signer'
import {
  createWebhook,
  deleteWebhook,
  listWebhooks,
  patchWebhook,
  rotateWebhookSecret,
  type WebhookRow,
} from '@/server/repositories/webhooks'
import { recordAuditEvent } from '@/server/repositories/audit'
import { ApiError } from '@/server/services/errors'

const ALLOWED_EVENTS = [
  'email.queued',
  'email.sent',
  'email.delivered',
  'email.deferred',
  'email.bounced',
  'email.complained',
  'email.opened',
  'email.clicked',
  'email.failed',
  'email.rejected',
]

export interface CreatedWebhook {
  row: WebhookRow
  /** Full plaintext signing secret. Shown once. */
  secret: string
}

export async function registerWebhook(input: {
  projectId: string
  orgId: string
  actorUserId?: string | null
  url: string
  events: string[]
}): Promise<CreatedWebhook> {
  const invalid = input.events.filter((e) => !ALLOWED_EVENTS.includes(e))
  if (invalid.length) {
    throw new ApiError('validation_error', `Unknown event types: ${invalid.join(', ')}`, 400)
  }
  const secret = generateSigningSecret()
  const row = await createWebhook({
    project_id: input.projectId,
    org_id: input.orgId,
    public_id: publicId('wh'),
    url: input.url,
    events: input.events,
    secret,
  })
  await recordAuditEvent({
    org_id: input.orgId,
    project_id: input.projectId,
    actor_user_id: input.actorUserId ?? null,
    action: 'webhook.created',
    resource_type: 'webhook',
    resource_id: row.public_id,
    metadata: { url: input.url, events: input.events },
  })
  return { row, secret }
}

export async function removeWebhook(input: {
  projectId: string
  orgId: string
  publicId: string
  actorUserId?: string | null
}) {
  const removed = await deleteWebhook(input.projectId, input.publicId)
  if (!removed) throw new ApiError('not_found', 'Webhook not found', 404)
  await recordAuditEvent({
    org_id: input.orgId,
    project_id: input.projectId,
    actor_user_id: input.actorUserId ?? null,
    action: 'webhook.deleted',
    resource_type: 'webhook',
    resource_id: input.publicId,
  })
}

export async function rotateSigningSecret(input: {
  projectId: string
  orgId: string
  publicId: string
  actorUserId?: string | null
}): Promise<string> {
  const secret = generateSigningSecret()
  const updated = await rotateWebhookSecret({
    projectId: input.projectId,
    publicId: input.publicId,
    newSecret: secret,
  })
  if (!updated) throw new ApiError('not_found', 'Webhook not found', 404)
  await recordAuditEvent({
    org_id: input.orgId,
    project_id: input.projectId,
    actor_user_id: input.actorUserId ?? null,
    action: 'webhook.secret_rotated',
    resource_type: 'webhook',
    resource_id: input.publicId,
  })
  return secret
}

export async function updateWebhook(input: {
  projectId: string
  orgId: string
  publicId: string
  actorUserId?: string | null
  url?: string
  events?: string[]
  status?: 'active' | 'paused' | 'disabled'
}): Promise<WebhookRow> {
  if (input.events) {
    const invalid = input.events.filter((e) => !ALLOWED_EVENTS.includes(e))
    if (invalid.length)
      throw new ApiError('validation_error', `Unknown event types: ${invalid.join(', ')}`, 400)
  }
  const row = await patchWebhook({
    projectId: input.projectId,
    publicId: input.publicId,
    url: input.url,
    events: input.events,
    status: input.status,
  })
  if (!row) throw new ApiError('not_found', 'Webhook not found', 404)
  await recordAuditEvent({
    org_id: input.orgId,
    project_id: input.projectId,
    actor_user_id: input.actorUserId ?? null,
    action: 'webhook.updated',
    resource_type: 'webhook',
    resource_id: input.publicId,
    metadata: {
      url_changed: input.url !== undefined,
      events_changed: input.events !== undefined,
      status: input.status,
    },
  })
  return row
}

export { listWebhooks }
