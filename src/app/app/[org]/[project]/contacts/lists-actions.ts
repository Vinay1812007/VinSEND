'use server'

import { revalidatePath } from 'next/cache'
import { loadDashboardContext } from '@/server/services/current-context'
import {
  createList,
  createSegment,
  deleteList,
  deleteSegment,
  type SegmentFilter,
} from '@/server/services/contact-lists'

export async function createListAction(input: {
  orgSlug: string
  projectPublicId: string
  name: string
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  try {
    const row = await createList({ projectId: ctx.project.id, orgId: ctx.org.id, name: input.name })
    revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/contacts/lists`)
    return { id: row.id }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export async function deleteListAction(input: {
  orgSlug: string
  projectPublicId: string
  listId: string
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  await deleteList({ projectId: ctx.project.id, listId: input.listId })
  revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/contacts/lists`)
  return { ok: true }
}

export async function createSegmentAction(input: {
  orgSlug: string
  projectPublicId: string
  name: string
  filter: SegmentFilter
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  try {
    const row = await createSegment({
      projectId: ctx.project.id,
      orgId: ctx.org.id,
      name: input.name,
      filter: input.filter,
    })
    revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/contacts/segments`)
    return { id: row.id }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export async function deleteSegmentAction(input: {
  orgSlug: string
  projectPublicId: string
  segmentId: string
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  await deleteSegment({ projectId: ctx.project.id, segmentId: input.segmentId })
  revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/contacts/segments`)
  return { ok: true }
}
