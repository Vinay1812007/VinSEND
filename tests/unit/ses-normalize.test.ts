import { describe, expect, it } from 'vitest'
import { normalizeSesError } from '@/lib/email/providers/ses'
import { normalizeSesEvent } from '@/server/services/provider-events'

describe('SES error normalization', () => {
  it('maps InvalidClientTokenId to authentication_failed', () => {
    const e = normalizeSesError({ name: 'InvalidClientTokenId', message: 'bad creds' })
    expect(e.code).toBe('authentication_failed')
  })

  it('maps ThrottlingException to rate_limited', () => {
    const e = normalizeSesError({ name: 'ThrottlingException', message: 'slow down' })
    expect(e.code).toBe('rate_limited')
    expect(e.retryable).toBe(true)
  })

  it('maps MessageRejected to recipient_rejected', () => {
    const e = normalizeSesError({ name: 'MessageRejected', message: 'no' })
    expect(e.code).toBe('recipient_rejected')
  })

  it('maps 5xx httpStatus to temporary_failure', () => {
    const e = normalizeSesError({ name: 'InternalServerError', $metadata: { httpStatusCode: 503 } })
    expect(e.code).toBe('temporary_failure')
    expect(e.retryable).toBe(true)
  })
})

describe('SES event normalization', () => {
  it('reads a Delivery event', () => {
    const evt = normalizeSesEvent({
      eventType: 'Delivery',
      mail: {
        messageId: 'ses-msg-1',
        tags: { vinsend_id: ['email_01k4h72q9m5xw8vz00000000ab'] },
      },
      delivery: { recipients: ['customer@example.com'] },
    })
    expect(evt).not.toBeNull()
    expect(evt!.eventType).toBe('delivered')
    expect(evt!.vinsendMessageId).toBe('email_01k4h72q9m5xw8vz00000000ab')
    expect(evt!.affectedRecipients).toEqual(['customer@example.com'])
  })

  it('reads a permanent Bounce as hardBounce', () => {
    const evt = normalizeSesEvent({
      notificationType: 'Bounce',
      mail: { tags: { vinsend_id: 'email_x' } },
      bounce: {
        bounceType: 'Permanent',
        bouncedRecipients: [{ emailAddress: 'nobody@example.com' }],
      },
    })
    expect(evt!.eventType).toBe('bounce')
    expect(evt!.hardBounce).toBe(true)
    expect(evt!.affectedRecipients).toEqual(['nobody@example.com'])
  })

  it('reads a Complaint', () => {
    const evt = normalizeSesEvent({
      eventType: 'Complaint',
      mail: { tags: { vinsend_id: 'email_x' } },
      complaint: {
        complainedRecipients: [{ emailAddress: 'angry@example.com' }],
      },
    })
    expect(evt!.eventType).toBe('complaint')
    expect(evt!.affectedRecipients).toEqual(['angry@example.com'])
  })

  it('returns null for unknown shapes', () => {
    expect(normalizeSesEvent({ foo: 'bar' })).toBeNull()
  })
})
