import { withApiRoute } from '../../_lib/handler'
import { getEmail } from '@/server/services/emails-query'
import { ApiError } from '@/server/services/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiRoute(request, { scope: 'emails.read' }, async (ctx) => {
    const row = await getEmail(ctx.key.projectId, id)
    if (!row) throw new ApiError('not_found', `No email found with id "${id}"`, 404)
    const r = row as Record<string, unknown>
    return {
      status: 200,
      body: {
        id: r.public_id,
        from: r.from_address,
        subject: r.subject,
        status: r.status,
        tags: r.tags,
        metadata: r.metadata,
        provider_message_id: r.provider_message_id,
        created_at: r.created_at,
        events:
          (r.email_events as { id: string; type: string; occurred_at: string; payload: unknown }[])
            ?.slice()
            ?.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
            ?.map((e) => ({ type: e.type, occurred_at: e.occurred_at, payload: e.payload })) ?? [],
        recipients:
          (r.email_recipients as { kind: string; address: string; status: string }[])?.map((rr) => ({
            kind: rr.kind,
            address: rr.address,
            status: rr.status,
          })) ?? [],
      },
    }
  })
}
