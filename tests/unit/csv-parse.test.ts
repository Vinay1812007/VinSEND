import { describe, expect, it } from 'vitest'
import { parseCsv } from '@/lib/csv/parse'

describe('parseCsv', () => {
  it('parses a simple 3-column CSV', () => {
    const { headers, rows } = parseCsv(`email,first_name,last_name
ada@example.com,Ada,Lovelace
grace@example.com,Grace,Hopper
`)
    expect(headers).toEqual(['email', 'first_name', 'last_name'])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ email: 'ada@example.com', first_name: 'Ada', last_name: 'Lovelace' })
  })

  it('handles quoted values with commas', () => {
    const { rows } = parseCsv(`email,notes
ada@example.com,"Loves, tea and math"
`)
    expect(rows[0]!.notes).toBe('Loves, tea and math')
  })

  it('handles escaped quotes', () => {
    const { rows } = parseCsv(`email,note
ada@example.com,"She said ""hello"""
`)
    expect(rows[0]!.note).toBe('She said "hello"')
  })

  it('handles CRLF line endings', () => {
    const { rows } = parseCsv('email\r\na@b.com\r\n')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.email).toBe('a@b.com')
  })

  it('trims trailing empty rows', () => {
    const { rows } = parseCsv('email\na@b.com\n\n\n')
    expect(rows).toHaveLength(1)
  })
})
