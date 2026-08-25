export type EmailProviderErrorCode =
  | 'authentication_failed'
  | 'connection_failed'
  | 'recipient_rejected'
  | 'sender_rejected'
  | 'rate_limited'
  | 'temporary_failure'
  | 'permanent_failure'
  | 'unknown'

export class EmailProviderError extends Error {
  readonly code: EmailProviderErrorCode
  readonly retryable: boolean
  readonly providerCode?: string

  constructor(code: EmailProviderErrorCode, message: string, opts?: { providerCode?: string }) {
    super(message)
    this.name = 'EmailProviderError'
    this.code = code
    this.providerCode = opts?.providerCode
    this.retryable =
      code === 'temporary_failure' || code === 'rate_limited' || code === 'connection_failed'
  }
}

/**
 * Normalize a low-level SMTP / nodemailer error into a stable VinSEND error.
 */
export function normalizeSmtpError(err: unknown): EmailProviderError {
  const anyErr = err as { code?: string; responseCode?: number; message?: string } | undefined
  const code = anyErr?.code
  const responseCode = anyErr?.responseCode
  const message = anyErr?.message ?? 'SMTP error'

  if (code === 'EAUTH' || responseCode === 535 || responseCode === 530) {
    return new EmailProviderError('authentication_failed', message, { providerCode: code })
  }
  if (code === 'ECONNECTION' || code === 'ETIMEDOUT' || code === 'ESOCKET' || code === 'ECONNREFUSED') {
    return new EmailProviderError('connection_failed', message, { providerCode: code })
  }
  if (responseCode === 421 || responseCode === 450 || responseCode === 451 || responseCode === 452) {
    return new EmailProviderError('temporary_failure', message, { providerCode: String(responseCode) })
  }
  if (responseCode === 550 || responseCode === 551 || responseCode === 553) {
    return new EmailProviderError('recipient_rejected', message, { providerCode: String(responseCode) })
  }
  if (responseCode === 552 || responseCode === 554) {
    return new EmailProviderError('permanent_failure', message, { providerCode: String(responseCode) })
  }
  if (responseCode === 429) {
    return new EmailProviderError('rate_limited', message, { providerCode: String(responseCode) })
  }
  return new EmailProviderError('unknown', message, { providerCode: code })
}
