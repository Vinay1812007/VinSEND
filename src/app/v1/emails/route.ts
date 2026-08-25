import { withApiRoute } from '../_lib/handler'
import { sendEmail } from '@/server/services/emails'
import { listEmails } from '@/server/services/emails-query'
import { ApiError } from '@/server/services/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return withApiRoute(request, { scope: 'emails.send' }, async (ctx) => {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      throw new ApiError('validation_error', 'Body must be valid JSON', 400)
    }
    const idempotency = request.headers.get('idempotency-key')?.slice(0, 255) ?? null

    const result = await sendEmail(body, {
      projectId: ctx.key.projectId,
      orgId: ctx.key.orgId,
      apiKeyId: ctx.key.key.id,
      requestId: ctx.requestId,
      idempotencyKey: idempotency,
      rawBody: body,
    })
    return result as { status: number; body: unknown }
  })
}

export async function GET(request: Request) {
  return withApiRoute(request, { scope: 'emails.read' }, async (ctx) => {
    const url = new URL(request.url)
    const limit = clamp(Number(url.searchParams.get('limit') ?? 25), 1, 100)
    const before = url.searchParams.get('before') ?? undefined
    const { rows, hasMore } = await listEmails(ctx.key.projectId, { limit, before })
    return {
      status: 200,
      body: {
        data: rows.map((r) => ({
          id: r.public_id,
          from: r.from_address,
          subject: r.subject,
          status: r.status,
          created_at: r.created_at,
        })),
        has_more: hasMore,
      },
    }
  })
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo
  return Math.min(hi, Math.max(lo, n))
}
