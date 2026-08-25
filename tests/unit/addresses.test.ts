import { describe, expect, it } from 'vitest'
import { parseAddress, parseAddressList, validateHeaderValue } from '@/lib/security/addresses'

describe('address parser', () => {
  it('parses bare addresses', () => {
    const a = parseAddress('user@example.com')
    expect(a.address).toBe('user@example.com')
    expect(a.domain).toBe('example.com')
    expect(a.name).toBe(null)
  })

  it('parses Name <addr> form', () => {
    const a = parseAddress('"Ada Lovelace" <ada@example.com>')
    expect(a.name).toBe('Ada Lovelace')
    expect(a.address).toBe('ada@example.com')
  })

  it('rejects invalid addresses', () => {
    expect(() => parseAddress('nope')).toThrow()
    expect(() => parseAddress('bad@')).toThrow()
    expect(() => parseAddress('@bad.com')).toThrow()
  })

  it('rejects control characters (CR/LF injection)', () => {
    expect(() => parseAddress('user@example.com\r\nBcc: attacker@evil.com')).toThrow()
  })

  it('parses a list', () => {
    const list = parseAddressList(['a@x.com', 'b@y.com'])
    expect(list).toHaveLength(2)
  })
})

describe('header value validation', () => {
  it('accepts printable ASCII', () => {
    expect(() => validateHeaderValue('X-Foo', 'bar')).not.toThrow()
  })

  it('rejects CR/LF', () => {
    expect(() => validateHeaderValue('X-Foo', 'bar\r\nBcc: evil')).toThrow()
  })

  it('rejects control characters', () => {
    expect(() => validateHeaderValue('X-Foo', 'bar\x01baz')).toThrow()
  })
})
