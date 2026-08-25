// API-key generation and verification.
//
// Format:  vs_(live|test)_<32 base62 chars>
// Prefix:  first 12 chars after the environment token, plus the environment
//          token itself. Stored for lookup.
// Hash:    SHA-256( full_secret || pepper ), hex.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { serverEnv } from '@/lib/validation/env'

const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const SECRET_LEN = 32

export type Environment = 'live' | 'test'

export interface GeneratedApiKey {
  /** The full plaintext key. Show to the caller once, never store. */
  secret: string
  /** Public prefix stored in DB for lookup. */
  prefix: string
  /** Hash stored in DB. */
  hash: string
  environment: Environment
}

function base62(len: number): string {
  const bytes = randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) {
    // Bias is negligible for cryptographic key generation over 32 chars.
    const idx = bytes[i]! % BASE62.length
    out += BASE62[idx]
  }
  return out
}

function pepperKey(secret: string): Buffer {
  const pepper = Buffer.from(serverEnv().API_KEY_PEPPER, 'base64')
  const h = createHash('sha256')
  h.update(secret, 'utf8')
  h.update(pepper)
  return h.digest()
}

export function generateApiKey(environment: Environment = 'live'): GeneratedApiKey {
  const raw = base62(SECRET_LEN)
  const secret = `vs_${environment}_${raw}`
  const prefix = `vs_${environment}_${raw.slice(0, 8)}`
  const hash = pepperKey(secret).toString('hex')
  return { secret, prefix, hash, environment }
}

export function hashApiKey(secret: string): string {
  return pepperKey(secret).toString('hex')
}

export function extractPrefix(secret: string): string | null {
  const m = secret.match(/^vs_(live|test)_([A-Za-z0-9]{8})/)
  if (!m) return null
  return `vs_${m[1]}_${m[2]}`
}

export function extractEnvironment(secret: string): Environment | null {
  const m = secret.match(/^vs_(live|test)_/)
  if (!m) return null
  return m[1] as Environment
}

export function isValidKeyFormat(secret: string): boolean {
  return /^vs_(live|test)_[A-Za-z0-9]{32}$/.test(secret)
}

/**
 * Compare two hex-encoded hashes in constant time.
 * Both sides must be the same length; if lengths differ, returns false.
 */
export function safeCompareHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  } catch {
    return false
  }
}
