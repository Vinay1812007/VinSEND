'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { deleteOrgAction, exportOrgDataAction } from './actions'

export function GdprPanel({
  mode,
  orgSlug,
  projectPublicId,
  orgName,
}: {
  mode: 'export' | 'delete'
  orgSlug: string
  projectPublicId: string
  orgName: string
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState<string | null>(null)

  if (mode === 'export') {
    return (
      <div className="flex flex-col gap-3">
        {error && <Alert tone="bad">{error}</Alert>}
        {done && <Alert tone="good">{done}</Alert>}
        <p className="text-sm text-[color:var(--muted)]">
          Downloads a JSON file with every row belonging to <b>{orgName}</b>. Secrets are redacted;
          messages and events are included in full.
        </p>
        <Button
          loading={pending}
          onClick={async () => {
            setPending(true)
            setError(null)
            setDone(null)
            const res = await exportOrgDataAction({ orgSlug, projectPublicId })
            setPending(false)
            if ('error' in res) {
              setError(res.error!)
              return
            }
            const blob = new Blob([JSON.stringify(res.bundle, null, 2)], {
              type: 'application/json',
            })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `vinsend-${orgSlug}-export.json`
            a.click()
            URL.revokeObjectURL(url)
            setDone('Export downloaded.')
          }}
        >
          Download export
        </Button>
      </div>
    )
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault()
        setPending(true)
        setError(null)
        const res = await deleteOrgAction({ orgSlug, projectPublicId, reason, confirm })
        setPending(false)
        if ('error' in res) setError(res.error!)
        else if ('ok' in res && res.ok) {
          window.location.href = '/'
        }
      }}
    >
      {error && <Alert tone="bad">{error}</Alert>}
      <Alert tone="warn" title="This cannot be undone">
        Every project, key, message, template, contact, and audit row under {orgName} will be
        removed. Suppression lists too.
      </Alert>
      <Field label="Reason (for the audit record)" id="d-reason">
        <Input id="d-reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <Field label={`Type the slug (${orgSlug}) to confirm`} id="d-confirm">
        <Input
          id="d-confirm"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" variant="danger" loading={pending} disabled={confirm !== orgSlug}>
          Delete workspace permanently
        </Button>
      </div>
    </form>
  )
}
