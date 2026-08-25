import { describe, expect, it } from 'vitest'
import { isPublicId, parsePublicId, publicId } from '@/lib/ids'

describe('public ids', () => {
  it('generates prefixed ids', () => {
    const id = publicId('email')
    expect(id.startsWith('email_')).toBe(true)
    expect(parsePublicId(id)?.prefix).toBe('email')
  })

  it('validates prefix', () => {
    const id = publicId('domain')
    expect(isPublicId(id, 'domain')).toBe(true)
    expect(isPublicId(id, 'email')).toBe(false)
  })

  it('rejects malformed ids', () => {
    expect(parsePublicId('nope')).toBe(null)
    expect(parsePublicId('email_')).toBe(null)
    expect(parsePublicId('unknown_01k4h72q9m5xw8vz00000000ab')).toBe(null)
  })
})
