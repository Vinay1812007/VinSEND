import { publicId } from '@/lib/ids'
import { parseAddress } from '@/lib/security/addresses'
import { parseCsv } from '@/lib/csv/parse'
import { getServiceRoleClient } from '@/lib/db/service'
import {
  countContacts,
  deleteContact,
  findContactByPublicId,
  insertContact,
  listContactsByProject,
  updateContact,
  type ContactRow,
} from '@/server/repositories/contacts'

export async function createContact(input: {
  projectId: string
  orgId: string
  email: string
  firstName?: string
  lastName?: string
  properties?: Record<string, unknown>
}): Promise<ContactRow> {
  const parsed = parseAddress(input.email)
  return insertContact({
    project_id: input.projectId,
    org_id: input.orgId,
    public_id: publicId('contact'),
    email: parsed.address,
    first_name: input.firstName?.trim() || null,
    last_name: input.lastName?.trim() || null,
    properties: input.properties ?? {},
  } as unknown as Omit<ContactRow, 'id' | 'created_at' | 'updated_at' | 'status'>)
}

export async function editContact(input: {
  projectId: string
  publicId: string
  firstName?: string
  lastName?: string
  status?: ContactRow['status']
}): Promise<ContactRow> {
  const existing = await findContactByPublicId(input.projectId, input.publicId)
  if (!existing) throw new Error('Contact not found')
  return updateContact(existing.id, {
    first_name: input.firstName?.trim() || null,
    last_name: input.lastName?.trim() || null,
    status: input.status ?? existing.status,
  })
}

export async function removeContact(input: {
  projectId: string
  publicId: string
}): Promise<void> {
  const existing = await findContactByPublicId(input.projectId, input.publicId)
  if (!existing) return
  await deleteContact(existing.id)
}

export interface ImportSummary {
  attempted: number
  inserted: number
  updated: number
  skipped: Array<{ line: number; email: string; reason: string }>
}

/**
 * CSV import. Recognised headers: email (required), first_name, last_name.
 * Anything else is stored under properties.
 * Existing contacts (same project + email) are updated in place.
 */
export async function importContactsCsv(input: {
  projectId: string
  orgId: string
  csv: string
}): Promise<ImportSummary> {
  const parsed = parseCsv(input.csv)
  const emailKey = parsed.headers.find((h) => h.toLowerCase() === 'email')
  if (!emailKey) {
    return {
      attempted: 0,
      inserted: 0,
      updated: 0,
      skipped: [{ line: 1, email: '', reason: 'CSV must include an "email" column' }],
    }
  }
  const firstKey = parsed.headers.find((h) => h.toLowerCase() === 'first_name')
  const lastKey = parsed.headers.find((h) => h.toLowerCase() === 'last_name')
  const propKeys = parsed.headers.filter(
    (h) =>
      h.toLowerCase() !== 'email' &&
      h.toLowerCase() !== 'first_name' &&
      h.toLowerCase() !== 'last_name',
  )

  const sb = getServiceRoleClient()
  const summary: ImportSummary = { attempted: 0, inserted: 0, updated: 0, skipped: [] }

  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i]!
    const rawEmail = row[emailKey] ?? ''
    if (!rawEmail) continue
    summary.attempted++
    try {
      const address = parseAddress(rawEmail).address
      const properties: Record<string, string> = {}
      for (const k of propKeys) if (row[k]) properties[k] = row[k]!

      const { data: existing } = await sb
        .from('contacts')
        .select('id')
        .eq('project_id', input.projectId)
        .eq('email', address)
        .maybeSingle()

      if (existing) {
        await sb
          .from('contacts')
          .update({
            first_name: firstKey ? row[firstKey] || null : undefined,
            last_name: lastKey ? row[lastKey] || null : undefined,
            properties: propKeys.length ? properties : undefined,
          })
          .eq('id', (existing as { id: string }).id)
        summary.updated++
      } else {
        await insertContact({
          project_id: input.projectId,
          org_id: input.orgId,
          public_id: publicId('contact'),
          email: address,
          first_name: firstKey ? row[firstKey] || null : null,
          last_name: lastKey ? row[lastKey] || null : null,
          properties,
        } as unknown as Omit<ContactRow, 'id' | 'created_at' | 'updated_at' | 'status'>)
        summary.inserted++
      }
    } catch (err) {
      summary.skipped.push({
        line: i + 2, // account for the header row
        email: rawEmail,
        reason: (err as Error).message,
      })
    }
  }
  return summary
}

export { listContactsByProject, findContactByPublicId, countContacts }
