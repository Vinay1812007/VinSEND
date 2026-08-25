// SendGrid adapter. https://docs.sendgrid.com/api-reference/mail-send/mail-send

import { createVerify } from 'node:crypto'
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

export const SendGridConfigSchema = z.object({
  apiKey: z.string().min(1),
})

export type SendGridConfig = z.infer<typeof SendGridConfigSchema>

export class SendGridProvider implements EmailProvider {
  readonly type = 'sendgrid' as const

  constructor(private config: SendGridConfig) {}

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
    const res = await fetch('https://api.sendgrid.com/v3/scopes', {
      headers: { Authorization: `Bearer ${this.config.apiKey}` },
    })
    return res.ok
      ? { ok: true }
      : { ok: false, message: `${res.status}: ${await res.text()}` }
  }

  async sendEmail(input: ProviderSendEmailInput): Promise<ProviderSendEmailResult> {
    const body = {
      personalizations: [
        {
          to: input.to.map(formatRecipient),
          cc: input.cc?.length ? input.cc.map(formatRecipient) : undefined,
          bcc: input.bcc?.length ? input.bcc.map(formatRecipient) : undefined,
          custom_args: { vinsend_id: input.messageId },
        },
      ],
      from: formatRecipient(input.from),
      reply_to_list: input.replyTo?.length ? input.replyTo.map(formatRecipient) : undefined,
      subject: input.subject,
      content: [
        ...(input.text ? [{ type: 'text/plain', value: input.text }] : []),
        ...(input.html ? [{ type: 'text/html', value: input.html }] : []),
      ],
      headers: input.headers,
      categories: input.tags ? Object.keys(input.tags) : undefined,
      attachments: input.attachments?.map((a) => ({
        content: a.content,
        filename: a.filename,
        type: a.contentType ?? 'application/octet-stream',
        disposition: 'attachment',
      })),
    }
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) return { ok: false, error: mapHttpToError(res.status, await res.text()) }
      // SendGrid returns a 202 with an empty body; the message id is in the
      // `X-Message-Id` header (varies) — fall back to our messageId.
      const providerMessageId = res.headers.get('x-message-id') ?? input.messageId
      return { ok: true, providerMessageId, acceptedAt: new Date() }
    } catch (err) {
      return { ok: false, error: new EmailProviderError('connection_failed', (err as Error).message) }
    }
  }

  async verifyDomain(domain: string): Promise<ProviderDomainRequirements> {
    return {
      records: [
        {
          type: 'cname',
          host: `em1234.${domain}`,
          expectedValue: 'u1234.wl.sendgrid.net',
          required: true,
          ttl: 3600,
          notes: 'Values come from SendGrid Sender Authentication; three CNAME records total.',
        },
        {
          type: 'cname',
          host: `s1._domainkey.${domain}`,
          expectedValue: 's1.domainkey.u1234.wl.sendgrid.net',
          required: true,
          ttl: 3600,
        },
        {
          type: 'cname',
          host: `s2._domainkey.${domain}`,
          expectedValue: 's2.domainkey.u1234.wl.sendgrid.net',
          required: true,
          ttl: 3600,
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
}

function formatRecipient(r: { name?: string | null; address: string }) {
  return r.name ? { email: r.address, name: r.name } : { email: r.address }
}

function mapHttpToError(status: number, message: string): EmailProviderError {
  if (status === 401 || status === 403)
    return new EmailProviderError('authentication_failed', message, { providerCode: String(status) })
  if (status === 429)
    return new EmailProviderError('rate_limited', message, { providerCode: String(status) })
  if (status >= 500)
    return new EmailProviderError('temporary_failure', message, { providerCode: String(status) })
  return new EmailProviderError('permanent_failure', message, { providerCode: String(status) })
}

/**
 * Verify the SendGrid event webhook signature.
 * SendGrid signs the raw request body with an ECDSA P-256 public key you
 * provide in your Event Webhook settings. Two headers travel with each POST.
 */
export function verifySendGridSignature(input: {
  publicKeyPem: string
  timestamp: string
  signatureBase64: string
  rawBody: string
}): boolean {
  try {
    const verifier = createVerify('sha256')
    verifier.update(input.timestamp + input.rawBody, 'utf8')
    verifier.end()
    return verifier.verify(input.publicKeyPem, input.signatureBase64, 'base64')
  } catch {
    return false
  }
}
