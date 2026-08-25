import { SESv2Client, SendEmailCommand, GetEmailIdentityCommand } from '@aws-sdk/client-sesv2'
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

export const SesConfigSchema = z.object({
  region: z.string().min(1),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  /**
   * Optional configuration set that AWS will attach to every send.
   * Configure this in the SES console with an SNS destination pointing at
   * VinSEND's /v1/providers/webhooks/ses endpoint to receive delivery /
   * bounce / complaint events.
   */
  configurationSet: z.string().optional(),
})

export type SesConfig = z.infer<typeof SesConfigSchema>

export class SesProvider implements EmailProvider {
  readonly type = 'ses' as const
  private client: SESv2Client

  constructor(private config: SesConfig) {
    this.client = new SESv2Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  }

  capabilities(): ProviderCapabilities {
    return {
      deliveryEvents: true,
      openTracking: true,
      clickTracking: true,
      customDkim: true,
      inboundWebhooks: false,
    }
  }

  async validateConfiguration(): Promise<ProviderValidationResult> {
    // Cheapest call that requires valid creds: list send quota via an
    // identity get on a well-known probe (won't actually create anything).
    try {
      await this.client.send(new GetEmailIdentityCommand({ EmailIdentity: 'aws.amazon.com' }))
      return { ok: true }
    } catch (err) {
      const anyErr = err as { name?: string; message?: string }
      // NotFoundException is fine — it means the creds were accepted and the
      // API is reachable; the identity just doesn't exist for this account.
      if (anyErr.name === 'NotFoundException') return { ok: true }
      return { ok: false, message: `${anyErr.name ?? 'error'}: ${anyErr.message ?? 'unknown'}` }
    }
  }

  async sendEmail(input: ProviderSendEmailInput): Promise<ProviderSendEmailResult> {
    try {
      const from = formatRecipient(input.from)
      const command = new SendEmailCommand({
        FromEmailAddress: from,
        Destination: {
          ToAddresses: input.to.map(formatRecipient),
          CcAddresses: input.cc?.map(formatRecipient),
          BccAddresses: input.bcc?.map(formatRecipient),
        },
        ReplyToAddresses: input.replyTo?.map(formatRecipient),
        ConfigurationSetName: this.config.configurationSet,
        EmailTags: [
          { Name: 'vinsend_id', Value: input.messageId },
          ...(Object.entries(input.tags ?? {}).map(([Name, Value]) => ({ Name, Value: sanitizeTag(Value) }))),
        ],
        Content: {
          Simple: {
            Subject: { Data: input.subject, Charset: 'UTF-8' },
            Body: {
              ...(input.html ? { Html: { Data: input.html, Charset: 'UTF-8' } } : {}),
              ...(input.text ? { Text: { Data: input.text, Charset: 'UTF-8' } } : {}),
            },
            Headers: input.headers
              ? Object.entries(input.headers).map(([Name, Value]) => ({ Name, Value }))
              : undefined,
          },
        },
      })
      const result = await this.client.send(command)
      return {
        ok: true,
        providerMessageId: result.MessageId ?? input.messageId,
        acceptedAt: new Date(),
      }
    } catch (err) {
      return { ok: false, error: normalizeSesError(err) }
    }
  }

  async verifyDomain(domain: string): Promise<ProviderDomainRequirements> {
    // SES requires DKIM verification via 3 CNAME records generated per
    // domain. The user configures these via the SES console; we can guide
    // them by describing the shape.
    return {
      records: [
        {
          type: 'cname',
          host: `<selector1>._domainkey.${domain}`,
          expectedValue: `<selector1>.dkim.amazonses.com`,
          required: true,
          ttl: 3600,
          notes: 'Add the three CNAME records SES gives you when you add this domain to SES Verified Identities.',
        },
        {
          type: 'cname',
          host: `<selector2>._domainkey.${domain}`,
          expectedValue: `<selector2>.dkim.amazonses.com`,
          required: true,
          ttl: 3600,
        },
        {
          type: 'cname',
          host: `<selector3>._domainkey.${domain}`,
          expectedValue: `<selector3>.dkim.amazonses.com`,
          required: true,
          ttl: 3600,
        },
        {
          type: 'spf',
          host: domain,
          expectedValue: 'v=spf1 include:amazonses.com ~all',
          required: true,
          ttl: 3600,
          notes: 'Merge with an existing SPF record if you already have one — never create two v=spf1 records on the same host.',
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

function formatRecipient(r: { name?: string | null; address: string }): string {
  if (r.name) {
    const safe = r.name.replace(/["\\]/g, '')
    return `"${safe}" <${r.address}>`
  }
  return r.address
}

// SES tag values must match [A-Za-z0-9_-]{1,256}.
function sanitizeTag(v: string): string {
  return v.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 256) || '_'
}

export function normalizeSesError(err: unknown): EmailProviderError {
  const e = err as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } }
  const status = e.$metadata?.httpStatusCode
  const name = e.name ?? 'SESError'
  const message = e.message ?? 'SES error'

  if (name === 'InvalidClientTokenId' || name === 'SignatureDoesNotMatch' || name === 'UnrecognizedClientException') {
    return new EmailProviderError('authentication_failed', message, { providerCode: name })
  }
  if (name === 'MessageRejected') {
    return new EmailProviderError('recipient_rejected', message, { providerCode: name })
  }
  if (name === 'MailFromDomainNotVerifiedException' || name === 'FromEmailAddressNotVerifiedException') {
    return new EmailProviderError('sender_rejected', message, { providerCode: name })
  }
  if (name === 'ThrottlingException' || name === 'SendingPausedException' || name === 'TooManyRequestsException') {
    return new EmailProviderError('rate_limited', message, { providerCode: name })
  }
  if (status && status >= 500) {
    return new EmailProviderError('temporary_failure', message, { providerCode: name })
  }
  if (status === 400) {
    return new EmailProviderError('permanent_failure', message, { providerCode: name })
  }
  return new EmailProviderError('unknown', message, { providerCode: name })
}
