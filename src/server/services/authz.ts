// Authentication for the public /v1 API. Resolves an Authorization header
// into a project + api key row, or throws a structured ApiError.

import { extractPrefix, hashApiKey, isValidKeyFormat, safeCompareHex } from '@/lib/security/api-keys'
import { findByPrefix, markUsed, type ApiKeyRow } from '@/server/repositories/api-keys'
import { ApiError } from '@/server/services/errors'

export interface ResolvedApiKey {
  key: ApiKeyRow
  projectId: string
  orgId: string
}

export async function authenticateApiKey(authHeader: string | null): Promise<ResolvedApiKey> {
  if (!authHeader) {
    throw new ApiError('authentication_required', 'Missing Authorization header', 401)
  }
  const m = authHeader.match(/^Bearer\s+(vs_(?:live|test)_[A-Za-z0-9]{32})$/)
  if (!m) {
    throw new ApiError(
      'invalid_api_key',
      'Authorization header must be `Bearer <key>` with a valid VinSEND API key',
      401,
    )
  }
  const secret = m[1]!
  if (!isValidKeyFormat(secret)) {
    throw new ApiError('invalid_api_key', 'Invalid API key format', 401)
  }
  const prefix = extractPrefix(secret)
  if (!prefix) throw new ApiError('invalid_api_key', 'Invalid API key', 401)

  const row = await findByPrefix(prefix)
  if (!row) throw new ApiError('invalid_api_key', 'Invalid or revoked API key', 401)

  const computed = hashApiKey(secret)
  if (!safeCompareHex(computed, row.hash)) {
    throw new ApiError('invalid_api_key', 'Invalid API key', 401)
  }
  if (row.revoked_at) throw new ApiError('invalid_api_key', 'API key has been revoked', 401)

  // Fire-and-forget.
  void markUsed(row.id).catch(() => undefined)

  return { key: row, projectId: row.project_id, orgId: row.org_id }
}

export function requireScope(key: ApiKeyRow, scope: string): void {
  if (!key.scopes.includes(scope)) {
    throw new ApiError('insufficient_scope', `API key lacks required scope: ${scope}`, 403)
  }
}
