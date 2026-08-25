// Zod schemas for the public email API. Shared by the route handler and
// the dashboard "test send" form.

import { z } from 'zod'

const MAX_RECIPIENTS = 50
const MAX_SUBJECT = 998
const MAX_BODY_BYTES = 10 * 1024 * 1024 // 10 MiB

const AddressString = z
  .string()
  .trim()
  .min(3, 'Address too short')
  .max(320, 'Address exceeds 320 characters')

const AddressList = z
  .array(AddressString)
  .min(1)
  .max(MAX_RECIPIENTS, `At most ${MAX_RECIPIENTS} recipients`)

const OptionalAddressList = z
  .array(AddressString)
  .max(MAX_RECIPIENTS, `At most ${MAX_RECIPIENTS} recipients`)
  .optional()

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10 MiB per attachment
const MAX_ATTACHMENTS = 20

const AttachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  content_type: z.string().min(1).max(255).optional(),
  content: z
    .string()
    .min(1)
    .max(Math.ceil((MAX_ATTACHMENT_BYTES * 4) / 3))
    .describe('base64-encoded content'),
})

export const SendEmailSchema = z
  .object({
    from: AddressString,
    to: AddressList,
    cc: OptionalAddressList,
    bcc: OptionalAddressList,
    reply_to: OptionalAddressList,
    subject: z.string().min(1).max(MAX_SUBJECT),
    html: z.string().max(MAX_BODY_BYTES).optional(),
    text: z.string().max(MAX_BODY_BYTES).optional(),
    headers: z.record(z.string(), z.string()).optional(),
    tags: z.record(z.string(), z.string()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    attachments: z.array(AttachmentSchema).max(MAX_ATTACHMENTS).optional(),
    template_id: z.string().optional(),
    variables: z.record(z.string(), z.string()).optional(),
  })
  .refine((v) => v.html || v.text || v.template_id, {
    message: 'Provide html, text, or template_id',
    path: ['html'],
  })

export type SendEmailInput = z.infer<typeof SendEmailSchema>

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(120),
  environment: z.enum(['live', 'test']).default('live'),
  scopes: z.array(z.string()).optional(),
})

export const CreateDomainSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(253)
    .regex(
      /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/,
      'Not a valid domain name',
    ),
  provider_id: z.string().uuid().optional(),
})

export const CreateSuppressionSchema = z.object({
  email: z.string().email(),
  reason: z.enum(['manual', 'unsubscribe']).default('manual'),
  notes: z.string().max(500).optional(),
})

export const CreateWebhookSchema = z.object({
  url: z.string().url().refine((u) => u.startsWith('https://'), {
    message: 'Webhook URL must use HTTPS',
  }),
  events: z.array(z.string()).min(1),
})
