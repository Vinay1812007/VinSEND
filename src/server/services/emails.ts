// The core send pipeline. This is the vertical slice of the §48 milestone.
//
// Contract:
//   authenticate → validate → suppress-check → persist(queued)
//     → provider.sendEmail → update(sent|failed) → return { id, status, created_at }

import { createHash } from 'node:crypto'
import { parseAddress, parseAddressList, validateHeaderValue } from '@/lib/security/addresses'
import { publicId } from '@/lib/ids'
import { logger } from '@/lib/logger'
import { issueUnsubscribeToken } from '@/lib/security/unsubscribe'
import { publicEnv } from '@/lib/validation/env'
import { providerFrom } from '@/lib/email/registry'
import type { ProviderRecipient } from '@/lib/email/types/provider'
import { SendEmailSchema, type SendEmailInput } from '@/lib/validation/emails'
import {
  createEmailWithRecipients,
  updateEmailAfterSend,
} from '@/server/repositories/emails'
import { findDefaultProvider } from '@/server/repositories/providers'
import { isDomainVerified } from '@/server/repositories/domains'
import { filterSuppressed } from '@/server/repositories/suppressions'
import {
  findIdempotencyRecord,
  hashRequestBody,
  storeIdempotencyRecord,
} from '@/server/repositories/idempotency'
import { ApiError } from '@/server/services/errors'
import { enqueueEventForProject } from '@/server/services/webhook-events'
import { findTemplateByPublicId } from '@/server/services/templates'
import {
  renderTemplate,
  validateTemplateVariables,
} from '@/lib/templating/render'

export interface SendEmailResult {
  id: string
  status: 'queued' | 'sent' | 'failed'
  created_at: string
}

export interface SendEmailContext {
  projectId: string
  orgId: string
  apiKeyId: string
  requestId: string
  idempotencyKey?: string | null
  rawBody: unknown
  /**
   * When true, sends synchronously in the request path (MVP default).
   * When a queue is wired up, callers may set this to false.
   */
  sendInline?: boolean
}

