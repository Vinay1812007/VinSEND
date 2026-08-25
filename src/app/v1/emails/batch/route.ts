// Batch send. Accepts an array of email requests, 1..100 per call.
// Runs them concurrently with a small parallelism cap and returns a
// per-item result array so callers can retry individual failures.

import { withApiRoute } from '../../_lib/handler'
import { sendEmail } from '@/server/services/emails'
import { ApiError, isApiError } from '@/server/services/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CONCURRENCY = 5
const MAX_BATCH = 100

export async function POST(request: Request) {
  return withApiRoute(request, { scope: 'emails.send' }, async (ctx) => {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      throw new ApiError('validation_error', 'Body must be valid JSON', 400)
    }
    if (!Array.isArray(body)) {
      throw new ApiError('validation_error', 'Body must be a JSON array of email requests', 400)
    }
    const items = body as unknown[]
    if (items.length === 0 || items.length > MAX_BATCH) {
      throw new ApiError(
        'validation_error',
        `Batch size must be between 1 and ${MAX_BATCH}`,
        400,
      )
    }

    const results: Array<
      | { index: number; ok: true; id: string; status: string }
      | { index: number; ok: false; error: { code: string; message: string } }
    > = new Array(items.length)

    // Simple bounded-concurrency loop.
    let cursor = 0
    async function worker() {
      while (true) {
        const i = cursor++
        if (i >= items.length) return
        try {
          const res = await sendEmail(items[i], {
            projectId: ctx.key.projectId,
            orgId: ctx.key.orgId,
            apiKeyId: ctx.key.key.id,
            requestId: `${ctx.requestId}.${i}`,
            idempotencyKey: null,
            rawBody: items[i],
          })
          const rBody = res.body as { id?: string; status?: string }
          if (rBody?.id) {
            results[i] = { index: i, ok: true, id: rBody.id, status: rBody.status ?? 'queued' }
          } else {
            results[i] = {
              index: i,
              ok: false,
              error: { code: 'internal_error', message: 'no id returned' },
            }
          }
        } catch (err) {
          if (isApiError(err)) {
            results[i] = { index: i, ok: false, error: { code: err.code, message: err.message } }
          } else {
            results[i] = {
              index: i,
              ok: false,
              error: { code: 'internal_error', message: (err as Error).message },
            }
          }
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker))

    return {
      status: 207, // Multi-Status
      body: {
        total: items.length,
        succeeded: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        results,
      },
    }
  })
}
