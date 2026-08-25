import { describe, expect, it } from 'vitest'
import {
  generateInviteToken,
  hashInviteToken,
  safeCompareToken,
} from '@/lib/security/invite-tokens'

describe('invite tokens', () => {
  it('generates a prefixed URL-safe token', () => {
    const t = generateInviteToken()
    expect(t.startsWith('inv_')).toBe(true)
    expect(/[+/=]/.test(t)).toBe(false) // no non-url-safe chars
    expect(t.length).toBeGreaterThan(30)
  })

  it('hashes deterministically', () => {
    const t = generateInviteToken()
    expect(hashInviteToken(t)).toBe(hashInviteToken(t))
    expect(hashInviteToken(t)).toHaveLength(64)
  })

  it('produces distinct hashes for distinct tokens', () => {
    expect(hashInviteToken(generateInviteToken())).not.toBe(hashInviteToken(generateInviteToken()))
  })

  it('safeCompareToken rejects length mismatch', () => {
    expect(safeCompareToken('abcd', 'abcde')).toBe(false)
    expect(safeCompareToken('abcd', 'abcd')).toBe(true)
  })
})
