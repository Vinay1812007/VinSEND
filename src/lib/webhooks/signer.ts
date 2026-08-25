import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export interface SignedPayload {
  headers: Record<string, string>
  body: string
}

export function generateSigningSecret(): string {
  return `whsec_${randomBytes(32).toString('base64url')}`
}

export function signWebhook(input: {
  eventId: string
  secret: string
  timestamp: number
  body: string
}): SignedPayload {
  const signingInput = `${input.eventId}.${input.timestamp}.${input.body}`
  const mac = createHmac('sha256', input.secret).update(signingInput, 'utf8').digest('base64')
  return {
    body: input.body,
    headers: {
      'VinSEND-Webhook-Id': input.eventId,
      'VinSEND-Webhook-Timestamp': String(input.timestamp),
      'VinSEND-Webhook-Signature': `v1,sha256=${mac}`,
      'Content-Type': 'application/json',
    },
  }
}

export function verifyWebhookSignature(input: {
  secret: string
  eventId: string
  timestamp: number
  body: string
  signatureHeader: string
  toleranceSeconds?: number
  nowSeconds?: number
}): { ok: boolean; reason?: string } {
  const tolerance = input.toleranceSeconds ?? 300
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000)
  if (Math.abs(now - input.timestamp) > tolerance) {
    return { ok: false, reason: 'timestamp_out_of_tolerance' }
  }
  const m = input.signatureHeader.match(/^v1,sha256=(.+)$/)
  if (!m) return { ok: false, reason: 'invalid_signature_format' }
  const provided = Buffer.from(m[1]!, 'base64')
  const signingInput = `${input.eventId}.${input.timestamp}.${input.body}`
  const expected = createHmac('sha256', input.secret).update(signingInput, 'utf8').digest()
  if (provided.length !== expected.length) return { ok: false, reason: 'signature_length_mismatch' }
  const ok = timingSafeEqual(provided, expected)
  return ok ? { ok: true } : { ok: false, reason: 'signature_mismatch' }
}
