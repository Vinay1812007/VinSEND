// Mailgun adapter. Uses the plain HTTP API — no SDK dependency.
// Docs: https://documentation.mailgun.com/en/latest/api-sending.html

import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import type {
  EmailProvider,
  ProviderCapabilities,
  ProviderDomainRequirements,
  ProviderSendEmailInput,
  ProviderSendEmailResult,
  ProviderValidationResult,
} from '@/lib/email/types/provider'
import { EmailProviderError } from '@/lib/email/errors'

export const MailgunConfigSchema = z.object({
  apiKey: z.string().min(1),
  domain: z.string().min(1),
  region: z.enum(['us', 'eu']).default('us'),
})

export type MailgunConfig = z.infer<typeof MailgunConfigSchema>

const REGION_HOST: Record<'us' | 'eu', string> = {
  us: 'api.mailgun.net',
  eu: 'api.eu.mailgun.net',
}

export class MailgunProvider implements EmailProvider {
  readonly type = 'mailgun' as const

  constructor(private config: MailgunConfig) {}

  capabilities(): ProviderCapabilities {
    return {
      deliveryEvents: true,
      openTracking: true,
      clickTracking: true,
      customDkim: true,
      inboundWebhooks: true,
    }
  }

  async validateConfiguration(): Promise<ProviderValidationResult> {
    const res = await this.request(`/v3/${encodeURIComponent(this.config.domain)}`, 'GET')
    if (res.ok) return { ok: true }
    return { ok: false, message: `${res.status}: ${await res.text()}` }
  }

  async sendEmail(input: ProviderSendEmailInput): Promise<ProviderSendEmailResult> {
    const hasAttachments = (input.attachments?.length ?? 0) > 0
    const form: URLSearchParams | FormData = hasAttachments ? new FormData() : new URLSearchParams()

    const set = (k: string, v: string) => (form as URLSearchParams).set(k, v)
    const append = (k: string, v: string) => (form as URLSearchParams).append(k, v)

    if (hasAttachments) {
      const f = form as FormData
      f.set('from', formatRecipient(input.from))
      for (const r of input.to) f.append('to', formatRecipient(r))
      for (const r of input.cc ?? []) f.append('cc', formatRecipient(r))
      for (const r of input.bcc ?? []) f.append('bcc', formatRecipient(r))
      if (input.replyTo?.length)
        f.set('h:Reply-To', input.replyTo.map(formatRecipient).join(', '))
      f.set('subject', input.subject)
      if (input.html) f.set('html', input.html)
      if (input.text) f.set('text', input.text)
      f.set('v:vinsend_id', input.messageId)
      for (const [k, v] of Object.entries(input.headers ?? {})) f.set(`h:${k}`, v)
      for (const [k, v] of Object.entries(input.tags ?? {})) f.append('o:tag', `${k}:${v}`)
      for (const a of input.attachments ?? []) {
        const blob = new Blob([Buffer.from(a.content, 'base64')], {
          type: a.contentType ?? 'application/octet-stream',
        })
        f.append('attachment', blob, a.filename)
      }
    } else {
      set('from', formatRecipient(input.from))
      for (const r of input.to) append('to', formatRecipient(r))
      for (const r of input.cc ?? []) append('cc', formatRecipient(r))
      for (const r of input.bcc ?? []) append('bcc', formatRecipient(r))
      if (input.replyTo?.length)
        set('h:Reply-To', input.replyTo.map(formatRecipient).join(', '))
      set('subject', input.subject)
      if (input.html) set('html', input.html)
      if (input.text) set('text', input.text)
      set('v:vinsend_id', input.messageId)
      for (const [k, v] of Object.entries(input.headers ?? {})) set(`h:${k}`, v)
      for (const [k, v] of Object.entries(input.tags ?? {})) append('o:tag', `${k}:${v}`)
    }

    try {
      const res = await this.request(
        `/v3/${encodeURIComponent(this.config.domain)}/messages`,
        'POST',
        form,
      )
      if (!res.ok) return { ok: false, error: mapHttpToError(res.status, await res.text()) }
      const body = (await res.json()) as { id?: string; message?: string }
      return {
        ok: true,
        providerMessageId: body.id ?? input.messageId,
        acceptedAt: new Date(),
        response: body.message,
      }
    } catch (err) {
      return {
        ok: false,
        error: new EmailProviderError('connection_failed', (err as Error).message),
      }
    }
  }

  async verifyDomain(domain: string): Promise<ProviderDomainRequirements> {
    return {
      records: [
        {
          type: 'spf',
          host: domain,
          expectedValue: 'v=spf1 include:mailgun.org ~all',
          required: true,
          ttl: 3600,
          notes: 'Merge with an existing SPF record if you already have one.',
        },
        {
          type: 'dkim',
          host: `mailo._domainkey.${domain}`,
          expectedValue: '<from Mailgun DKIM tab>',
          required: true,
          ttl: 3600,
          notes: 'Copy the exact TXT value from Mailgun → Sending → Domain settings.',
        },
        {
          type: 'dmarc',
          host: `_dmarc.${domain}`,
          expectedValue: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`,
          required: true,
          ttl: 3600,
        },
      ],
    }
  }

  private async request(path: string, method: string, body?: URLSearchParams | FormData) {
    const url = `https://${REGION_HOST[this.config.region]}${path}`
    const auth = Buffer.from(`api:${this.config.apiKey}`).toString('base64')
    // Only set Content-Type for URLSearchParams. FormData lets fetch set the
    // multipart boundary itself.
    const isForm = body instanceof URLSearchParams
    return fetch(url, {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        ...(isForm ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body: body as BodyInit | undefined,
    })
  }
}

function formatRecipient(r: { name?: string | null; address: string }): string {
  if (r.name) return `"${r.name.replace(/["\\]/g, '')}" <${r.address}>`
  return r.address
}

function mapHttpToError(status: number, message: string): EmailProviderError {
  if (status === 401 || status === 403)
    return new EmailProviderError('authentication_failed', message, { providerCode: String(status) })
  if (status === 429)
    return new EmailProviderError('rate_limited', message, { providerCode: String(status) })
  if (status >= 500)
    return new EmailProviderError('temporary_failure', message, { providerCode: String(status) })
  if (status === 400)
    return new EmailProviderError('permanent_failure', message, { providerCode: String(status) })
  return new EmailProviderError('unknown', message, { providerCode: String(status) })
}

/**
 * Verify a Mailgun webhook signature. Mailgun sends `{ signature: { timestamp, token, signature } }`.
 */
export function verifyMailgunSignature(input: {
  signingKey: string
  timestamp: string
  token: string
  signature: string
}): boolean {
  const expected = createHmac('sha256', input.signingKey)
    .update(`${input.timestamp}${input.token}`, 'utf8')
    .digest('hex')
  if (expected.length !== input.signature.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(input.signature, 'hex'))
  } catch {
    return false
  }
}
