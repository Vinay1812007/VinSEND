import { withApiRoute } from '../../_lib/handler'
import { findApiKeyByPublicId, renameApiKey, revokeApiKey } from '@/server/services/api-keys'
import { ApiError } from '@/server/services/errors'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PatchSchema = z.object({ name: z.string().min(1).max(120) })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiRoute(request, { scope: 'keys.write' }, async (ctx) => {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      throw new ApiError('validation_error', 'Body must be valid JSON', 400)
    }
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiError('validation_error', 'Invalid request', 400, {
        issues: parsed.error.flatten(),
      })
    }
    await renameApiKey({
      publicId: id,
      name: parsed.data.name,
      orgId: ctx.key.orgId,
      projectId: ctx.key.projectId,
      actorUserId: ctx.key.key.created_by ?? '',
    })
    return { status: 200, body: { id, name: parsed.data.name } }
  })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiRoute(request, { scope: 'keys.write' }, async (ctx) => {
    const record = await findApiKeyByPublicId(id)
    if (!record) throw new ApiError('not_found', 'API key not found', 404)
    await revokeApiKey({
      id: record.id,
      orgId: ctx.key.orgId,
      projectId: ctx.key.projectId,
      actorUserId: ctx.key.key.created_by ?? '',
      publicId: id,
    })
    return { status: 204, body: null as unknown as never }
  })
}
