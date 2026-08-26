'use client'

// Client-only button that exports the domain's DNS records as a plain-text file
// so the operator can hand it to their DNS provider (or a coworker) without
// having to copy each row out of the table.

import { Button } from '@/components/ui/button'

type Row = {
  type: string
  host: string
  expected_value: string
  ttl?: number | null
}

function toText(domain: string, rows: Row[]): string {
  const lines: string[] = []
  lines.push(`# VinSEND DNS records for ${domain}`)
  lines.push('# Add these to your DNS provider (Cloudflare, Route53, GoDaddy, etc.)')
  lines.push('#')
  lines.push('# TYPE\tNAME\tVALUE\tTTL')
  for (const r of rows) {
    const ttl = r.ttl ? String(r.ttl) : 'Auto'
    lines.push(`${r.type.toUpperCase()}\t${r.host}\t${r.expected_value}\t${ttl}`)
  }
  lines.push('')
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
    const text = toText(domain, records)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${domain}-dns-records.txt`
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
