// Worker seam for the retry sweep. Called from an internal HTTP endpoint
// (`/api/internal/webhooks/sweep`) that a cron/scheduler pings.
// Kept as its own module so it can be lifted into a queue consumer later
// without changing the caller.

import { sweepWebhookDeliveries } from '@/server/services/webhook-events'

export async function runWebhookRetrySweep(limit = 25) {
  return sweepWebhookDeliveries(limit)
}
