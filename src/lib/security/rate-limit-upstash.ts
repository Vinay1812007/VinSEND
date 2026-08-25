// Upstash Redis rate-limit adapter.
// Uses Upstash's REST API (no client library required). Enabled when
// UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are both set.
//
// Semantics: fixed-window counter, same as the Postgres adapter, so the
// same buckets and limits work unchanged.

import type { RateLimiter, RateLimitResult } from './rate-limit'
import { logger } from '@/lib/logger'

interface UpstashPipelineResult<T> {
  result: T
}

export class UpstashRateLimiter implements RateLimiter {
  constructor(private baseUrl: string, private token: string) {}

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
    const nowSec = Math.floor(Date.now() / 1000)
    const windowStart = nowSec - (nowSec % windowSeconds)
    const key = `vs:rl:${bucket}:${windowStart}`
    try {
      // INCR + EXPIRE pipelined.
      const res = await fetch(`${this.baseUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCRBY', key, String(cost)],
          ['EXPIRE', key, String(windowSeconds + 5)],
        ]),
      })
      if (!res.ok) throw new Error(`upstash http ${res.status}`)
      const [incr] = (await res.json()) as [UpstashPipelineResult<number>, UpstashPipelineResult<number>]
      const count = incr?.result ?? 0
      const resetAt = new Date((windowStart + windowSeconds) * 1000)
      return { allowed: count <= limit, count, limit, resetAt }
    } catch (err) {
      // Fail-open, same as the Postgres adapter.
      logger.error('rate_limit.upstash_failed', { bucket, err: (err as Error).message })
      return {
        allowed: true,
        count: 0,
        limit,
        resetAt: new Date(Date.now() + windowSeconds * 1000),
      }
    }
  }
}

export function upstashFromEnv(): UpstashRateLimiter | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new UpstashRateLimiter(url, token)
}
