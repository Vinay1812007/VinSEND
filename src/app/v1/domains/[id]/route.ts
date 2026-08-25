import { withApiRoute } from '../../_lib/handler'
import { findDomainWithRecords } from '@/server/services/domains'
import { ApiError } from '@/server/services/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiRoute(request, { scope: 'domains.read' }, async (ctx) => {
    const found = await findDomainWithRecords(ctx.key.projectId, id)
    if (!found) throw new ApiError('not_found', `No domain with id "${id}"`, 404)
    return {
      status: 200,
      body: {
        id: found.domain.public_id,
        domain: found.domain.domain,
        status: found.domain.status,
        verified_at: found.domain.verified_at,
        created_at: found.domain.created_at,
        records: found.records.map((r) => ({
          type: r.type,
          host: r.host,
          value: r.expected_value,
          last_seen: r.last_seen_value,
          ttl: r.ttl,
          notes: r.notes,
          status: r.status,
        })),
      },
    }
  })
}
