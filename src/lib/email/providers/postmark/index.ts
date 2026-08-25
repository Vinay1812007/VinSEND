// Postmark adapter. https://postmarkapp.com/developer

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

export const PostmarkConfigSchema = z.object({
  serverToken: z.string().min(1),
  /** Optional Postmark message stream id (defaults to "outbound"). */
  stream: z.string().optional(),
})

export type PostmarkConfig = z.infer<typeof PostmarkConfigSchema>

export class PostmarkProvider implements EmailProvider {
  readonly type = 'postmark' as const

  constructor(private config: PostmarkConfig) {}

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
    const res = await fetch('https://api.postmarkapp.com/server', {
      headers: this.headers(),
    })
    return res.ok
      ? { ok: true }
      : { ok: false, message: `${res.status}: ${await res.text()}` }
  }

  async sendEmail(input: ProviderSendEmailInput): Promise<ProviderSendEmailResult> {
    const body = {
      From: formatRecipient(input.from),
      To: input.to.map(formatRecipient).join(', '),
      Cc: input.cc?.map(formatRecipient).join(', '),
      Bcc: input.bcc?.map(formatRecipient).join(', '),
      ReplyTo: input.replyTo?.map(formatRecipient).join(', '),
      Subject: input.subject,
      HtmlBody: input.html,
      TextBody: input.text,
      Headers: [
        { Name: 'X-VinSEND-Id', Value: input.messageId },
        ...Object.entries(input.headers ?? {}).map(([Name, Value]) => ({ Name, Value })),
      ],
      Metadata: { vinsend_id: input.messageId, ...(input.tags ?? {}) },
      MessageStream: this.config.stream ?? 'outbound',
      Attachments: input.attachments?.map((a) => ({
        Name: a.filename,
        Content: a.content,
        ContentType: a.contentType ?? 'application/octet-stream',
      })),
    }
    try {
      const res = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
      })
      if (!res.ok) return { ok: false, error: mapHttpToError(res.status, await res.text()) }
      const json = (await res.json()) as { MessageID?: string; ErrorCode?: number; Message?: string }
      if (json.ErrorCode) {
        return {
          ok: false,
          error: new EmailProviderError('permanent_failure', json.Message ?? 'Postmark error', {
            providerCode: String(json.ErrorCode),
          }),
        }
      }
      return {
        ok: true,
        providerMessageId: json.MessageID ?? input.messageId,
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
          expectedValue: 'v=spf1 a mx include:spf.mtasv.net ~all',
          required: true,
          ttl: 3600,
        },
        {
          type: 'dkim',
          host: `pm._domainkey.${domain}`,
          expectedValue: '<from Postmark Sender Signatures>',
          required: true,
          ttl: 3600,
          notes: 'Copy the TXT value shown when you add the domain in Postmark.',
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

  private headers(): Record<string, string> {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': this.config.serverToken,
    }
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
  return new EmailProviderError('permanent_failure', message, { providerCode: String(status) })
}
