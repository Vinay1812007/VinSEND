// RFC 8058 one-click unsubscribe. Mail clients POST to this URL when the
// user hits the "unsubscribe" button natively.
import { verifyUnsubscribeToken } from '@/lib/security/unsubscribe'
import { addSuppressionFromUnsubscribe } from '@/server/services/suppressions'
import { getServiceRoleClient } from '@/lib/db/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const payload = verifyUnsubscribeToken(token)
  if (!payload) {
    return new Response('invalid_token', { status: 400 })
  }
  const sb = getServiceRoleClient()
  const { data: project } = await sb
    .from('projects')
    .select('org_id')
    .eq('id', payload.projectId)
    .maybeSingle()
  if (!project) return new Response('project_missing', { status: 404 })
  await addSuppressionFromUnsubscribe({
    projectId: payload.projectId,
    orgId: (project as { org_id: string }).org_id,
    email: payload.email,
  })
  return new Response('ok', { status: 200 })
}