export async function sendEmail(
  rawInput: unknown,
  ctx: SendEmailContext,
): Promise<{ status: number; body: SendEmailResult | { error: unknown } }> {
  const log = logger.child({ request_id: ctx.requestId, project_id: ctx.projectId })

  // --- Idempotency short-circuit -------------------------------------------
  if (ctx.idempotencyKey) {
    const prior = await findIdempotencyRecord(ctx.projectId, ctx.idempotencyKey)
    if (prior) {
      const currentHash = hashRequestBody(ctx.rawBody)
      if (prior.request_hash !== currentHash) {
        throw new ApiError(
          'idempotency_conflict',
          'Idempotency-Key was reused with a different request body',
        )
      }
      log.debug('email.send.idempotent_hit')
      return { status: prior.response_status, body: prior.response_body as unknown as SendEmailResult }
    }
  }

  // --- Parse + validate ----------------------------------------------------
  const parsed = SendEmailSchema.safeParse(rawInput)
  if (!parsed.success) {
    throw new ApiError('validation_error', 'Invalid request', 400, {
      issues: parsed.error.flatten(),
    })
  }
  const input: SendEmailInput = parsed.data

  // If a template_id is supplied, render it into subject/html/text before
  // running the rest of the pipeline.
  if (input.template_id) {
    const tmpl = await findTemplateByPublicId(ctx.projectId, input.template_id)
    if (!tmpl) {
      throw new ApiError('not_found', `Template "${input.template_id}" not found`, 404)
    }
    const variables = input.variables ?? {}
    const check = validateTemplateVariables(
      `${tmpl.subject}\n${tmpl.html}\n${tmpl.text ?? ''}`,
      variables,
    )
    if (!check.ok) {
      throw new ApiError(
        'validation_error',
        `Template "${input.template_id}" requires variables: ${check.missing.join(', ')}`,
        400,
        { missing: check.missing },
      )
    }
    // Fill only if the caller didn't already supply subject/html/text.
    ;(input as SendEmailInput).subject = input.subject || renderTemplate(tmpl.subject, variables)
    ;(input as SendEmailInput).html = input.html ?? renderTemplate(tmpl.html, variables)
    ;(input as SendEmailInput).text =
      input.text ?? (tmpl.text ? renderTemplate(tmpl.text, variables) : undefined)
  }

  const from = safeParseSingle('from', input.from)
  const to = safeParseMany('to', input.to)
  const cc = input.cc ? safeParseMany('cc', input.cc) : []
  const bcc = input.bcc ? safeParseMany('bcc', input.bcc) : []
  const replyTo = input.reply_to ? safeParseMany('reply_to', input.reply_to) : []

  // Header injection guard.
  if (input.headers) {
    for (const [k, v] of Object.entries(input.headers)) {
      try {
        validateHeaderValue(k, v)
      } catch (err) {
        throw new ApiError(
          'validation_error',
          (err as Error).message,
          400,
          { header: k },
        )
      }
    }
  }

  // --- Verified sender check ----------------------------------------------
  const verified = await isDomainVerified(ctx.projectId, from.domain)
  if (!verified) {
    throw new ApiError(
      'domain_not_verified',
      `The sender domain "${from.domain}" has not been verified for this project.`,
    )
  }

  // --- Provider resolution -------------------------------------------------
  const providerRow = await findDefaultProvider(ctx.projectId)
  if (!providerRow) {
    throw new ApiError(
      'provider_not_configured',
      'No default email provider is configured for this project.',
    )
  }
  const provider = providerFrom(providerRow.type, providerRow.config)

  // --- Suppression filtering ----------------------------------------------
  const allRecipients = [...to, ...cc, ...bcc].map((r) => r.address)
  const { allowed, suppressed } = await filterSuppressed(ctx.projectId, allRecipients)
  if (allowed.length === 0) {
    throw new ApiError(
      'all_recipients_suppressed',
      'All recipients are on this project\'s suppression list.',
      422,
      { suppressed },
    )
  }
  const isAllowed = (addr: string) => allowed.includes(addr)
  const toFiltered = to.filter((r) => isAllowed(r.address))
  const ccFiltered = cc.filter((r) => isAllowed(r.address))
  const bccFiltered = bcc.filter((r) => isAllowed(r.address))

  // --- Persist as queued ---------------------------------------------------
  const emailPublicId = publicId('email')
  const created = await createEmailWithRecipients({
    email: {
      project_id: ctx.projectId,
      org_id: ctx.orgId,
      public_id: emailPublicId,
      provider_id: providerRow.id,
      from_address: from.address,
      from_name: from.name,
      subject: input.subject,
      status: 'queued',
      tags: input.tags ?? {},
      metadata: input.metadata ?? {},
      html_length: input.html ? input.html.length : null,
      text_length: input.text ? input.text.length : null,
      html_sha256: input.html ? createHash('sha256').update(input.html).digest('hex') : null,
      request_id: ctx.requestId,
      idempotency_key: ctx.idempotencyKey ?? null,
      api_key_id: ctx.apiKeyId,
    },
    recipients: [
      ...toFiltered.map((r) => ({ email_id: '', kind: 'to' as const, address: r.address, status: 'queued' })),
      ...ccFiltered.map((r) => ({ email_id: '', kind: 'cc' as const, address: r.address, status: 'queued' })),
      ...bccFiltered.map((r) => ({ email_id: '', kind: 'bcc' as const, address: r.address, status: 'queued' })),
      ...replyTo.map((r) => ({ email_id: '', kind: 'reply_to' as const, address: r.address, status: 'queued' })),
    ],
    event: { email_id: '', type: 'email.queued' },
  })

  const created_at = created.created_at

  // --- Send inline (MVP) --------------------------------------------------
  if (ctx.sendInline !== false) {
    // Attach one List-Unsubscribe header per primary To recipient. We can
    // only ship one header set through the provider, so use the first `to`
    // address as the token subject — the recipient can always click the
    // link inside the email body if we later embed per-user links.
    const primary = toFiltered[0]?.address ?? from.address
    const unsubToken = issueUnsubscribeToken({
      projectId: ctx.projectId,
      email: primary,
    })
    const unsubUrl = `${publicEnv.APP_URL}/u/${unsubToken}`
    const oneClickUrl = `${publicEnv.APP_URL}/u/${unsubToken}/one-click`
    const listUnsubHeaders = {
      'List-Unsubscribe': `<${oneClickUrl}>, <${unsubUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    }

    const providerInput = {
      messageId: emailPublicId,
      from: toProviderRecipient(from),
      to: toFiltered.map(toProviderRecipient),
      cc: ccFiltered.map(toProviderRecipient),
      bcc: bccFiltered.map(toProviderRecipient),
      replyTo: replyTo.map(toProviderRecipient),
      subject: input.subject,
      html: input.html,
      text: input.text,
      headers: { ...listUnsubHeaders, ...(input.headers ?? {}) },
      tags: input.tags,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        contentType: a.content_type,
        content: a.content,
      })),
    }
    const result = await provider.sendEmail(providerInput)
    if (result.ok) {
      await updateEmailAfterSend({
        id: created.id,
        status: 'sent',
        providerMessageId: result.providerMessageId,
        event: { type: 'email.sent', payload: { provider_message_id: result.providerMessageId } },
      })
      // Fire-and-forget webhook enqueue for both queued + sent transitions.
      void enqueueEventForProject({
        projectId: ctx.projectId,
        eventType: 'email.queued',
        data: { email_id: emailPublicId },
      })
      void enqueueEventForProject({
        projectId: ctx.projectId,
        eventType: 'email.sent',
        data: { email_id: emailPublicId, provider_message_id: result.providerMessageId },
      })
      const body: SendEmailResult = { id: emailPublicId, status: 'sent', created_at }
      if (ctx.idempotencyKey) {
        await storeIdempotencyRecord({
          project_id: ctx.projectId,
          key: ctx.idempotencyKey,
          request_hash: hashRequestBody(ctx.rawBody),
          response_body: body as unknown as Record<string, unknown>,
          response_status: 202,
        })
      }
      log.info('email.sent', { email_id: emailPublicId, provider: providerRow.type })
      return { status: 202, body }
    } else {
      await updateEmailAfterSend({
        id: created.id,
        status: 'failed',
        errorCode: result.error.code,
        errorMessage: result.error.message,
        event: { type: 'email.failed', payload: { code: result.error.code } },
      })
      void enqueueEventForProject({
        projectId: ctx.projectId,
        eventType: 'email.failed',
        data: { email_id: emailPublicId, code: result.error.code },
      })
      log.warn('email.failed', {
        email_id: emailPublicId,
        provider: providerRow.type,
        code: result.error.code,
      })
      throw new ApiError('provider_error', result.error.message, 502, { code: result.error.code })
    }
  }

  // Async path — return queued.
  const body: SendEmailResult = { id: emailPublicId, status: 'queued', created_at }
  if (ctx.idempotencyKey) {
    await storeIdempotencyRecord({
      project_id: ctx.projectId,
      key: ctx.idempotencyKey,
      request_hash: hashRequestBody(ctx.rawBody),
      response_body: body as unknown as Record<string, unknown>,
      response_status: 202,
    })
  }
  return { status: 202, body }
}

function toProviderRecipient(r: { name: string | null; address: string }): ProviderRecipient {
  return { name: r.name ?? undefined, address: r.address }
}

function safeParseSingle(field: string, value: string) {
  try {
    return parseAddress(value)
  } catch (err) {
    throw new ApiError(
      field === 'from' ? 'invalid_sender' : 'invalid_recipient',
      `Invalid ${field} address: ${(err as Error).message}`,
      400,
    )
  }
}

function safeParseMany(field: string, values: readonly string[]) {
  try {
    return parseAddressList(values)
  } catch (err) {
    throw new ApiError('invalid_recipient', `Invalid ${field}: ${(err as Error).message}`, 400)
  }
}
