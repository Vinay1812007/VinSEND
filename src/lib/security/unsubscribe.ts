// Signed unsubscribe tokens. Format: base64url(payload) . base64url(hmac).
// Payload is JSON: { p: project_id, e: email, exp: unix_seconds }.
// Signed with a key derived from SECRET_ENCRYPTION_KEY.

import { createHmac, hkdfSync, timingSafeEqual } from 'node:crypto'
import { serverEnv } from '@/lib/validation/env'

const TOKEN_TTL_SECONDS = 365 * 24 * 3600 // 1 year — links live in inboxes

function signingKey(): Buffer {
  const master = Buffer.from(serverEnv().SECRET_ENCRYPTION_KEY, 'base64').subarray(0, 32)
  return Buffer.from(hkdfSync('sha256', master, Buffer.alloc(0), Buffer.from('unsubscribe'), 32))
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

export function issueUnsubscribeToken(input: { projectId: string; email: string }): string {
  const payload = {
    p: input.projectId,
    e: input.email.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  }
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'))
  const mac = b64url(createHmac('sha256', signingKey()).update(body, 'utf8').digest())
  return `${body}.${mac}`
}

export interface UnsubPayload {
  projectId: string
  email: string
  expiresAt: number
}

export function verifyUnsubscribeToken(token: string): UnsubPayload | null {
  const [body, mac] = token.split('.')
  if (!body || !mac) return null
  const expected = createHmac('sha256', signingKey()).update(body, 'utf8').digest()
  const given = fromB64url(mac)
  if (expected.length !== given.length) return null
  try {
    if (!timingSafeEqual(expected, given)) return null
  } catch {
    return null
  }
  try {
    const payload = JSON.parse(fromB64url(body).toString('utf8')) as {
      p?: string
      e?: string
      exp?: number
    }
    if (!payload.p || !payload.e || !payload.exp) return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return { projectId: payload.p, email: payload.e, expiresAt: payload.exp }
  } catch {
    return null
  }
}
