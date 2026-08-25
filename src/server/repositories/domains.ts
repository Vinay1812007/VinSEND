import { getServiceRoleClient } from '@/lib/db/service'

export interface DomainRow {
  id: string
  project_id: string
  org_id: string
  provider_id: string | null
  domain: string
  public_id: string
  status: 'pending' | 'verifying' | 'verified' | 'failed'
  last_checked_at: string | null
  verified_at: string | null
  created_at: string
}

export interface DnsRecordRow {
  id: string
  domain_id: string
  type: 'spf' | 'dkim' | 'dmarc' | 'mx' | 'cname'
  host: string
  expected_value: string
  last_seen_value: string | null
  status: 'pending' | 'matched' | 'mismatched' | 'missing'
  ttl: number | null
  required: boolean
  notes: string | null
}

export async function insertDomain(row: {
  project_id: string
  org_id: string
  provider_id: string | null
  domain: string
  public_id: string
}): Promise<DomainRow> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('domains')
    .insert({ ...row, status: 'pending' })
    .select('*')
    .single()
  if (error || !data) throw new Error(`insertDomain: ${error?.message}`)
  return data as DomainRow
}

export async function insertDnsRecords(
  rows: Omit<DnsRecordRow, 'id' | 'last_seen_value' | 'status'>[],
): Promise<void> {
  if (rows.length === 0) return
  const sb = getServiceRoleClient()
  const { error } = await sb
    .from('dns_records')
    .insert(rows.map((r) => ({ ...r, status: 'pending' })))
  if (error) throw new Error(`insertDnsRecords: ${error.message}`)
}

export async function updateDnsRecordStatus(
  id: string,
  status: DnsRecordRow['status'],
  lastSeen: string | null,
): Promise<void> {
  const sb = getServiceRoleClient()
  const { error } = await sb
    .from('dns_records')
    .update({ status, last_seen_value: lastSeen })
    .eq('id', id)
  if (error) throw new Error(`updateDnsRecordStatus: ${error.message}`)
}

export async function updateDomainStatus(input: {
  id: string
  status: DomainRow['status']
  verifiedAt?: Date | null
}): Promise<void> {
  const sb = getServiceRoleClient()
  const { error } = await sb
    .from('domains')
    .update({
      status: input.status,
      last_checked_at: new Date().toISOString(),
      ...(input.verifiedAt ? { verified_at: input.verifiedAt.toISOString() } : {}),
    })
    .eq('id', input.id)
  if (error) throw new Error(`updateDomainStatus: ${error.message}`)
}

export async function findDomainWithRecords(
  projectId: string,
  publicId: string,
): Promise<{ domain: DomainRow; records: DnsRecordRow[] } | null> {
  const sb = getServiceRoleClient()
  const { data: domain, error: e1 } = await sb
    .from('domains')
    .select('*')
    .eq('project_id', projectId)
    .eq('public_id', publicId)
    .maybeSingle()
  if (e1) throw new Error(`findDomainWithRecords(domain): ${e1.message}`)
  if (!domain) return null
  const { data: records, error: e2 } = await sb
    .from('dns_records')
    .select('*')
    .eq('domain_id', (domain as DomainRow).id)
    .order('type', { ascending: true })
  if (e2) throw new Error(`findDomainWithRecords(records): ${e2.message}`)
  return { domain: domain as DomainRow, records: (records ?? []) as DnsRecordRow[] }
}

export async function listDomainsByProject(projectId: string): Promise<DomainRow[]> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('domains')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listDomainsByProject: ${error.message}`)
  return (data ?? []) as DomainRow[]
}

export async function isDomainVerified(projectId: string, domain: string): Promise<boolean> {
  const sb = getServiceRoleClient()
  const { data } = await sb
    .from('domains')
    .select('status')
    .eq('project_id', projectId)
    .eq('domain', domain.toLowerCase())
    .maybeSingle()
  return (data as { status: string } | null)?.status === 'verified'
}
