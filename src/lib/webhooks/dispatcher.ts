// Webhook dispatcher.
//
// Attempts to POST a signed payload to a webhook URL. On failure, schedules
// the next retry with exponential backoff. The retry sweep worker
// (`src/server/workers/webhook-retry.ts`) picks up pending deliveries whose
// next_retry_at has arrived.

import { logger } from '@/lib/logger'
import { signWebhook } from '@/lib/webhooks/signer'
import { serverEnv } from '@/lib/validation/env'

export interface AttemptInput {
  url: string
  secret: string
  eventId: string
  body: string
  timeoutMs?: number
}

export type AttemptResult =
  | { ok: true; httpStatus: number }
  | { ok: false; httpStatus: number | null; error: string; retryable: boolean }

// Retry cadence (seconds from the last attempt): 30s, 2m, 10m, 1h, 6h, 24h.
const BACKOFF_SECONDS = [30, 120, 600, 3600, 21_600, 86_400] as const

export function nextRetrySeconds(attempt: number): number | null {
  if (attempt < 0) return null
  if (attempt >= BACKOFF_SECONDS.length) return null
  return BACKOFF_SECONDS[attempt] ?? null
}

export const MAX_ATTEMPTS = BACKOFF_SECONDS.length + 1 // initial + N retries

export async function attemptDelivery(input: AttemptInput): Promise<AttemptResult> {
  const timestamp = Math.floor(Date.now() / 1000)
  const signed = signWebhook({
    eventId: input.eventId,
    secret: input.secret,
    timestamp,
    body: input.body,
  })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 10_000)
  try {
    const response = await fetch(input.url, {
      method: 'POST',
      headers: {
        ...signed.headers,
        'User-Agent': serverEnv().WEBHOOK_USER_AGENT,
      },
      body: signed.body,
      signal: controller.signal,
    })
    if (response.status >= 200 && response.status < 300) {
      return { ok: true, httpStatus: response.status }
    }
    // 5xx is retryable; 4xx (non-429) stops after one attempt.
    const retryable = response.status >= 500 || response.status === 429
    return {
      ok: false,
      httpStatus: response.status,
      error: `HTTP ${response.status}`,
      retryable,
    }
  } catch (err) {
    const msg = (err as Error).name === 'AbortError' ? 'request timed out' : (err as Error).message
    logger.warn('webhook.dispatch.error', { url: safeHost(input.url), err: msg })
    return { ok: false, httpStatus: null, error: msg, retryable: true }
  } finally {
    clearTimeout(timeout)
  }
}

function safeHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return 'unknown'
  }
}
