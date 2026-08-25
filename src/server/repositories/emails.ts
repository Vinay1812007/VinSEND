import { getServiceRoleClient } from '@/lib/db/service'

export interface EmailInsert {
  id?: string
  project_id: string
  org_id: string
  public_id: string
  provider_id: string | null
  from_address: string
  from_name: string | null
  subject: string
  status: string
  tags: Record<string, string>
  metadata: Record<string, unknown>
  html_length: number | null
  text_length: number | null
  html_sha256: string | null
  request_id: string
  idempotency_key: string | null
  api_key_id: string | null
}

export interface EmailRow extends EmailInsert {
  id: string
  provider_message_id: string | null
  error_code: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface EmailRecipientInsert {
  email_id: string
  kind: 'to' | 'cc' | 'bcc' | 'reply_to'
  address: string
  status: string
}

export interface EmailEventInsert {
  email_id: string
  type: string
  provider_event_id?: string | null
  payload?: Record<string, unknown>
}

export async function createEmailWithRecipients(input: {
  email: EmailInsert
  recipients: EmailRecipientInsert[]
  event: EmailEventInsert
}): Promise<EmailRow> {
  const sb = getServiceRoleClient()

  const { data: emailRow, error: eErr } = await sb
    .from('emails')
    .insert(input.email)
    .select('*')
    .single()
  if (eErr || !emailRow) throw new Error(`createEmailWithRecipients(email): ${eErr?.message}`)

  const recipients = input.recipients.map((r) => ({ ...r, email_id: emailRow.id as string }))
  const { error: rErr } = await sb.from('email_recipients').insert(recipients)
  if (rErr) throw new Error(`createEmailWithRecipients(recipients): ${rErr.message}`)

  const { error: evErr } = await sb.from('email_events').insert({
    ...input.event,
    email_id: emailRow.id as string,
  })
  if (evErr) throw new Error(`createEmailWithRecipients(event): ${evErr.message}`)

  return emailRow as EmailRow
}

export async function updateEmailAfterSend(input: {
  id: string
  status: 'sent' | 'failed'
  providerMessageId?: string | null
  errorCode?: string | null
  errorMessage?: string | null
  event: { type: string; payload?: Record<string, unknown> }
}): Promise<void> {
  const sb = getServiceRoleClient()
  const { error } = await sb
    .from('emails')
    .update({
      status: input.status,
      provider_message_id: input.providerMessageId ?? null,
      error_code: input.errorCode ?? null,
      error_message: input.errorMessage ?? null,
    })
    .eq('id', input.id)
  if (error) throw new Error(`updateEmailAfterSend: ${error.message}`)

  const { error: evErr } = await sb.from('email_events').insert({
    email_id: input.id,
    type: input.event.type,
    payload: input.event.payload ?? {},
  })
  if (evErr) throw new Error(`updateEmailAfterSend(event): ${evErr.message}`)
}

export async function findEmailByPublicId(projectId: string, publicId: string) {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from('emails')
    .select(
      '*, email_recipients(*), email_events(id, type, occurred_at, payload)',
    )
    .eq('project_id', projectId)
    .eq('public_id', publicId)
    .maybeSingle()
  if (error) throw new Error(`findEmailByPublicId: ${error.message}`)
  return data
}

export async function listEmailsByProject(
  projectId: string,
  opts: { limit?: number; before?: string } = {},
) {
  const sb = getServiceRoleClient()
  const limit = Math.min(opts.limit ?? 25, 100)
  let q = sb
    .from('emails')
    .select('id, public_id, from_address, subject, status, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit + 1)
  if (opts.before) q = q.lt('created_at', opts.before)
  const { data, error } = await q
  if (error) throw new Error(`listEmailsByProject: ${error.message}`)
  const rows = data ?? []
  const hasMore = rows.length > limit
  return { rows: rows.slice(0, limit), hasMore }
}
