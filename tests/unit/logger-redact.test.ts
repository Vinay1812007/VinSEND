import { describe, expect, it } from 'vitest'
import { __internal } from '@/lib/logger'

const { redact } = __internal

describe('logger redaction', () => {
  it('redacts known sensitive keys', () => {
    const out = redact({
      user: 'ada',
      password: 'hunter2',
      api_key: 'vs_live_xxxx',
      nested: { signing_secret: 'shhh' },
    }) as Record<string, unknown>
    expect(out.user).toBe('ada')
    expect(out.password).toBe('[REDACTED]')
    expect(out.api_key).toBe('[REDACTED]')
    expect((out.nested as { signing_secret: string }).signing_secret).toBe('[REDACTED]')
  })

  it('redacts values that look like secrets', () => {
    const out = redact({ note: 'called with vs_live_ABCDEFGHIJKLMNOPQRSTUVWXYZ012345' })
    // The literal value must NOT appear.
    expect(out).toEqual({ note: '[REDACTED]' })
  })

  it('handles arrays', () => {
    const out = redact([{ password: 'x' }, 'safe']) as unknown[]
    expect((out[0] as Record<string, string>).password).toBe('[REDACTED]')
    expect(out[1]).toBe('safe')
  })
})
