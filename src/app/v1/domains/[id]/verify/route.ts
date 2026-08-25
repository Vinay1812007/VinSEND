import { withApiRoute } from '../../../_lib/handler'
import { verifyDomain } from '@/server/services/domains'
import { ApiError } from '@/server/services/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiRoute(request, { scope: 'domains.write' }, async (ctx) => {
    const found = await verifyDomain({
      projectId: ctx.key.projectId,
      orgId: ctx.key.orgId,
      publicId: id,
    })
    if (!found) throw new ApiError('not_found', `No domain with id "${id}"`, 404)
    return {
      status: 200,
      body: {
        id: found.domain.public_id,
        domain: found.domain.domain,
        status: found.domain.status,
        records: found.records.map((r) => ({
          type: r.type,
          host: r.host,
          value: r.expected_value,
          last_seen: r.last_seen_value,
          status: r.status,
        })),
      },
    }
  })
}
