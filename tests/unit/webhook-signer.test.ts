import { describe, expect, it } from 'vitest'
import { generateSigningSecret, signWebhook, verifyWebhookSignature } from '@/lib/webhooks/signer'

describe('webhook signer', () => {
  it('generates a prefixed secret', () => {
    const s = generateSigningSecret()
    expect(s.startsWith('whsec_')).toBe(true)
    expect(s.length).toBeGreaterThan(20)
  })

  it('sign + verify round-trip', () => {
    const secret = generateSigningSecret()
    const body = JSON.stringify({ id: 'evt_1', type: 'email.sent' })
    const timestamp = Math.floor(Date.now() / 1000)
    const signed = signWebhook({ eventId: 'evt_1', secret, timestamp, body })
    const res = verifyWebhookSignature({
      secret,
      eventId: 'evt_1',
      timestamp,
      body,
      signatureHeader: signed.headers['VinSEND-Webhook-Signature']!,
    })
    expect(res.ok).toBe(true)
  })

  it('rejects a tampered body', () => {
    const secret = generateSigningSecret()
    const body = '{"a":1}'
    const timestamp = Math.floor(Date.now() / 1000)
    const signed = signWebhook({ eventId: 'e', secret, timestamp, body })
    const res = verifyWebhookSignature({
      secret,
      eventId: 'e',
      timestamp,
      body: '{"a":2}',
      signatureHeader: signed.headers['VinSEND-Webhook-Signature']!,
    })
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('signature_mismatch')
  })

  it('rejects out-of-tolerance timestamp (replay)', () => {
    const secret = generateSigningSecret()
    const body = '{}'
    const timestamp = 1_000_000
    const signed = signWebhook({ eventId: 'e', secret, timestamp, body })
    const res = verifyWebhookSignature({
      secret,
      eventId: 'e',
      timestamp,
      body,
      signatureHeader: signed.headers['VinSEND-Webhook-Signature']!,
      nowSeconds: timestamp + 10_000,
    })
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('timestamp_out_of_tolerance')
  })
})
