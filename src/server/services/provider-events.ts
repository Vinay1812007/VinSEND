// Ingest delivery events from external providers.
//
// SES/SNS format: JSON with an outer envelope { Type, Message, ... } where
// Message is a JSON-encoded string of the actual SES notification. Inside
// that: mail.tags["vinsend_id"] links back to our email.public_id.

import { getServiceRoleClient } from '@/lib/db/service'
import { logger } from '@/lib/logger'
import { addSuppression } from '@/server/repositories/suppressions'
import { enqueueEventForProject } from '@/server/services/webhook-events'

export type NormalizedProviderEvent = {
  vinsendMessageId: string | null
  eventType: 'delivered' | 'bounce' | 'complaint' | 'open' | 'click' | 'reject' | 'send' | 'unknown'
  hardBounce: boolean
  affectedRecipients: string[]
  providerEventId: string | null
  raw: Record<string, unknown>
}

/**
 * Normalize a single SES event. Returns null when the payload doesn't look
 * like an SES delivery notification (probably an SNS subscription
 * confirmation or a foreign shape).
 */
export function normalizeSesEvent(payload: Record<string, unknown>): NormalizedProviderEvent | null {
  const eventTypeRaw = (payload.eventType ?? payload.notificationType) as string | undefined
  if (!eventTypeRaw) return null
  const mail = (payload.mail ?? {}) as {
    messageId?: string
    tags?: Record<string, string[] | string>
  }

  const tags = mail.tags ?? {}
  const rawTag = tags.vinsend_id
  const vinsendMessageId = Array.isArray(rawTag) ? rawTag[0] ?? null : (rawTag as string) ?? null

  const et = eventTypeRaw.toLowerCase()
  let normalized: NormalizedProviderEvent['eventType'] = 'unknown'
  let hardBounce = false
  let affected: string[] = []

  if (et === 'delivery') {
    normalized = 'delivered'
    affected = ((payload.delivery as { recipients?: string[] })?.recipients ?? []) as string[]
  } else if (et === 'bounce') {
    normalized = 'bounce'
    const bounce = payload.bounce as {
      bounceType?: string
      bouncedRecipients?: Array<{ emailAddress: string }>
    }
    hardBounce = (bounce?.bounceType ?? '').toLowerCase() === 'permanent'
    affected = (bounce?.bouncedRecipients ?? []).map((r) => r.emailAddress)
  } else if (et === 'complaint') {
    normalized = 'complaint'
    affected = (
      (payload.complaint as { complainedRecipients?: Array<{ emailAddress: string }> })
        ?.complainedRecipients ?? []
    ).map((r) => r.emailAddress)
  } else if (et === 'open') {
    normalized = 'open'
  } else if (et === 'click') {
    normalized = 'click'
  } else if (et === 'reject') {
    normalized = 'reject'
  } else if (et === 'send') {
    normalized = 'send'
  }

  return {
    vinsendMessageId,
    eventType: normalized,
    hardBounce,
    affectedRecipients: affected,
    providerEventId: mail.messageId ?? null,
    raw: payload,
  }
}

/**
 * Apply a normalized event to the persisted state:
 *   - insert an email_events row (deduped by provider_event_id if present)
 *   - update the email's status projection
 *   - insert suppression rows for hard bounces + complaints
 *   - enqueue a VinSEND webhook event for the corresponding email.* type
 */
export async function applyProviderEvent(event: NormalizedProviderEvent): Promise<{
  applied: boolean
  reason?: string
}> {
  if (!event.vinsendMessageId) return { applied: false, reason: 'missing_vinsend_id' }
  const sb = getServiceRoleClient()
  const { data: emailRow } = await sb
    .from('emails')
    .select('id, project_id, org_id, status')
    .eq('public_id', event.vinsendMessageId)
    .maybeSingle()
  if (!emailRow) return { applied: false, reason: 'email_not_found' }

  const email = emailRow as { id: string; project_id: string; org_id: string; status: string }
  const vinsendType = `email.${
    event.eventType === 'bounce'
      ? 'bounced'
      : event.eventType === 'complaint'
        ? 'complained'
        : event.eventType === 'delivered'
          ? 'delivered'
          : event.eventType === 'open'
            ? 'opened'
            : event.eventType === 'click'
              ? 'clicked'
              : event.eventType === 'reject'
                ? 'rejected'
                : event.eventType === 'send'
                  ? 'sent'
                  : 'unknown'
  }`

  // Insert the event (dedup on provider_event_id + email_id).
  const { error: evErr } = await sb.from('email_events').insert({
    email_id: email.id,
    type: vinsendType,
    provider_event_id: event.providerEventId,
    payload: { affected: event.affectedRecipients, hard_bounce: event.hardBounce },
  })
  // A unique-constraint violation on provider_event_id is expected on retries.
  if (evErr && !/duplicate key/i.test(evErr.message)) {
    logger.warn('provider_event.insert_failed', { err: evErr.message })
  }

  // Update status projection for the terminal event types.
  const terminalMap: Record<string, string | undefined> = {
    'email.delivered': 'delivered',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
    'email.rejected': 'rejected',
  }
  const newStatus = terminalMap[vinsendType]
  if (newStatus) {
    await sb.from('emails').update({ status: newStatus }).eq('id', email.id)
    // And the affected recipients.
    if (event.affectedRecipients.length) {
      await sb
        .from('email_recipients')
        .update({ status: newStatus })
        .eq('email_id', email.id)
        .in('address', event.affectedRecipients.map((a) => a.toLowerCase()))
    }
  }

  // Auto-suppress hard bounces + complaints.
  if (event.eventType === 'bounce' && event.hardBounce) {
    for (const addr of event.affectedRecipients) {
      await addSuppression({
        project_id: email.project_id,
        org_id: email.org_id,
        email: addr,
        reason: 'hard_bounce',
        source: 'webhook_event',
      })
    }
  } else if (event.eventType === 'complaint') {
    for (const addr of event.affectedRecipients) {
      await addSuppression({
        project_id: email.project_id,
        org_id: email.org_id,
        email: addr,
        reason: 'complaint',
        source: 'webhook_event',
      })
    }
  }

  // Fan out to VinSEND webhooks.
  void enqueueEventForProject({
    projectId: email.project_id,
    eventType: vinsendType,
    data: { email_id: event.vinsendMessageId, recipients: event.affectedRecipients },
  })

  return { applied: true }
}
