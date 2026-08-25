import { describe, expect, it } from 'vitest'
import { normalizeSmtpError } from '@/lib/email/errors'

describe('SMTP error normalization', () => {
  it('maps EAUTH to authentication_failed', () => {
    const e = normalizeSmtpError({ code: 'EAUTH', message: 'bad auth' })
    expect(e.code).toBe('authentication_failed')
    expect(e.retryable).toBe(false)
  })

  it('maps ECONNECTION to connection_failed', () => {
    const e = normalizeSmtpError({ code: 'ECONNECTION', message: 'no' })
    expect(e.code).toBe('connection_failed')
    expect(e.retryable).toBe(true)
  })

  it('maps 450 to temporary_failure', () => {
    const e = normalizeSmtpError({ responseCode: 450, message: 'try later' })
    expect(e.code).toBe('temporary_failure')
    expect(e.retryable).toBe(true)
  })

  it('maps 550 to recipient_rejected', () => {
    const e = normalizeSmtpError({ responseCode: 550, message: 'unknown user' })
    expect(e.code).toBe('recipient_rejected')
    expect(e.retryable).toBe(false)
  })

  it('falls back to unknown', () => {
    const e = normalizeSmtpError({ message: 'weird' })
    expect(e.code).toBe('unknown')
  })
})
