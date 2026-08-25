// Ambient log context via AsyncLocalStorage. Every log line emitted inside
// `withLogContext(bindings, fn)` inherits those bindings automatically.

import { AsyncLocalStorage } from 'node:async_hooks'

export interface LogBindings {
  request_id?: string
  project_id?: string
  org_id?: string
  api_key_id?: string
  [k: string]: string | undefined
}

const storage = new AsyncLocalStorage<LogBindings>()

export function withLogContext<T>(bindings: LogBindings, fn: () => Promise<T> | T): Promise<T> | T {
  const merged = { ...(storage.getStore() ?? {}), ...bindings }
  return storage.run(merged, fn)
}

export function currentLogBindings(): LogBindings {
  return storage.getStore() ?? {}
}
