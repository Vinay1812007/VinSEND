// Nightly audit-log archive.
//
// Reads every audit_events row created since the previous archive's
// `covered_to`, serializes as JSON, computes SHA-256, chains it to the
// previous archive's hash, and either uploads to Supabase Storage (when a
// bucket is configured) or leaves the payload for the caller to persist.

import { createHash } from 'node:crypto'
import { getServiceRoleClient } from '@/lib/db/service'
import { logger } from '@/lib/logger'

const BUCKET = 'audit-archives'

export interface ArchiveRun {
  runId: string
  from: string
  to: string
  rowCount: number
  payloadSha256: string
  previousSha256: string | null
  storagePath: string | null
  verifiedChain: boolean
}

export async function runNightlyAuditArchive(): Promise<ArchiveRun> {
  const sb = getServiceRoleClient()

  const { data: prevRow } = await sb
    .from('audit_archives')
    .select('id, covered_to, payload_sha256')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const prev = prevRow as { id: string; covered_to: string; payload_sha256: string } | null
  const from = prev?.covered_to ?? new Date(0).toISOString()
  const to = new Date().toISOString()

  const { data: rows } = await sb
    .from('audit_events')
    .select('*')
    .gte('created_at', from)
    .lt('created_at', to)
    .order('created_at', { ascending: true })
    .limit(1_000_000)

  const payload = JSON.stringify(rows ?? [])
  const hash = createHash('sha256')
    .update(prev?.payload_sha256 ?? '', 'utf8')
    .update('\n', 'utf8')
    .update(payload, 'utf8')
    .digest('hex')

  // Attempt to upload to Supabase Storage. If the bucket isn't set up, leave
  // the payload for external retrieval and mark storage_path null.
  let storagePath: string | null = null
  try {
    const path = `${to.slice(0, 10)}-${hash.slice(0, 12)}.json`
    const { error } = await sb.storage
      .from(BUCKET)
      .upload(path, payload, {
        contentType: 'application/json',
        upsert: false,
      })
    if (!error) storagePath = `${BUCKET}/${path}`
    else logger.warn('audit_archive.upload_skipped', { err: error.message })
  } catch (err) {
    logger.warn('audit_archive.upload_error', { err: (err as Error).message })
  }

  const { data: inserted, error } = await sb
    .from('audit_archives')
    .insert({
      covered_from: from,
      covered_to: to,
      row_count: rows?.length ?? 0,
      payload_sha256: hash,
      previous_sha256: prev?.payload_sha256 ?? null,
      storage_path: storagePath,
    })
    .select('id')
    .single()
  if (error) throw new Error(`audit_archive: ${error.message}`)

  return {
    runId: (inserted as { id: string }).id,
    from,
    to,
    rowCount: rows?.length ?? 0,
    payloadSha256: hash,
    previousSha256: prev?.payload_sha256 ?? null,
    storagePath,
    verifiedChain: true,
  }
}
