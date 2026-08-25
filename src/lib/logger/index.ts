// Minimal structured logger with redaction.
// Emits single-line JSON to stdout. Zero external dependencies.

type Level = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_WEIGHT: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }

const REDACT_KEYS = new Set([
  'password',
  'secret',
  'hash',
  'authorization',
  'smtp_password',
  'signing_secret',
  'api_key',
  'api_key_hash',
  'apikey',
  'token',
  'access_token',
  'refresh_token',
  'cookie',
])

const REDACTED = '[REDACTED]'
// Match anywhere in the string so keys leaked into free-form log messages get scrubbed too.
const SECRET_VALUE_RE = /vs_(live|test)_[A-Za-z0-9]+/i

function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[MAX_DEPTH]'
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return SECRET_VALUE_RE.test(value) ? REDACTED : value
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1))

  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (REDACT_KEYS.has(k.toLowerCase())) {
      out[k] = REDACTED
    } else {
      out[k] = redact(v, depth + 1)
    }
  }
  return out
}

function currentLevel(): Level {
  const raw = (process.env.LOG_LEVEL || 'info').toLowerCase()
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') return raw
  return 'info'
}

function emit(level: Level, message: string, context?: Record<string, unknown>): void {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[currentLevel()]) return
  // Merge ambient async-local bindings so every log picks them up automatically.
  // Lazy require to avoid a circular import when logger is loaded before context.
  let ambient: Record<string, unknown> | undefined
  try {
    const mod = require('./context') as { currentLogBindings?: () => Record<string, unknown> }
    ambient = mod.currentLogBindings?.()
  } catch {
    // ignore
  }
  const line = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(ambient ?? {}),
    ...((context && (redact(context) as object)) || {}),
  }
  // eslint-disable-next-line no-console
  const stream = level === 'error' || level === 'warn' ? console.error : console.log
  stream(JSON.stringify(line))
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => emit('debug', msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => emit('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => emit('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => emit('error', msg, ctx),
  child(bindings: Record<string, unknown>) {
    return {
      debug: (msg: string, ctx?: Record<string, unknown>) =>
        emit('debug', msg, { ...bindings, ...ctx }),
      info: (msg: string, ctx?: Record<string, unknown>) =>
        emit('info', msg, { ...bindings, ...ctx }),
      warn: (msg: string, ctx?: Record<string, unknown>) =>
        emit('warn', msg, { ...bindings, ...ctx }),
      error: (msg: string, ctx?: Record<string, unknown>) =>
        emit('error', msg, { ...bindings, ...ctx }),
    }
  },
}

// Exported for unit tests.
export const __internal = { redact, REDACT_KEYS }
