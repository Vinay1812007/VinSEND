import { describe, expect, it } from 'vitest'
import {
  extractEnvironment,
  extractPrefix,
  generateApiKey,
  hashApiKey,
  isValidKeyFormat,
  safeCompareHex,
} from '@/lib/security/api-keys'

describe('api-keys', () => {
  it('generates a valid live key', () => {
    const g = generateApiKey('live')
    expect(g.secret.startsWith('vs_live_')).toBe(true)
    expect(isValidKeyFormat(g.secret)).toBe(true)
    expect(g.prefix.startsWith('vs_live_')).toBe(true)
    expect(g.hash).toHaveLength(64)
    expect(g.environment).toBe('live')
  })

  it('generates a valid test key', () => {
    const g = generateApiKey('test')
    expect(g.secret.startsWith('vs_test_')).toBe(true)
    expect(g.environment).toBe('test')
  })

  it('hashes deterministically given the same pepper', () => {
    const g = generateApiKey('live')
    expect(hashApiKey(g.secret)).toBe(g.hash)
  })

  it('produces different hashes for different secrets', () => {
    const a = generateApiKey('live')
    const b = generateApiKey('live')
    expect(a.hash).not.toBe(b.hash)
    expect(a.secret).not.toBe(b.secret)
  })

  it('extracts prefix / environment', () => {
    const g = generateApiKey('live')
    expect(extractPrefix(g.secret)).toBe(g.prefix)
    expect(extractEnvironment(g.secret)).toBe('live')
  })

  it('rejects malformed keys', () => {
    expect(isValidKeyFormat('nope')).toBe(false)
    expect(isValidKeyFormat('vs_prod_xxx')).toBe(false)
    expect(isValidKeyFormat('vs_live_short')).toBe(false)
  })

  it('safeCompareHex is length-safe', () => {
    expect(safeCompareHex('abcd', 'abcde')).toBe(false)
    expect(safeCompareHex('abcd', 'abcd')).toBe(true)
    expect(safeCompareHex('abcd', 'abce')).toBe(false)
  })
})
