import { getServiceRoleClient } from '@/lib/db/service'

export interface SuppressionRow {
  id: string
  project_id: string
  org_id: string
  email: string
  reason: 'hard_bounce' | 'complaint' | 'unsubscribe' | 'manual'
  source: 'system' | 'manual' | 'api' | 'webhook_event'
  notes: string | null
  created_at: string
}

export async function isSuppressed(projectId: string, email: string): Promise<boolean> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('suppressions')
    .select('id')
    .eq('project_id', projectId)
    .eq('email', email.toLowerCase())
    .maybeSingle()
  if (error) throw new Error(`isSuppressed: ${error.message}`)
  return Boolean(data)
}

export async function filterSuppressed(
  projectId: string,
  emails: string[],
): Promise<{ allowed: string[]; suppressed: string[] }> {
  if (emails.length === 0) return { allowed: [], suppressed: [] }
  const sb = getServiceRoleClient()
  const lowered = emails.map((e) => e.toLowerCase())
  const { data, error } = await sb
    .from('suppressions')
    .select('email')
    .eq('project_id', projectId)
    .in('email', lowered)
  if (error) throw new Error(`filterSuppressed: ${error.message}`)
  const suppressedSet = new Set((data ?? []).map((r: { email: string }) => r.email.toLowerCase()))
  const allowed: string[] = []
  const suppressed: string[] = []
  for (const e of emails) {
    if (suppressedSet.has(e.toLowerCase())) suppressed.push(e)
    else allowed.push(e)
  }
  return { allowed, suppressed }
}

export async function addSuppression(input: {
  project_id: string
  org_id: string
  email: string
  reason: SuppressionRow['reason']
  source: SuppressionRow['source']
  notes?: string | null
}): Promise<SuppressionRow> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('suppressions')
    .upsert(
      {
        project_id: input.project_id,
        org_id: input.org_id,
        email: input.email.toLowerCase(),
        reason: input.reason,
        source: input.source,
        notes: input.notes ?? null,
      },
      { onConflict: 'project_id,email' },
    )
    .select('*')
    .single()
  if (error || !data) throw new Error(`addSuppression: ${error?.message}`)
  return data as SuppressionRow
}

export async function listSuppressions(
  projectId: string,
  opts: { limit?: number } = {},
): Promise<SuppressionRow[]> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('suppressions')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(Math.min(opts.limit ?? 50, 200))
  if (error) throw new Error(`listSuppressions: ${error.message}`)
  return (data ?? []) as SuppressionRow[]
}

export async function removeSuppression(
  projectId: string,
  email: string,
  opts: { allowAutoRemoval?: boolean } = {},
): Promise<{ removed: boolean; reason: string }> {
  const sb = getServiceRoleClient()
  const { data: existing } = await sb
    .from('suppressions')
    .select('reason')
    .eq('project_id', projectId)
    .eq('email', email.toLowerCase())
    .maybeSingle()
  if (!existing) return { removed: false, reason: 'not_found' }
  if (
    (existing as { reason: string }).reason !== 'manual' &&
    (existing as { reason: string }).reason !== 'unsubscribe' &&
    !opts.allowAutoRemoval
  ) {
    return { removed: false, reason: 'protected_reason' }
  }
  const { error } = await sb
    .from('suppressions')
    .delete()
    .eq('project_id', projectId)
    .eq('email', email.toLowerCase())
  if (error) throw new Error(`removeSuppression: ${error.message}`)
  return { removed: true, reason: 'ok' }
}
