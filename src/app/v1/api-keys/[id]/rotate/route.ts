import { withApiRoute } from '../../../_lib/handler'
import { rotateApiKey } from '@/server/services/api-keys'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiRoute(request, { scope: 'keys.write' }, async (ctx) => {
    const result = await rotateApiKey({
      publicId: id,
      orgId: ctx.key.orgId,
      projectId: ctx.key.projectId,
      actorUserId: ctx.key.key.created_by ?? '',
    })
    return {
      status: 201,
      body: {
        id: result.publicId,
        secret: result.secret, // shown ONCE
        rotated_from: id,
      },
    }
  })
}
