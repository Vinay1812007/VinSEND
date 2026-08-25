import { describe, expect, it } from 'vitest'
import { MAX_ATTEMPTS, nextRetrySeconds } from '@/lib/webhooks/dispatcher'

describe('webhook retry backoff', () => {
  it('returns 30s for the first retry, 24h for the last', () => {
    expect(nextRetrySeconds(0)).toBe(30)
    expect(nextRetrySeconds(1)).toBe(120)
    expect(nextRetrySeconds(2)).toBe(600)
    expect(nextRetrySeconds(3)).toBe(3600)
    expect(nextRetrySeconds(4)).toBe(21600)
    expect(nextRetrySeconds(5)).toBe(86400)
  })

  it('returns null past the last retry slot', () => {
    expect(nextRetrySeconds(6)).toBe(null)
    expect(nextRetrySeconds(99)).toBe(null)
    expect(nextRetrySeconds(-1)).toBe(null)
  })

  it('MAX_ATTEMPTS = initial + 6 backoffs', () => {
    expect(MAX_ATTEMPTS).toBe(7)
  })
})
