// Structured error type used across the service layer.

export type ApiErrorCode =
  | 'authentication_required'
  | 'invalid_api_key'
  | 'insufficient_scope'
  | 'validation_error'
  | 'invalid_recipient'
  | 'invalid_sender'
  | 'domain_not_verified'
  | 'sender_not_configured'
  | 'provider_not_configured'
  | 'all_recipients_suppressed'
  | 'idempotency_conflict'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'provider_error'
  | 'internal_error'

const STATUS: Record<ApiErrorCode, number> = {
  authentication_required: 401,
  invalid_api_key: 401,
  insufficient_scope: 403,
  validation_error: 400,
  invalid_recipient: 400,
  invalid_sender: 400,
  domain_not_verified: 422,
  sender_not_configured: 422,
  provider_not_configured: 422,
  all_recipients_suppressed: 422,
  idempotency_conflict: 409,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  provider_error: 502,
  internal_error: 500,
}

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly details?: Record<string, unknown>

  constructor(code: ApiErrorCode, message: string, status?: number, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status ?? STATUS[code]
    this.details = details
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError
}
