import { withApiRoute } from '../../_lib/handler'
import { removeWebhook, updateWebhook } from '@/server/services/webhooks'
import { ApiError } from '@/server/services/errors'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PatchSchema = z.object({
  url: z.string().url().refine((u) => u.startsWith('https://'), 'must be https').optional(),
  events: z.array(z.string()).min(1).optional(),
  status: z.enum(['active', 'paused', 'disabled']).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiRoute(request, { scope: 'webhooks.write' }, async (ctx) => {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      throw new ApiError('validation_error', 'Body must be valid JSON', 400)
    }
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiError('validation_error', 'Invalid request', 400, {
        issues: parsed.error.flatten(),
      })
    }
    const row = await updateWebhook({
      projectId: ctx.key.projectId,
      orgId: ctx.key.orgId,
      publicId: id,
      actorUserId: ctx.key.key.created_by,
      ...parsed.data,
    })
    return {
      status: 200,
      body: {
        id: row.public_id,
        url: row.url,
        events: row.events,
        status: row.status,
      },
    }
  })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiRoute(request, { scope: 'webhooks.write' }, async (ctx) => {
    await removeWebhook({
      projectId: ctx.key.projectId,
      orgId: ctx.key.orgId,
      publicId: id,
      actorUserId: ctx.key.key.created_by,
    })
    return { status: 204, body: null as unknown as never }
  })
}
