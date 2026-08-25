import { withApiRoute } from '../_lib/handler'
import { CreateWebhookSchema } from '@/lib/validation/emails'
import { listWebhooks, registerWebhook } from '@/server/services/webhooks'
import { ApiError } from '@/server/services/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return withApiRoute(request, { scope: 'webhooks.read' }, async (ctx) => {
    const rows = await listWebhooks(ctx.key.projectId)
    return {
      status: 200,
      body: {
        data: rows.map((w) => ({
          id: w.public_id,
          url: w.url,
          events: w.events,
          status: w.status,
          created_at: w.created_at,
        })),
      },
    }
  })
}

export async function POST(request: Request) {
  return withApiRoute(request, { scope: 'webhooks.write' }, async (ctx) => {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      throw new ApiError('validation_error', 'Body must be valid JSON', 400)
    }
    const parsed = CreateWebhookSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiError('validation_error', 'Invalid request', 400, {
        issues: parsed.error.flatten(),
      })
    }
    const created = await registerWebhook({
      projectId: ctx.key.projectId,
      orgId: ctx.key.orgId,
      actorUserId: ctx.key.key.created_by,
      url: parsed.data.url,
      events: parsed.data.events,
    })
    return {
      status: 201,
      body: {
        id: created.row.public_id,
        url: created.row.url,
        events: created.row.events,
        signing_secret: created.secret, // shown ONCE
        created_at: created.row.created_at,
      },
    }
  })
}
