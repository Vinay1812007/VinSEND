'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { importContactsAction } from './actions'

interface ImportSummary {
  attempted: number
  inserted: number
  updated: number
  skipped: Array<{ line: number; email: string; reason: string }>
}

export function ImportForm({
  orgSlug,
  projectPublicId,
}: {
  orgSlug: string
  projectPublicId: string
}) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file) return
    setPending(true)
    setError(null)
    setSummary(null)
    const csv = await file.text()
    const res = await importContactsAction({ orgSlug, projectPublicId, csv })
    setPending(false)
    if ('error' in res) setError(res.error!)
    else {
      setSummary(res as ImportSummary)
      router.refresh()
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {error && <Alert tone="bad">{error}</Alert>}
      {summary && (
        <Alert tone="good" title="Import complete">
          <p>
            {summary.inserted} new, {summary.updated} updated
            {summary.skipped.length ? `, ${summary.skipped.length} skipped` : ''} out of{' '}
            {summary.attempted}.
          </p>
          {summary.skipped.length > 0 && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-[color:var(--muted)]">Show skipped rows</summary>
              <ul className="mt-1 font-mono max-h-40 overflow-auto">
                {summary.skipped.map((s, i) => (
                  <li key={i}>
                    Line {s.line}: {s.email} — {s.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Alert>
      )}
      <div className="text-xs text-[color:var(--muted)]">
        CSV with headers <code>email</code> (required), <code>first_name</code>,{' '}
        <code>last_name</code>. Any other columns land under <code>properties</code>.
      </div>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm"
      />
      <Button type="submit" loading={pending} disabled={!file}>
        Import
      </Button>
    </form>
  )
}
