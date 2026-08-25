import type { EmailProviderError } from '@/lib/email/errors'

export type ProviderType = 'smtp' | 'ses' | 'mailgun' | 'postmark' | 'sendgrid' | 'brevo'

export interface ProviderCapabilities {
  deliveryEvents: boolean
  openTracking: boolean
  clickTracking: boolean
  customDkim: boolean
  inboundWebhooks: boolean
}

export interface ProviderRecipient {
  name?: string | null
  address: string
}

export interface ProviderAttachment {
  filename: string
  contentType?: string
  /** base64-encoded */
  content: string
}

export interface ProviderSendEmailInput {
  from: ProviderRecipient
  to: ProviderRecipient[]
  cc?: ProviderRecipient[]
  bcc?: ProviderRecipient[]
  replyTo?: ProviderRecipient[]
  subject: string
  html?: string
  text?: string
  headers?: Record<string, string>
  tags?: Record<string, string>
  attachments?: ProviderAttachment[]
  /** VinSEND-owned public ID; providers should echo this in their message headers where possible. */
  messageId: string
}

export type ProviderSendEmailResult =
  | { ok: true; providerMessageId: string; acceptedAt: Date; response?: string }
  | { ok: false; error: EmailProviderError }

export interface ProviderValidationResult {
  ok: boolean
  message?: string
}

export interface ProviderDomainRequirement {
  type: 'spf' | 'dkim' | 'dmarc' | 'cname'
  host: string
  expectedValue: string
  required: boolean
  ttl?: number
  notes?: string
}

export interface ProviderDomainRequirements {
  records: ProviderDomainRequirement[]
}

export interface EmailProvider {
  readonly type: ProviderType
  capabilities(): ProviderCapabilities
  sendEmail(input: ProviderSendEmailInput): Promise<ProviderSendEmailResult>
  validateConfiguration?(): Promise<ProviderValidationResult>
  verifyDomain?(domain: string): Promise<ProviderDomainRequirements>
}
