import { withApiRoute } from '../_lib/handler'
import { CreateSuppressionSchema } from '@/lib/validation/emails'
import { createSuppression, listSuppressions } from '@/server/services/suppressions'
import { ApiError } from '@/server/services/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return withApiRoute(request, { scope: 'suppressions.read' }, async (ctx) => {
    const rows = await listSuppressions(ctx.key.projectId)
    return {
      status: 200,
      body: {
        data: rows.map((s) => ({
          email: s.email,
          reason: s.reason,
          source: s.source,
          created_at: s.created_at,
        })),
      },
    }
  })
}

export async function POST(request: Request) {
  return withApiRoute(request, { scope: 'suppressions.write' }, async (ctx) => {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      throw new ApiError('validation_error', 'Body must be valid JSON', 400)
    }
    const parsed = CreateSuppressionSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiError('validation_error', 'Invalid request', 400, {
        issues: parsed.error.flatten(),
      })
    }
    const row = await createSuppression({
      projectId: ctx.key.projectId,
      orgId: ctx.key.orgId,
      email: parsed.data.email,
      reason: parsed.data.reason,
      notes: parsed.data.notes,
      actorUserId: ctx.key.key.created_by,
    })
    return {
      status: 201,
      body: { email: row.email, reason: row.reason, created_at: row.created_at },
    }
  })
}
