import { promises as dns } from 'node:dns'
import { publicId } from '@/lib/ids'
import { providerFrom } from '@/lib/email/registry'
import type { ProviderType } from '@/lib/email/types/provider'
import {
  insertDnsRecords,
  insertDomain,
  findDomainWithRecords,
  listDomainsByProject,
  updateDnsRecordStatus,
  updateDomainStatus,
} from '@/server/repositories/domains'
import { findDefaultProvider } from '@/server/repositories/providers'
import { recordAuditEvent } from '@/server/repositories/audit'
import { ApiError } from '@/server/services/errors'

export async function addDomain(input: {
  projectId: string
  orgId: string
  actorUserId: string
  domain: string
  providerId?: string
  providerType?: ProviderType
  providerConfig?: Record<string, unknown>
}) {
  // Fetch DNS requirements from the provider (default provider if none given).
  const providerType = input.providerType ?? 'smtp'
  const providerConfig =
    input.providerConfig ??
    (await findDefaultProvider(input.projectId))?.config ??
    {
      host: 'placeholder.example.com',
      port: 587,
      secure: false,
      requireTls: true,
    }
  const provider = providerFrom(providerType, providerConfig)

  const requirements = provider.verifyDomain
    ? await provider.verifyDomain(input.domain)
    : { records: [] as { type: 'spf' | 'dkim' | 'dmarc' | 'cname'; host: string; expectedValue: string; required: boolean; ttl?: number; notes?: string }[] }

  const domainRow = await insertDomain({
    project_id: input.projectId,
    org_id: input.orgId,
    provider_id: input.providerId ?? null,
    domain: input.domain.toLowerCase(),
    public_id: publicId('domain'),
  })

  await insertDnsRecords(
    requirements.records.map((r) => ({
      domain_id: domainRow.id,
      type: r.type,
      host: r.host,
      expected_value: r.expectedValue,
      required: r.required,
      ttl: r.ttl ?? null,
      notes: r.notes ?? null,
    })),
  )

  await recordAuditEvent({
    org_id: input.orgId,
    project_id: input.projectId,
    actor_user_id: input.actorUserId,
    action: 'domain.added',
    resource_type: 'domain',
    resource_id: domainRow.public_id,
    metadata: { domain: input.domain },
  })

  return findDomainWithRecords(input.projectId, domainRow.public_id)
}

export async function verifyDomain(input: {
  projectId: string
  orgId: string
  publicId: string
  actorUserId?: string
}) {
  const found = await findDomainWithRecords(input.projectId, input.publicId)
  if (!found) throw new ApiError('not_found', 'Domain not found', 404)

  let allMatched = true
  let anyMissing = false
  let spfConflict = false

  for (const rec of found.records) {
    if (rec.type === 'spf' || rec.type === 'dmarc' || rec.type === 'dkim') {
      const host = rec.type === 'dkim' || rec.type === 'dmarc' ? rec.host : found.domain.domain
      try {
        const txts = await dns.resolveTxt(host)
        const flat = txts.map((parts) => parts.join(''))
        if (rec.type === 'spf') {
          const spfs = flat.filter((s) => s.trim().toLowerCase().startsWith('v=spf1'))
          if (spfs.length > 1) spfConflict = true
          const hasMatch = spfs.some((s) => normalize(s).includes(normalize(rec.expected_value)))
          const value = spfs[0] ?? null
          await updateDnsRecordStatus(rec.id, hasMatch ? 'matched' : 'mismatched', value)
          if (!hasMatch) allMatched = false
        } else {
          const hasMatch = flat.some((s) => normalize(s) === normalize(rec.expected_value))
          const value = flat[0] ?? null
          await updateDnsRecordStatus(rec.id, hasMatch ? 'matched' : 'mismatched', value)
          if (!hasMatch && rec.required) allMatched = false
        }
      } catch (err) {
        anyMissing = true
        if (rec.required) allMatched = false
        await updateDnsRecordStatus(rec.id, 'missing', null)
      }
    }
  }

  const status = allMatched ? 'verified' : anyMissing ? 'failed' : 'verifying'
  await updateDomainStatus({
    id: found.domain.id,
    status: status,
    verifiedAt: status === 'verified' ? new Date() : null,
  })

  if (input.actorUserId) {
    await recordAuditEvent({
      org_id: input.orgId,
      project_id: input.projectId,
      actor_user_id: input.actorUserId,
      action: 'domain.verify_attempted',
      resource_type: 'domain',
      resource_id: input.publicId,
      metadata: { result: status, spf_conflict: spfConflict },
    })
  }

  return await findDomainWithRecords(input.projectId, input.publicId)
}

export { listDomainsByProject, findDomainWithRecords }

function normalize(v: string): string {
  return v.replace(/\s+/g, ' ').trim().toLowerCase()
}
