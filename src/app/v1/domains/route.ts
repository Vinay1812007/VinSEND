import { withApiRoute } from '../_lib/handler'
import { CreateDomainSchema } from '@/lib/validation/emails'
import { addDomain, listDomainsByProject } from '@/server/services/domains'
import { ApiError } from '@/server/services/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return withApiRoute(request, { scope: 'domains.read' }, async (ctx) => {
    const rows = await listDomainsByProject(ctx.key.projectId)
    return {
      status: 200,
      body: {
        data: rows.map((d) => ({
          id: d.public_id,
          domain: d.domain,
          status: d.status,
          created_at: d.created_at,
          verified_at: d.verified_at,
        })),
      },
    }
  })
}

export async function POST(request: Request) {
  return withApiRoute(request, { scope: 'domains.write' }, async (ctx) => {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      throw new ApiError('validation_error', 'Body must be valid JSON', 400)
    }
    const parsed = CreateDomainSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiError('validation_error', 'Invalid request', 400, {
        issues: parsed.error.flatten(),
      })
    }
    const result = await addDomain({
      projectId: ctx.key.projectId,
      orgId: ctx.key.orgId,
      actorUserId: ctx.key.key.created_by ?? '',
      domain: parsed.data.domain,
    })
    if (!result) throw new ApiError('internal_error', 'Failed to create domain', 500)
    return {
      status: 201,
      body: {
        id: result.domain.public_id,
        domain: result.domain.domain,
        status: result.domain.status,
        records: result.records.map((r) => ({
          type: r.type,
          host: r.host,
          value: r.expected_value,
          ttl: r.ttl,
          notes: r.notes,
          status: r.status,
        })),
      },
    }
  })
}
