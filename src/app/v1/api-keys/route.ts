import { withApiRoute } from '../_lib/handler'
import { CreateApiKeySchema } from '@/lib/validation/emails'
import { createApiKey, listApiKeys } from '@/server/services/api-keys'
import { ApiError } from '@/server/services/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return withApiRoute(request, { scope: 'keys.read' }, async (ctx) => {
    const rows = await listApiKeys(ctx.key.projectId)
    return {
      status: 200,
      body: {
        data: rows.map((k) => ({
          id: k.public_id,
          name: k.name,
          prefix: k.prefix,
          environment: k.environment,
          scopes: k.scopes,
          created_at: k.created_at,
          last_used_at: k.last_used_at,
          revoked_at: k.revoked_at,
        })),
      },
    }
  })
}

export async function POST(request: Request) {
  return withApiRoute(request, { scope: 'keys.write' }, async (ctx) => {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      throw new ApiError('validation_error', 'Body must be valid JSON', 400)
    }
    const parsed = CreateApiKeySchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiError('validation_error', 'Invalid request', 400, {
        issues: parsed.error.flatten(),
      })
    }
    const { row, secret } = await createApiKey({
      projectId: ctx.key.projectId,
      orgId: ctx.key.orgId,
      name: parsed.data.name,
      environment: parsed.data.environment,
      scopes: parsed.data.scopes,
      actorUserId: ctx.key.key.created_by ?? '',
    })
    return {
      status: 201,
      body: {
        id: row.public_id,
        name: row.name,
        prefix: row.prefix,
        environment: row.environment,
        scopes: row.scopes,
        created_at: row.created_at,
        secret, // shown ONCE
      },
    }
  })
}
