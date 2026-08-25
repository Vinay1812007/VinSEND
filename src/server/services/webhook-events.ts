// Event enqueue + retry cycle. Called from the send pipeline (fire-and-forget)
// after an email transitions to sent / failed / delivered / etc.

import { publicId } from '@/lib/ids'
import { logger } from '@/lib/logger'
import { attemptDelivery, MAX_ATTEMPTS, nextRetrySeconds } from '@/lib/webhooks/dispatcher'
import { getServiceRoleClient } from '@/lib/db/service'
import { loadWebhookSecret } from '@/server/repositories/webhooks'
import {
  claimDueDeliveries,
  enqueueDelivery,
  listDeliveriesByWebhook,
  markDelivered,
  markFailedRetry,
} from '@/server/repositories/webhook-deliveries'

export interface EnqueueEventInput {
  projectId: string
  eventType: string
  data: Record<string, unknown>
}

/**
 * Enqueue an event for every webhook subscribed to it.
 * Best-effort — errors are logged, never thrown at the caller.
 */
export async function enqueueEventForProject(input: EnqueueEventInput): Promise<number> {
  try {
    const sb = getServiceRoleClient()
    const { data: webhooks, error } = await sb
      .from('webhooks')
      .select('id, events, status')
      .eq('project_id', input.projectId)
      .eq('status', 'active')
    if (error) throw error

    const eventId = publicId('evt')
    const created = (new Date()).toISOString()
    const envelope = {
      id: eventId,
      type: input.eventType,
      created_at: created,
      data: input.data,
    }

    let count = 0
    for (const w of webhooks ?? []) {
      const row = w as { id: string; events: string[] }
      if (!row.events.includes(input.eventType)) continue
      await enqueueDelivery({
        webhook_id: row.id,
        event_id: eventId,
        event_type: input.eventType,
        payload: envelope,
      })
      count++
    }
    return count
  } catch (err) {
    logger.warn('webhook.enqueue.error', {
      project_id: input.projectId,
      event_type: input.eventType,
      err: (err as Error).message,
    })
    return 0
  }
}

export interface SweepResult {
  processed: number
  delivered: number
  retried: number
  abandoned: number
}

/**
 * Attempts one round of due deliveries. Called by the /api/internal/webhooks/sweep
 * endpoint (invoked from a cron / Render cron / external scheduler).
 */
export async function sweepWebhookDeliveries(limit = 25): Promise<SweepResult> {
  const due = await claimDueDeliveries(limit)
  let delivered = 0
  let retried = 0
  let abandoned = 0

  for (const d of due) {
    try {
      const { data: webhookRow, error } = await getServiceRoleClient()
        .from('webhooks')
        .select('id, project_id, url')
        .eq('id', d.webhook_id)
        .maybeSingle()
      if (error || !webhookRow) {
        await markFailedRetry({ id: d.id, attempt: d.attempt + 1, httpStatus: null, nextRetryAt: null, abandon: true })
        abandoned++
        continue
      }
      const secret = await loadWebhookSecret(
        (webhookRow as { project_id: string }).project_id,
        d.webhook_id,
      )
      const result = await attemptDelivery({
        url: (webhookRow as { url: string }).url,
        secret,
        eventId: d.event_id,
        body: JSON.stringify(d.payload),
      })
      if (result.ok) {
        await markDelivered(d.id, result.httpStatus)
        delivered++
      } else {
        const attempt = d.attempt + 1
        const nextSecs = result.retryable ? nextRetrySeconds(d.attempt) : null
        const abandon = !result.retryable || attempt >= MAX_ATTEMPTS
        await markFailedRetry({
          id: d.id,
          attempt,
          httpStatus: result.httpStatus,
          nextRetryAt: abandon || nextSecs === null ? null : new Date(Date.now() + nextSecs * 1000),
          abandon,
        })
        if (abandon) abandoned++
        else retried++
      }
    } catch (err) {
      logger.error('webhook.sweep.error', { id: d.id, err: (err as Error).message })
    }
  }
  return { processed: due.length, delivered, retried, abandoned }
}

export { listDeliveriesByWebhook }
