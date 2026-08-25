// Provider registry. The service layer resolves providers through this
// module so it never depends on a specific SDK.

import type { EmailProvider, ProviderType } from '@/lib/email/types/provider'
import { SmtpProvider, SmtpConfigSchema, type SmtpConfig } from '@/lib/email/providers/smtp'
import { SesProvider, SesConfigSchema, type SesConfig } from '@/lib/email/providers/ses'
import { MailgunProvider, MailgunConfigSchema, type MailgunConfig } from '@/lib/email/providers/mailgun'
import { PostmarkProvider, PostmarkConfigSchema, type PostmarkConfig } from '@/lib/email/providers/postmark'
import { SendGridProvider, SendGridConfigSchema, type SendGridConfig } from '@/lib/email/providers/sendgrid'
import { BrevoProvider, BrevoConfigSchema, type BrevoConfig } from '@/lib/email/providers/brevo'

/**
 * Instantiate a provider from its stored (already decrypted) configuration.
 */
export function providerFrom(type: ProviderType, config: unknown): EmailProvider {
  switch (type) {
    case 'smtp': {
      const parsed = SmtpConfigSchema.safeParse(config)
      if (!parsed.success) throw new Error(`Invalid SMTP config: ${parsed.error.message}`)
      return new SmtpProvider(parsed.data as SmtpConfig)
    }
    case 'ses': {
      const parsed = SesConfigSchema.safeParse(config)
      if (!parsed.success) throw new Error(`Invalid SES config: ${parsed.error.message}`)
      return new SesProvider(parsed.data as SesConfig)
    }
    case 'mailgun': {
      const parsed = MailgunConfigSchema.safeParse(config)
      if (!parsed.success) throw new Error(`Invalid Mailgun config: ${parsed.error.message}`)
      return new MailgunProvider(parsed.data as MailgunConfig)
    }
    case 'postmark': {
      const parsed = PostmarkConfigSchema.safeParse(config)
      if (!parsed.success) throw new Error(`Invalid Postmark config: ${parsed.error.message}`)
      return new PostmarkProvider(parsed.data as PostmarkConfig)
    }
    case 'sendgrid': {
      const parsed = SendGridConfigSchema.safeParse(config)
      if (!parsed.success) throw new Error(`Invalid SendGrid config: ${parsed.error.message}`)
      return new SendGridProvider(parsed.data as SendGridConfig)
    }
    case 'brevo': {
      const parsed = BrevoConfigSchema.safeParse(config)
      if (!parsed.success) throw new Error(`Invalid Brevo config: ${parsed.error.message}`)
      return new BrevoProvider(parsed.data as BrevoConfig)
    }
    default: {
      const _exhaustive: never = type
      throw new Error(`Unknown provider type: ${_exhaustive as string}`)
    }
  }
}

/**
 * Human labels for the settings UI.
 */
export const PROVIDER_LABEL: Record<ProviderType, string> = {
  smtp: 'Generic SMTP',
  ses: 'Amazon SES',
  mailgun: 'Mailgun',
  postmark: 'Postmark',
  sendgrid: 'SendGrid',
  brevo: 'Brevo',
}
