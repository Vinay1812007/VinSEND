// Rate-limit interface + Postgres-backed adapter.
// The adapter is a thin wrapper over the `public.rate_limit_consume` SQL
// function so the same interface can move to Upstash Redis or Cloudflare KV
// in Phase 6 without touching callers.

import { getServiceRoleClient } from '@/lib/db/service'

export interface RateLimitResult {
  allowed: boolean
  count: number
  limit: number
  resetAt: Date
}

export interface RateLimiter {
  consume(input: {
    bucket: string
    windowSeconds: number
    limit: number
    cost?: number
  }): Promise<RateLimitResult>
}

class PostgresRateLimiter implements RateLimiter {
  async consume({
    bucket,
    windowSeconds,
    limit,
    cost = 1,
  }: {
    bucket: string
    windowSeconds: number
    limit: number
    cost?: number
  }): Promise<RateLimitResult> {
    const sb = getServiceRoleClient()
    const { data, error } = await sb.rpc('rate_limit_consume', {
      p_bucket: bucket,
      p_window_seconds: windowSeconds,
      p_limit: limit,
      p_cost: cost,
    })
    if (error) {
      // Fail-open: a broken rate limiter must not take down the API. The
      // logger records this.
      const { logger } = await import('@/lib/logger')
      logger.error('rate_limit.consume_failed', { bucket, err: error.message })
      return { allowed: true, count: 0, limit, resetAt: new Date(Date.now() + windowSeconds * 1000) }
    }
    const row = Array.isArray(data) ? data[0] : data
    if (!row) return { allowed: true, count: 0, limit, resetAt: new Date() }
    return {
      allowed: Boolean(row.allowed),
      count: Number(row.current_count ?? 0),
      limit,
      resetAt: new Date(row.reset_at as string),
    }
  }
}

let cached: RateLimiter | null = null

export function getRateLimiter(): RateLimiter {
  if (cached) return cached
  // Prefer Upstash if configured; fall back to the Postgres adapter otherwise.
  // Lazy require to keep the Upstash module out of the default hot path.
  try {
    const { upstashFromEnv } = require('./rate-limit-upstash') as {
      upstashFromEnv: () => RateLimiter | null
    }
    const up = upstashFromEnv()
    if (up) {
      cached = up
      return cached
    }
  } catch {
    // module missing — fall through
  }
  cached = new PostgresRateLimiter()
  return cached
}

// For testing.
export function _resetRateLimiterCache() {
  cached = null
}

// Preset buckets used by the /v1 layer.
export const RATE_LIMITS = {
  ipPerMinute: { windowSeconds: 60, limit: 60 },
  apiKeyPerMinute: { windowSeconds: 60, limit: 600 },
  projectPerHour: { windowSeconds: 3600, limit: 10_000 },
} as const
