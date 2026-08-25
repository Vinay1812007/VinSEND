import { withApiRoute } from '../../../_lib/handler'
import { getEmail } from '@/server/services/emails-query'
import { ApiError } from '@/server/services/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiRoute(request, { scope: 'emails.read' }, async (ctx) => {
    const row = await getEmail(ctx.key.projectId, id)
    if (!row) throw new ApiError('not_found', `No email with id "${id}"`, 404)
    const r = row as Record<string, unknown>
    const events =
      ((r.email_events as { type: string; occurred_at: string; payload: unknown }[]) ?? [])
        .slice()
        .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
    return {
      status: 200,
      body: {
        email_id: r.public_id,
        data: events.map((e) => ({
          type: e.type,
          occurred_at: e.occurred_at,
          payload: e.payload,
        })),
      },
    }
  })
}
