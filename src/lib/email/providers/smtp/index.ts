import { createTransport, type Transporter } from 'nodemailer'
import type {
  EmailProvider,
  ProviderCapabilities,
  ProviderDomainRequirements,
  ProviderSendEmailInput,
  ProviderSendEmailResult,
  ProviderValidationResult,
} from '@/lib/email/types/provider'
import { normalizeSmtpError, EmailProviderError } from '@/lib/email/errors'
import { z } from 'zod'

export const SmtpConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean().default(false), // true for 465, false for 587/25 (STARTTLS)
  username: z.string().optional(),
  password: z.string().optional(),
  requireTls: z.boolean().default(true),
})

export type SmtpConfig = z.infer<typeof SmtpConfigSchema>

export class SmtpProvider implements EmailProvider {
  readonly type = 'smtp' as const
  private transporter: Transporter

  constructor(private config: SmtpConfig) {
    this.transporter = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: config.requireTls,
      auth:
        config.username && config.password
          ? { user: config.username, pass: config.password }
          : undefined,
      tls: {
        // Reject certificates by default in production.
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    })
  }

  capabilities(): ProviderCapabilities {
    return {
      deliveryEvents: false, // No feedback loop without a webhook path from the SMTP host.
      openTracking: false,
      clickTracking: false,
      customDkim: true, // The user configures DKIM at their own DNS host.
      inboundWebhooks: false,
    }
  }

  async validateConfiguration(): Promise<ProviderValidationResult> {
    try {
      await this.transporter.verify()
      return { ok: true }
    } catch (err) {
      const norm = normalizeSmtpError(err)
      return { ok: false, message: `${norm.code}: ${norm.message}` }
    }
  }

  async sendEmail(input: ProviderSendEmailInput): Promise<ProviderSendEmailResult> {
    try {
      const info = await this.transporter.sendMail({
        from: formatAddress(input.from),
        to: input.to.map(formatAddress),
        cc: input.cc?.map(formatAddress),
        bcc: input.bcc?.map(formatAddress),
        replyTo: input.replyTo?.map(formatAddress),
        subject: input.subject,
        html: input.html,
        text: input.text,
        headers: {
          ...(input.headers || {}),
          'X-VinSEND-Message-Id': input.messageId,
        },
        attachments: input.attachments?.map((a) => ({
          filename: a.filename,
          contentType: a.contentType,
          content: Buffer.from(a.content, 'base64'),
        })),
      })
      return {
        ok: true,
        providerMessageId: info.messageId ?? input.messageId,
        acceptedAt: new Date(),
        response: info.response,
      }
    } catch (err) {
      const norm =
        err instanceof EmailProviderError ? err : normalizeSmtpError(err)
      return { ok: false, error: norm }
    }
  }

  async verifyDomain(domain: string): Promise<ProviderDomainRequirements> {
    // Generic SMTP: the provider cannot dictate DNS. Recommend the standard trio,
    // scoped to the user's own DKIM key management.
    return {
      records: [
        {
          type: 'spf',
          host: domain,
          expectedValue: `v=spf1 mx ~all`,
          required: true,
          ttl: 3600,
          notes:
            'Add or merge the SMTP host into your SPF. Never create multiple v=spf1 TXT records.',
        },
        {
          type: 'dkim',
          host: `vs1._domainkey.${domain}`,
          expectedValue: 'Configured at your SMTP provider — copy the DKIM TXT they issue.',
          required: false,
          ttl: 3600,
          notes: 'Generic SMTP does not sign for you. Ask your SMTP provider for a DKIM selector.',
        },
        {
          type: 'dmarc',
          host: `_dmarc.${domain}`,
          expectedValue: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`,
          required: true,
          ttl: 3600,
          notes: 'Start with p=none to monitor. Escalate to quarantine/reject after 30+ days.',
        },
      ],
    }
  }
}

function formatAddress(r: { name?: string | null; address: string }): string {
  if (r.name) {
    // Quote the display name to survive commas / special chars.
    const safe = r.name.replace(/["\\]/g, '')
    return `"${safe}" <${r.address}>`
  }
  return r.address
}
