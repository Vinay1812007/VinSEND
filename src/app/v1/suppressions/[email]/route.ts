import { withApiRoute } from '../../_lib/handler'
import { deleteSuppression } from '@/server/services/suppressions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(request: Request, { params }: { params: Promise<{ email: string }> }) {
  const { email } = await params
  return withApiRoute(request, { scope: 'suppressions.write' }, async (ctx) => {
    await deleteSuppression({
      projectId: ctx.key.projectId,
      orgId: ctx.key.orgId,
      email: decodeURIComponent(email),
      actorUserId: ctx.key.key.created_by,
    })
    return { status: 204, body: null as unknown as never }
  })
}
