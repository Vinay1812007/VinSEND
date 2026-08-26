'use client'

// Client-only button that exports the domain's DNS records as a BIND zone
// file (RFC 1035) so it can be pasted straight into Cloudflare, Route 53,
// Namecheap, and the like — all of which accept the same format for their
// "Import DNS records" flows.

import { Button } from '@/components/ui/button'

type Row = {
  type: string
  host: string
  expected_value: string
  ttl?: number | null
}

// BIND caps a single TXT string at 255 bytes; long DKIM values have to be
// split into consecutive quoted strings joined by spaces. This keeps the
// on-the-wire semantics identical while making DKIM records past 255 chars
// legal.
function chunkQuotedTxt(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  if (escaped.length <= 255) return `"${escaped}"`
  const chunks: string[] = []
  let rest = escaped
  while (rest.length > 255) {
    chunks.push(`"${rest.slice(0, 255)}"`)
    rest = rest.slice(255)
  }
  if (rest.length) chunks.push(`"${rest}"`)
  return chunks.join(' ')
}

function toBindZone(domain: string, rows: Row[]): string {
  const lines: string[] = []
  lines.push(`;; VinSEND DNS records for ${domain}`)
  lines.push(`;; Exported: ${new Date().toISOString()}`)
  lines.push(`;;`)
  lines.push(`;; Import this file into your DNS provider:`)
  lines.push(`;;   Cloudflare: Websites -> ${domain} -> DNS -> Records -> Import`)
  lines.push(`;;   Route 53:   Hosted zones -> ${domain} -> Import zone file`)
  lines.push(`;;   Namecheap:  Domain -> Advanced DNS -> Add each record manually`)
  lines.push(``)
  lines.push(`;; TXT Records`)
  for (const r of rows) {
    if (r.type !== 'spf' && r.type !== 'dkim' && r.type !== 'dmarc') continue
    const fqdn = r.host.endsWith('.') ? r.host : `${r.host}.`
    const ttl = r.ttl ?? 3600
    lines.push(`${fqdn}\t${ttl}\tIN\tTXT\t${chunkQuotedTxt(r.expected_value)}`)
  }
  lines.push(``)
  return lines.join('\n')
}

export function DownloadRecordsButton({
  domain,
  records,
}: {
  domain: string
  records: Row[]
}) {
  function onClick() {
    const text = toBindZone(domain, records)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${domain}.zone.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // Free the object URL a moment later — Safari/Chrome need the anchor removed first.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <Button variant="secondary" onClick={onClick}>
      Download records
    </Button>
  )
}

