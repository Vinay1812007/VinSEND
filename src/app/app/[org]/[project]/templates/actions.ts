'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentUser } from '@/lib/auth/server'
import { loadDashboardContext } from '@/server/services/current-context'
import {
  archiveTemplate,
  createTemplate,
  duplicateTemplate,
  editTemplate,
  restoreTemplateVersion,
} from '@/server/services/templates'

export async function createTemplateAction(input: {
  orgSlug: string
  projectPublicId: string
  name: string
  subject: string
  html: string
  text: string
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  const user = await requireCurrentUser()
  try {
    const row = await createTemplate({
      projectId: ctx.project.id,
      orgId: ctx.org.id,
      actorUserId: user.id,
      name: input.name,
      subject: input.subject,
      html: input.html,
      text: input.text || null,
    })
    revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/templates`)
    return { publicId: row.public_id }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export async function editTemplateAction(input: {
  orgSlug: string
  projectPublicId: string
  publicId: string
  name: string
  subject: string
  html: string
  text: string
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  const user = await requireCurrentUser()
  try {
    await editTemplate({
      projectId: ctx.project.id,
      orgId: ctx.org.id,
      actorUserId: user.id,
      publicId: input.publicId,
      name: input.name,
      subject: input.subject,
      html: input.html,
      text: input.text || null,
    })
    revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/templates/${input.publicId}`)
    return { ok: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export async function duplicateTemplateAction(input: {
  orgSlug: string
  projectPublicId: string
  publicId: string
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  const user = await requireCurrentUser()
  try {
    const row = await duplicateTemplate({
      projectId: ctx.project.id,
      orgId: ctx.org.id,
      actorUserId: user.id,
      publicId: input.publicId,
    })
    revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/templates`)
    return { publicId: row.public_id }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export async function restoreTemplateVersionAction(input: {
  orgSlug: string
  projectPublicId: string
  publicId: string
  version: number
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  const user = await requireCurrentUser()
  try {
    await restoreTemplateVersion({
      projectId: ctx.project.id,
      orgId: ctx.org.id,
      actorUserId: user.id,
      publicId: input.publicId,
      version: input.version,
    })
    revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/templates/${input.publicId}`)
    return { ok: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export async function archiveTemplateAction(input: {
  orgSlug: string
  projectPublicId: string
  publicId: string
}) {
  const ctx = await loadDashboardContext(input.orgSlug, input.projectPublicId)
  const user = await requireCurrentUser()
  try {
    await archiveTemplate({
      projectId: ctx.project.id,
      orgId: ctx.org.id,
      actorUserId: user.id,
      publicId: input.publicId,
    })
    revalidatePath(`/app/${input.orgSlug}/${input.projectPublicId}/templates`)
    return { ok: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
}
