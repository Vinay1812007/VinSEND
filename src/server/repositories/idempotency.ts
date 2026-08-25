import { createHash } from 'node:crypto'
import { getServiceRoleClient } from '@/lib/db/service'

export interface StoredIdempotencyResponse {
  request_hash: string
  response_body: Record<string, unknown>
  response_status: number
}

export function hashRequestBody(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body)).digest('hex')
}

export async function findIdempotencyRecord(
  projectId: string,
  key: string,
): Promise<StoredIdempotencyResponse | null> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('idempotency_keys')
    .select('request_hash, response_body, response_status')
    .eq('project_id', projectId)
    .eq('key', key)
    .maybeSingle()
  if (error) throw new Error(`findIdempotencyRecord: ${error.message}`)
  return (data as StoredIdempotencyResponse | null) ?? null
}

export async function storeIdempotencyRecord(input: {
  project_id: string
  key: string
  request_hash: string
  response_body: Record<string, unknown>
  response_status: number
}): Promise<void> {
  const sb = getServiceRoleClient()
  const { error } = await sb.from('idempotency_keys').insert(input)
  if (error) throw new Error(`storeIdempotencyRecord: ${error.message}`)
}
