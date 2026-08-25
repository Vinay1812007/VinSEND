// AES-256-GCM encryption for secrets at rest.
// Per-project keys are derived via HKDF from a master key so rotating a
// per-project key does not require rotating the master.

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'
import { serverEnv } from '@/lib/validation/env'

const IV_LEN = 12 // GCM standard.
const KEY_LEN = 32 // 256 bits.
const TAG_LEN = 16 // GCM standard.

function masterKey(): Buffer {
  const raw = serverEnv().SECRET_ENCRYPTION_KEY
  const buf = Buffer.from(raw, 'base64')
  if (buf.length < 32) {
    throw new Error('SECRET_ENCRYPTION_KEY must decode to at least 32 bytes')
  }
  return buf.subarray(0, 32)
}

function deriveKey(scope: string): Buffer {
  const derived = hkdfSync('sha256', masterKey(), Buffer.alloc(0), Buffer.from(scope, 'utf8'), KEY_LEN)
  return Buffer.from(derived)
}

/**
 * Encrypt a plaintext value.
 *
 * Ciphertext layout (packed into a single Buffer, base64-encoded on the wire):
 *   [0..1)   version byte (0x01)
 *   [1..13)  IV (12 bytes)
 *   [13..29) auth tag (16 bytes)
 *   [29..)   ciphertext
 */
export function encryptSecret(plaintext: string, scope: string): Buffer {
  const iv = randomBytes(IV_LEN)
  const key = deriveKey(scope)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([Buffer.from([0x01]), iv, tag, enc])
}

export function decryptSecret(packed: Buffer, scope: string): string {
  if (packed.length < 1 + IV_LEN + TAG_LEN) {
    throw new Error('Ciphertext too short')
  }
  const version = packed[0]
  if (version !== 0x01) throw new Error(`Unsupported ciphertext version ${version}`)
  const iv = packed.subarray(1, 1 + IV_LEN)
  const tag = packed.subarray(1 + IV_LEN, 1 + IV_LEN + TAG_LEN)
  const ct = packed.subarray(1 + IV_LEN + TAG_LEN)
  const key = deriveKey(scope)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(ct), decipher.final()])
  return dec.toString('utf8')
}

/**
 * Encrypt an arbitrary JSON-serialisable object (e.g. provider config).
 */
export function encryptJson(value: unknown, scope: string): Buffer {
  return encryptSecret(JSON.stringify(value), scope)
}

export function decryptJson<T = unknown>(packed: Buffer, scope: string): T {
  return JSON.parse(decryptSecret(packed, scope)) as T
}
