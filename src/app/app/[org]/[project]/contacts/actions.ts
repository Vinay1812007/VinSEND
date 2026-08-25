'use server'

import { revalidatePath } from 'next/cache'
import { loadDashboardContext } from '@/server/services/current-context'
import { createContact, importContactsCsv, removeContact } from '@/server/services/contacts'

export async function createContactAction(input: {
  orgSlug: string
  projectPublicId: string
  email: string
  firstName: string
  lastName: string
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  try {
    const row = await createContact({
      projectId: ctx.project.id,
      orgId: ctx.org.id,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
    })
    revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/contacts`)
    return { publicId: row.public_id }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export async function deleteContactAction(input: {
  orgSlug: string
  projectPublicId: string
  publicId: string
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  await removeContact({ projectId: ctx.project.id, publicId: input.publicId })
  revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/contacts`)
  return { ok: true }
}

export async function importContactsAction(input: {
  orgSlug: string
  projectPublicId: string
  csv: string
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  if (input.csv.length > 5 * 1024 * 1024) {
    return { error: 'CSV file exceeds 5 MB. Split the import into smaller batches.' }
  }
  try {
    const summary = await importContactsCsv({
      projectId: ctx.project.id,
      orgId: ctx.org.id,
      csv: input.csv,
    })
    revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/contacts`)
    return summary
  } catch (err) {
    return { error: (err as Error).message }
  }
}
