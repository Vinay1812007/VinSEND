import { getServiceRoleClient } from '@/lib/db/service'

export interface WebhookDeliveryRow {
  id: string
  webhook_id: string
  event_id: string
  event_type: string
  payload: Record<string, unknown>
  attempt: number
  status: 'pending' | 'delivered' | 'failed' | 'abandoned'
  http_status: number | null
  next_retry_at: string | null
  delivered_at: string | null
  created_at: string
  updated_at: string
}

export async function enqueueDelivery(input: {
  webhook_id: string
  event_id: string
  event_type: string
  payload: Record<string, unknown>
  next_retry_at?: Date | null
}): Promise<WebhookDeliveryRow> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('webhook_deliveries')
    .insert({
      webhook_id: input.webhook_id,
      event_id: input.event_id,
      event_type: input.event_type,
      payload: input.payload,
      status: 'pending',
      attempt: 0,
      next_retry_at: (input.next_retry_at ?? new Date()).toISOString(),
    })
    .select('*')
    .single()
  if (error || !data) throw new Error(`enqueueDelivery: ${error?.message}`)
  return data as WebhookDeliveryRow
}

export async function markDelivered(id: string, httpStatus: number): Promise<void> {
  const sb = getServiceRoleClient()
  const { error } = await sb
    .from('webhook_deliveries')
    .update({
      status: 'delivered',
      http_status: httpStatus,
      delivered_at: new Date().toISOString(),
      next_retry_at: null,
    })
    .eq('id', id)
  if (error) throw new Error(`markDelivered: ${error.message}`)
}

export async function markFailedRetry(input: {
  id: string
  attempt: number
  httpStatus: number | null
  nextRetryAt: Date | null
  abandon: boolean
}): Promise<void> {
  const sb = getServiceRoleClient()
  const { error } = await sb
    .from('webhook_deliveries')
    .update({
      attempt: input.attempt,
      http_status: input.httpStatus,
      status: input.abandon ? 'abandoned' : 'pending',
      next_retry_at: input.nextRetryAt?.toISOString() ?? null,
    })
    .eq('id', input.id)
  if (error) throw new Error(`markFailedRetry: ${error.message}`)
}

export async function claimDueDeliveries(limit = 25): Promise<WebhookDeliveryRow[]> {
  const sb = getServiceRoleClient()
  const nowIso = new Date().toISOString()
  const { data, error } = await sb
    .from('webhook_deliveries')
    .select('*')
    .eq('status', 'pending')
    .lte('next_retry_at', nowIso)
    .order('next_retry_at', { ascending: true })
    .limit(limit)
  if (error) throw new Error(`claimDueDeliveries: ${error.message}`)
  return (data ?? []) as WebhookDeliveryRow[]
}

export async function listDeliveriesByWebhook(
  webhookId: string,
  limit = 50,
): Promise<WebhookDeliveryRow[]> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('webhook_deliveries')
    .select('*')
    .eq('webhook_id', webhookId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`listDeliveriesByWebhook: ${error.message}`)
  return (data ?? []) as WebhookDeliveryRow[]
}
