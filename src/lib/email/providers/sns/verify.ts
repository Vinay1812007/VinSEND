// Verify an Amazon SNS message signature.
//
// Reference: https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
//
// The message includes a `SigningCertURL` and a `Signature`. Fetch the cert
// (over HTTPS from an approved AWS host), extract its public key, build the
// canonical string according to the SNS spec, and verify.

import { createVerify, X509Certificate } from 'node:crypto'

export interface SnsMessage {
  Type?: string
  MessageId?: string
  TopicArn?: string
  Subject?: string
  Message?: string
  Timestamp?: string
  Token?: string
  SubscribeURL?: string
  UnsubscribeURL?: string
  SignatureVersion?: string
  Signature?: string
  SigningCertURL?: string
}

const APPROVED_HOST_RE = /^sns\.[a-z0-9-]+\.amazonaws\.com$/i

export function isApprovedSigningCertUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    if (!APPROVED_HOST_RE.test(u.hostname)) return false
    if (!u.pathname.endsWith('.pem')) return false
    return true
  } catch {
    return false
  }
}

function canonicalString(m: SnsMessage): string {
  const isNotification = m.Type === 'Notification'
  // Fields (in this fixed order) for a Notification:
  //   Message, MessageId, Subject (optional), Timestamp, TopicArn, Type
  // For SubscriptionConfirmation / UnsubscribeConfirmation:
  //   Message, MessageId, SubscribeURL, Timestamp, Token, TopicArn, Type
  const parts: Array<[string, string | undefined]> = isNotification
    ? [
        ['Message', m.Message],
        ['MessageId', m.MessageId],
        ...(m.Subject ? [['Subject', m.Subject] as [string, string]] : []),
        ['Timestamp', m.Timestamp],
        ['TopicArn', m.TopicArn],
        ['Type', m.Type],
      ]
    : [
        ['Message', m.Message],
        ['MessageId', m.MessageId],
        ['SubscribeURL', m.SubscribeURL],
        ['Timestamp', m.Timestamp],
        ['Token', m.Token],
        ['TopicArn', m.TopicArn],
        ['Type', m.Type],
      ]

  return parts.map(([k, v]) => `${k}\n${v ?? ''}\n`).join('')
}

/**
 * Given the raw parsed SNS envelope + the fetched cert PEM, verify the
 * signature. Callers are responsible for fetching the PEM only when
 * `isApprovedSigningCertUrl(m.SigningCertURL) === true` (see below).
 */
export function verifyWithCert(m: SnsMessage, certPem: string): boolean {
  if (!m.Signature) return false
  const algo = m.SignatureVersion === '2' ? 'sha256' : 'sha1'
  try {
    const cert = new X509Certificate(certPem)
    const publicKey = cert.publicKey
    const verifier = createVerify(algo === 'sha256' ? 'RSA-SHA256' : 'RSA-SHA1')
    verifier.update(canonicalString(m))
    verifier.end()
    return verifier.verify(publicKey, m.Signature, 'base64')
  } catch {
    return false
  }
}

// Small in-memory cert cache so repeated notifications from the same topic
// don't refetch. Cert refreshes happen a few times a year.
const certCache = new Map<string, { pem: string; expiresAt: number }>()

export async function fetchAndCacheSigningCert(url: string): Promise<string | null> {
  if (!isApprovedSigningCertUrl(url)) return null
  const cached = certCache.get(url)
  if (cached && cached.expiresAt > Date.now()) return cached.pem
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const pem = await res.text()
    if (!pem.includes('BEGIN CERTIFICATE')) return null
    certCache.set(url, { pem, expiresAt: Date.now() + 24 * 3600 * 1000 })
    return pem
  } catch {
    return null
  }
}

export async function verifySnsMessage(m: SnsMessage): Promise<{ ok: boolean; reason?: string }> {
  if (!m.SigningCertURL) return { ok: false, reason: 'missing_signing_cert_url' }
  if (!isApprovedSigningCertUrl(m.SigningCertURL)) return { ok: false, reason: 'untrusted_cert_url' }
  const pem = await fetchAndCacheSigningCert(m.SigningCertURL)
  if (!pem) return { ok: false, reason: 'cert_fetch_failed' }
  return verifyWithCert(m, pem) ? { ok: true } : { ok: false, reason: 'signature_mismatch' }
}
