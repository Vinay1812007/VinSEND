// Shared plumbing for /v1 route handlers.
// Wraps auth, rate limiting, error mapping, and request-id injection.

import { NextResponse } from 'next/server'
import { publicId } from '@/lib/ids'
import { logger } from '@/lib/logger'
import { withLogContext } from '@/lib/logger/context'
import { getRateLimiter, RATE_LIMITS } from '@/lib/security/rate-limit'
import { authenticateApiKey, requireScope, type ResolvedApiKey } from '@/server/services/authz'
import { ApiError, isApiError } from '@/server/services/errors'

export interface ApiRequestContext {
  requestId: string
  key: ResolvedApiKey
  ip: string
}

export interface ApiHandlerOptions {
  scope: string
  ipRateLimit?: boolean
}

export async function withApiRoute<T>(
  request: Request,
  opts: ApiHandlerOptions,
  handler: (ctx: ApiRequestContext) => Promise<{ status: number; body: T } | NextResponse>,
): Promise<NextResponse> {
  const requestId = publicId('req')
  return withLogContext({ request_id: requestId }, () => runApiRoute(request, opts, handler, requestId))
}

async function runApiRoute<T>(
  request: Request,
  opts: ApiHandlerOptions,
  handler: (ctx: ApiRequestContext) => Promise<{ status: number; body: T } | NextResponse>,
  requestId: string,
): Promise<NextResponse> {
  const log = logger.child({ request_id: requestId })
  const ip = extractIp(request)

  try {
    // Coarse per-IP throttle first (cheap, catches abuse).
    if (opts.ipRateLimit !== false) {
      const ipRes = await getRateLimiter().consume({
        bucket: `ip:${ip}`,
        windowSeconds: RATE_LIMITS.ipPerMinute.windowSeconds,
        limit: RATE_LIMITS.ipPerMinute.limit,
      })
      if (!ipRes.allowed) {
        return errorResponse(new ApiError('rate_limited', 'Too many requests from this IP'), requestId)
      }
    }

    const authHeader = request.headers.get('authorization')
    const key = await authenticateApiKey(authHeader)
    requireScope(key.key, opts.scope)

    // Per-key throttle.
    const keyRes = await getRateLimiter().consume({
      bucket: `key:${key.key.id}`,
      windowSeconds: RATE_LIMITS.apiKeyPerMinute.windowSeconds,
      limit: RATE_LIMITS.apiKeyPerMinute.limit,
    })
    if (!keyRes.allowed) {
      return errorResponse(new ApiError('rate_limited', 'Too many requests for this API key'), requestId)
    }

    const result = await handler({ requestId, key, ip })
    if (result instanceof NextResponse) return result
    const res = NextResponse.json(result.body, { status: result.status })
    res.headers.set('VinSEND-Request-Id', requestId)
    return res
  } catch (err) {
    if (isApiError(err)) {
      log.warn('api.error', { code: err.code, status: err.status })
      return errorResponse(err, requestId)
    }
    log.error('api.internal_error', { err: (err as Error).message })
    try {
      const { captureError } = await import('@/lib/observability/sentry')
      captureError(err, { request_id: requestId })
    } catch {
      // ignore
    }
    return errorResponse(new ApiError('internal_error', 'Internal server error'), requestId)
  }
}

export function errorResponse(err: ApiError, requestId: string): NextResponse {
  const body = {
    error: {
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
      request_id: requestId,
    },
  }
  const res = NextResponse.json(body, { status: err.status })
  res.headers.set('VinSEND-Request-Id', requestId)
  if (err.code === 'rate_limited') res.headers.set('Retry-After', '60')
  return res
}

function extractIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  const real = request.headers.get('x-real-ip')
  if (real) return real
  return 'unknown'
}
