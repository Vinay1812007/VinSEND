// CSV writer (RFC-4180 friendly).
// Values containing commas, quotes, or newlines are double-quoted with
// embedded quotes doubled.

const NEEDS_QUOTE_RE = /[",\r\n]/

function encodeField(v: unknown): string {
  const s = v == null ? '' : String(v)
  if (NEEDS_QUOTE_RE.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => encodeField(row[h])).join(','))
  }
  return lines.join('\r\n') + '\r\n'
}
