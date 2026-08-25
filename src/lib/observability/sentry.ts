// Sentry adapter — no-ops when SENTRY_DSN is unset, so nothing external is
// pulled in for the default MVP build. When set, the `@sentry/node` package
// (an optional peer dependency) captures uncaught exceptions and manual
// captures via `captureError` / `captureMessage`.
//
// This file is safe to import unconditionally.

interface SentryLike {
  init: (opts: { dsn: string; environment?: string; tracesSampleRate?: number }) => void
  captureException: (err: unknown) => string
  captureMessage: (msg: string, level?: string) => string
}

let sentry: SentryLike | null = null
let inited = false

function tryInit(): SentryLike | null {
  if (inited) return sentry
  inited = true
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return null
  try {
    // Lazy require. Package is optional; when not installed, we no-op.
    // eslint-disable-next-line
    const s = eval('require')('@sentry/node') as SentryLike | undefined
    if (!s) return null
    s.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    })
    sentry = s
    return sentry
  } catch {
    return null
  }
}

export function captureError(err: unknown, context?: Record<string, unknown>): void {
  const s = tryInit()
  if (!s) return
  try {
    if (context && Object.keys(context).length > 0) {
      // eslint-disable-next-line no-console
      console.error(JSON.stringify({ level: 'error', msg: 'sentry.capture', ...context }))
    }
    s.captureException(err)
  } catch {
    // ignore
  }
}

export function captureMessage(msg: string, level: 'info' | 'warn' | 'error' = 'info'): void {
  const s = tryInit()
  if (!s) return
  try {
    s.captureMessage(msg, level)
  } catch {
    // ignore
  }
}
