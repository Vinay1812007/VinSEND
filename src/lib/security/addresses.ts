// RFC 5321/5322-friendly address parsing.
// Deliberately narrow: we accept the common `Name <local@domain>` form and
// bare `local@domain`. Anything outside that is rejected explicitly so the
// caller sees why.

export interface ParsedAddress {
  name: string | null
  address: string
  domain: string
}

const CONTROL_CHAR_RE = /[\x00-\x1F\x7F]/

// A pragmatic email regex. Not fully RFC-compliant (few real ones are), but
// covers ~all deliverable addresses.
const EMAIL_RE =
  /^[A-Za-z0-9._%+\-!#$&'*+/=?^_`{|}~]+@[A-Za-z0-9]([A-Za-z0-9\-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9\-]{0,61}[A-Za-z0-9])?)+$/

export function parseAddress(input: string): ParsedAddress {
  const raw = input.trim()
  if (!raw) throw new Error('Address is empty')
  if (CONTROL_CHAR_RE.test(raw)) throw new Error('Address contains control characters')
  if (raw.length > 320) throw new Error('Address exceeds 320 characters')

  let name: string | null = null
  let addressPart = raw

  const angle = raw.match(/^(.*)<([^<>]+)>\s*$/)
  if (angle) {
    name = angle[1]!.trim().replace(/^"|"$/g, '').trim() || null
    addressPart = angle[2]!.trim()
  }

  if (!EMAIL_RE.test(addressPart)) throw new Error(`Invalid email address: ${addressPart}`)
  const at = addressPart.lastIndexOf('@')
  const domain = addressPart.slice(at + 1).toLowerCase()
  return { name, address: addressPart.toLowerCase(), domain }
}

export function parseAddressList(inputs: readonly string[]): ParsedAddress[] {
  return inputs.map((s) => parseAddress(s))
}

const HEADER_VALUE_RE = /^[\x20-\x7E]+$/

export function validateHeaderValue(name: string, value: string): void {
  if (/[\r\n]/.test(name) || /[\r\n]/.test(value)) {
    throw new Error(`Header ${name}: contains CR/LF (injection attempt)`)
  }
  if (!HEADER_VALUE_RE.test(value)) {
    throw new Error(`Header ${name}: contains non-printable characters`)
  }
  if (name.length > 200 || value.length > 998) {
    throw new Error(`Header ${name}: exceeds RFC 5322 line length`)
  }
}
