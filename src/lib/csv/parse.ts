// Minimal RFC 4180-friendly CSV parser. Handles quoted fields, escaped
// quotes, CRLF/LF line endings. Deliberately small — the input is expected
// to be an address book, not a full spreadsheet.

export interface ParsedCsv {
  headers: string[]
  rows: Array<Record<string, string>>
}

export function parseCsv(input: string): ParsedCsv {
  const rows: string[][] = [[]]
  let field = ''
  let inQuotes = false
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      rows[rows.length - 1]!.push(field)
      field = ''
      continue
    }
    if (ch === '\r') continue
    if (ch === '\n') {
      rows[rows.length - 1]!.push(field)
      field = ''
      rows.push([])
      continue
    }
    field += ch
  }
  // final field
  rows[rows.length - 1]!.push(field)
  // drop trailing empty rows (from trailing newlines)
  while (rows.length > 0) {
    const last = rows[rows.length - 1]!
    if (last.length === 1 && last[0] === '') rows.pop()
    else break
  }
  if (rows.length === 0) return { headers: [], rows: [] }
  const headers = rows[0]!.map((h) => h.trim())
  const dataRows = rows.slice(1).map((r) => {
    const out: Record<string, string> = {}
    headers.forEach((h, i) => {
      out[h] = (r[i] ?? '').trim()
    })
    return out
  })
  return { headers, rows: dataRows }
}
