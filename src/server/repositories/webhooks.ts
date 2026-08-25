import { getServiceRoleClient } from '@/lib/db/service'
import { decryptSecret, encryptSecret } from '@/lib/security/crypto'

export interface WebhookRow {
  id: string
  project_id: string
  org_id: string
  public_id: string
  url: string
  events: string[]
  status: 'active' | 'paused' | 'disabled'
  created_at: string
}

function scopeFor(projectId: string, webhookId: string): string {
  return `webhook:${projectId}:${webhookId}`
}

export async function createWebhook(input: {
  project_id: string
  org_id: string
  public_id: string
  url: string
  events: string[]
  secret: string
}): Promise<WebhookRow> {
  const sb = getServiceRoleClient()
  const { data: shell, error: e1 } = await sb
    .from('webhooks')
    .insert({
      project_id: input.project_id,
      org_id: input.org_id,
      public_id: input.public_id,
      url: input.url,
      events: input.events,
      signing_secret_encrypted: Buffer.alloc(29),
    })
    .select('id')
    .single()
  if (e1 || !shell) throw new Error(`createWebhook(shell): ${e1?.message}`)
  const encrypted = encryptSecret(input.secret, scopeFor(input.project_id, shell.id as string))
  const { data: full, error: e2 } = await sb
    .from('webhooks')
    .update({ signing_secret_encrypted: encrypted })
    .eq('id', shell.id)
    .select('id, project_id, org_id, public_id, url, events, status, created_at')
    .single()
  if (e2 || !full) throw new Error(`createWebhook(finalize): ${e2?.message}`)
  return full as WebhookRow
}

export async function listWebhooks(projectId: string): Promise<WebhookRow[]> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('webhooks')
    .select('id, project_id, org_id, public_id, url, events, status, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listWebhooks: ${error.message}`)
  return (data ?? []) as WebhookRow[]
}

export async function loadWebhookSecret(projectId: string, webhookId: string): Promise<string> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('webhooks')
    .select('id, signing_secret_encrypted')
    .eq('id', webhookId)
    .eq('project_id', projectId)
    .maybeSingle()
  if (error || !data) throw new Error(`loadWebhookSecret: ${error?.message}`)
  const packed = normalizeBytea((data as { signing_secret_encrypted: unknown }).signing_secret_encrypted)
  return decryptSecret(packed, scopeFor(projectId, webhookId))
}

export async function deleteWebhook(projectId: string, publicId: string): Promise<boolean> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('webhooks')
    .delete()
    .eq('project_id', projectId)
    .eq('public_id', publicId)
    .select('id')
  if (error) throw new Error(`deleteWebhook: ${error.message}`)
  return (data?.length ?? 0) > 0
}

export async function patchWebhook(input: {
  projectId: string
  publicId: string
  url?: string
  events?: string[]
  status?: 'active' | 'paused' | 'disabled'
}): Promise<WebhookRow | null> {
  const sb = getServiceRoleClient()
  const update: Record<string, unknown> = {}
  if (input.url !== undefined) update.url = input.url
  if (input.events !== undefined) update.events = input.events
  if (input.status !== undefined) update.status = input.status
  if (Object.keys(update).length === 0) return null
  const { data, error } = await sb
    .from('webhooks')
    .update(update)
    .eq('project_id', input.projectId)
    .eq('public_id', input.publicId)
    .select('id, project_id, org_id, public_id, url, events, status, created_at')
    .maybeSingle()
  if (error) throw new Error(`patchWebhook: ${error.message}`)
  return (data as WebhookRow | null) ?? null
}

export async function rotateWebhookSecret(input: {
  projectId: string
  publicId: string
  newSecret: string
}): Promise<{ id: string } | null> {
  const sb = getServiceRoleClient()
  const { data: existing } = await sb
    .from('webhooks')
    .select('id')
    .eq('project_id', input.projectId)
    .eq('public_id', input.publicId)
    .maybeSingle()
  if (!existing) return null
  const encrypted = encryptSecret(
    input.newSecret,
    scopeFor(input.projectId, (existing as { id: string }).id),
  )
  const { error } = await sb
    .from('webhooks')
    .update({ signing_secret_encrypted: encrypted })
    .eq('id', (existing as { id: string }).id)
  if (error) throw new Error(`rotateWebhookSecret: ${error.message}`)
  return existing as { id: string }
}

function normalizeBytea(v: unknown): Buffer {
  if (v == null) return Buffer.alloc(0)
  if (Buffer.isBuffer(v)) return v
  if (v instanceof Uint8Array) return Buffer.from(v)
  if (typeof v === 'string') {
    if (v.startsWith('\\x')) return Buffer.from(v.slice(2), 'hex')
    try {
      return Buffer.from(v, 'base64')
    } catch {
      return Buffer.from(v, 'utf8')
    }
  }
  return Buffer.alloc(0)
}
