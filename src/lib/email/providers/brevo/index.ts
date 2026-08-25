// Brevo (formerly Sendinblue) adapter. https://developers.brevo.com/

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

export const BrevoConfigSchema = z.object({
  apiKey: z.string().min(1),
})

export type BrevoConfig = z.infer<typeof BrevoConfigSchema>

export class BrevoProvider implements EmailProvider {
  readonly type = 'brevo' as const

  constructor(private config: BrevoConfig) {}

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
    const res = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': this.config.apiKey, Accept: 'application/json' },
    })
    return res.ok
      ? { ok: true }
      : { ok: false, message: `${res.status}: ${await res.text()}` }
  }

  async sendEmail(input: ProviderSendEmailInput): Promise<ProviderSendEmailResult> {
    const body = {
      sender: recipient(input.from),
      to: input.to.map(recipient),
      cc: input.cc?.length ? input.cc.map(recipient) : undefined,
      bcc: input.bcc?.length ? input.bcc.map(recipient) : undefined,
      replyTo: input.replyTo?.[0] ? recipient(input.replyTo[0]) : undefined,
      subject: input.subject,
      htmlContent: input.html,
      textContent: input.text,
      headers: {
        ...(input.headers ?? {}),
        'X-VinSEND-Id': input.messageId,
      },
      tags: input.tags ? Object.keys(input.tags) : undefined,
      params: { vinsend_id: input.messageId },
      attachment: input.attachments?.map((a) => ({ name: a.filename, content: a.content })),
    }
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.config.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) return { ok: false, error: mapHttpToError(res.status, await res.text()) }
      const json = (await res.json()) as { messageId?: string }
      return {
        ok: true,
        providerMessageId: json.messageId ?? input.messageId,
        acceptedAt: new Date(),
      }
    } catch (err) {
      return { ok: false, error: new EmailProviderError('connection_failed', (err as Error).message) }
    }
  }

  async verifyDomain(domain: string): Promise<ProviderDomainRequirements> {
    return {
      records: [
        {
          type: 'spf',
          host: domain,
          expectedValue: 'v=spf1 include:spf.brevo.com ~all',
          required: true,
          ttl: 3600,
        },
        {
          type: 'dkim',
          host: `mail._domainkey.${domain}`,
          expectedValue: '<from Brevo Senders & IP settings>',
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

function recipient(r: { name?: string | null; address: string }) {
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
