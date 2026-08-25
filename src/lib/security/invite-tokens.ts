// Invite token: 32 bytes base64url. Stored as SHA-256 hex.
// The plaintext token appears exactly once — in the invite URL the
// inviter shares with their teammate.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export function generateInviteToken(): string {
  return `inv_${randomBytes(32).toString('base64url')}`
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function safeCompareToken(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  } catch {
    return false
  }
}
