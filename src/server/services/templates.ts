import { publicId } from '@/lib/ids'
import { extractTemplateVariables, renderTemplate } from '@/lib/templating/render'
import {
  bumpTemplateVersion,
  deleteTemplate,
  findTemplateByPublicId,
  insertTemplate,
  listTemplatesByProject,
  updateTemplate,
  type TemplateRow,
} from '@/server/repositories/templates'
import { recordAuditEvent } from '@/server/repositories/audit'
import { getServiceRoleClient } from '@/lib/db/service'

export async function createTemplate(input: {
  projectId: string
  orgId: string
  actorUserId: string
  name: string
  subject: string
  html: string
  text?: string | null
}): Promise<TemplateRow> {
  const vars = extractTemplateVariables(`${input.subject}\n${input.html}\n${input.text ?? ''}`)
  const row = await insertTemplate({
    project_id: input.projectId,
    org_id: input.orgId,
    public_id: publicId('tmpl'),
    name: input.name.trim(),
    subject: input.subject,
    html: input.html,
    text: input.text ?? null,
    variables: vars,
  } as unknown as Omit<TemplateRow, 'id' | 'created_at' | 'updated_at' | 'version' | 'status'>)
  await recordAuditEvent({
    org_id: input.orgId,
    project_id: input.projectId,
    actor_user_id: input.actorUserId,
    action: 'template.created',
    resource_type: 'template',
    resource_id: row.public_id,
  })
  return row
}

export async function editTemplate(input: {
  projectId: string
  orgId: string
  actorUserId: string
  publicId: string
  name: string
  subject: string
  html: string
  text?: string | null
}): Promise<TemplateRow> {
  const existing = await findTemplateByPublicId(input.projectId, input.publicId)
  if (!existing) throw new Error('Template not found')
  const vars = extractTemplateVariables(`${input.subject}\n${input.html}\n${input.text ?? ''}`)

  // Snapshot the CURRENT version into the history table BEFORE we overwrite.
  const sb = getServiceRoleClient()
  await sb.from('template_versions').insert({
    template_id: existing.id,
    org_id: input.orgId,
    version: existing.version,
    name: existing.name,
    subject: existing.subject,
    html: existing.html,
    text: existing.text,
    variables: existing.variables,
    created_by: input.actorUserId,
  })

  const row = await updateTemplate(existing.id, {
    name: input.name.trim(),
    subject: input.subject,
    html: input.html,
    text: input.text ?? null,
    variables: vars,
  })
  await bumpTemplateVersion(existing.id)
  await recordAuditEvent({
    org_id: input.orgId,
    project_id: input.projectId,
    actor_user_id: input.actorUserId,
    action: 'template.updated',
    resource_type: 'template',
    resource_id: input.publicId,
  })
  return row
}

export async function duplicateTemplate(input: {
  projectId: string
  orgId: string
  actorUserId: string
  publicId: string
}): Promise<TemplateRow> {
  const existing = await findTemplateByPublicId(input.projectId, input.publicId)
  if (!existing) throw new Error('Template not found')
  return createTemplate({
    projectId: input.projectId,
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    name: `${existing.name} (copy)`,
    subject: existing.subject,
    html: existing.html,
    text: existing.text,
  })
}

export interface TemplateVersion {
  version: number
  name: string
  subject: string
  html: string
  text: string | null
  created_at: string
}

export async function listTemplateVersions(input: {
  projectId: string
  publicId: string
}): Promise<TemplateVersion[]> {
  const existing = await findTemplateByPublicId(input.projectId, input.publicId)
  if (!existing) return []
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('template_versions')
    .select('version, name, subject, html, text, created_at')
    .eq('template_id', existing.id)
    .order('version', { ascending: false })
  if (error) throw new Error(`listTemplateVersions: ${error.message}`)
  return (data ?? []) as TemplateVersion[]
}

export async function restoreTemplateVersion(input: {
  projectId: string
  orgId: string
  actorUserId: string
  publicId: string
  version: number
}): Promise<void> {
  const existing = await findTemplateByPublicId(input.projectId, input.publicId)
  if (!existing) throw new Error('Template not found')
  const sb = getServiceRoleClient()
  const { data: snap } = await sb
    .from('template_versions')
    .select('name, subject, html, text, variables')
    .eq('template_id', existing.id)
    .eq('version', input.version)
    .maybeSingle()
  if (!snap) throw new Error('Version not found')
  await editTemplate({
    projectId: input.projectId,
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    publicId: input.publicId,
    name: (snap as { name: string }).name,
    subject: (snap as { subject: string }).subject,
    html: (snap as { html: string }).html,
    text: (snap as { text: string | null }).text,
  })
  await recordAuditEvent({
    org_id: input.orgId,
    project_id: input.projectId,
    actor_user_id: input.actorUserId,
    action: 'template.version_restored',
    resource_type: 'template',
    resource_id: input.publicId,
    metadata: { restored_version: input.version },
  })
}

export async function archiveTemplate(input: {
  projectId: string
  orgId: string
  actorUserId: string
  publicId: string
}): Promise<void> {
  const existing = await findTemplateByPublicId(input.projectId, input.publicId)
  if (!existing) throw new Error('Template not found')
  await deleteTemplate(existing.id)
  await recordAuditEvent({
    org_id: input.orgId,
    project_id: input.projectId,
    actor_user_id: input.actorUserId,
    action: 'template.deleted',
    resource_type: 'template',
    resource_id: input.publicId,
  })
}

export function previewTemplate(input: {
  subject: string
  html: string
  variables: Record<string, string>
}) {
  return {
    subject: renderTemplate(input.subject, input.variables),
    html: renderTemplate(input.html, input.variables),
  }
}

export { listTemplatesByProject, findTemplateByPublicId }
