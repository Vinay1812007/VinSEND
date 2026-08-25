// Prefixed, sortable, URL-safe public identifiers.
// Uses ULID for monotonic-per-ms sortable entropy.

import { ulid } from 'ulid'

export type IdPrefix =
  | 'email'
  | 'key'
  | 'domain'
  | 'wh'
  | 'evt'
  | 'tmpl'
  | 'contact'
  | 'project'
  | 'req'

const KNOWN: Record<IdPrefix, true> = {
  email: true,
  key: true,
  domain: true,
  wh: true,
  evt: true,
  tmpl: true,
  contact: true,
  project: true,
  req: true,
}

export function publicId(prefix: IdPrefix): string {
  return `${prefix}_${ulid().toLowerCase()}`
}

export function parsePublicId(id: string): { prefix: IdPrefix; ulid: string } | null {
  const idx = id.indexOf('_')
  if (idx <= 0) return null
  const prefix = id.slice(0, idx) as IdPrefix
  const rest = id.slice(idx + 1)
  if (!(prefix in KNOWN)) return null
  if (rest.length !== 26) return null
  return { prefix, ulid: rest.toUpperCase() }
}

export function isPublicId(id: string, prefix: IdPrefix): boolean {
  const parsed = parsePublicId(id)
  return parsed !== null && parsed.prefix === prefix
}
