import { describe, expect, it } from 'vitest'
import { SendEmailSchema } from '@/lib/validation/emails'

describe('SendEmailSchema', () => {
  it('accepts a minimal request', () => {
    const r = SendEmailSchema.safeParse({
      from: 'a@example.com',
      to: ['b@example.com'],
      subject: 'hi',
      html: '<p>hi</p>',
    })
    expect(r.success).toBe(true)
  })

  it('requires html or text', () => {
    const r = SendEmailSchema.safeParse({
      from: 'a@example.com',
      to: ['b@example.com'],
      subject: 'hi',
    })
    expect(r.success).toBe(false)
  })

  it('rejects empty to list', () => {
    const r = SendEmailSchema.safeParse({
      from: 'a@example.com',
      to: [],
      subject: 'hi',
      html: '<p>hi</p>',
    })
    expect(r.success).toBe(false)
  })

  it('caps recipient count', () => {
    const many = Array.from({ length: 51 }, (_, i) => `u${i}@example.com`)
    const r = SendEmailSchema.safeParse({
      from: 'a@example.com',
      to: many,
      subject: 'hi',
      html: 'x',
    })
    expect(r.success).toBe(false)
  })
})
