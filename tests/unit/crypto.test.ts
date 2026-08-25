import { describe, expect, it } from 'vitest'
import { decryptJson, decryptSecret, encryptJson, encryptSecret } from '@/lib/security/crypto'

describe('crypto', () => {
  it('round-trips a string', () => {
    const packed = encryptSecret('super-secret', 'test:1')
    expect(packed[0]).toBe(0x01)
    expect(decryptSecret(packed, 'test:1')).toBe('super-secret')
  })

  it('round-trips an object', () => {
    const obj = { host: 'smtp.example.com', port: 587, secure: false, password: 'pw' }
    const packed = encryptJson(obj, 'provider:x:y')
    const back = decryptJson<typeof obj>(packed, 'provider:x:y')
    expect(back).toEqual(obj)
  })

  it('rejects wrong scope (auth tag mismatch)', () => {
    const packed = encryptSecret('sensitive', 'scope-a')
    expect(() => decryptSecret(packed, 'scope-b')).toThrow()
  })

  it('produces distinct ciphertexts for the same plaintext (fresh IV)', () => {
    const a = encryptSecret('hello', 'x')
    const b = encryptSecret('hello', 'x')
    expect(a.equals(b)).toBe(false)
  })
})
