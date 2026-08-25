'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { createApiKeyAction } from './actions'

export function CreateKeyDialog({
  orgSlug,
  projectPublicId,
}: {
  orgSlug: string
  projectPublicId: string
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [env, setEnv] = useState<'live' | 'test'>('live')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      const result = await createApiKeyAction({ orgSlug, projectPublicId, name, environment: env })
      if ('error' in result) setError(result.error!)
      else setSecret(result.secret!)
    } finally {
      setPending(false)
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>New key</Button>
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded border border-[color:var(--rule)] bg-[color:var(--ground)] p-6 shadow-card">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
          New API key
        </div>
        <h2 className="font-display text-xl font-medium text-[color:var(--ink)] mb-4">Create key</h2>

        {secret ? (
          <div className="flex flex-col gap-3">
            <Alert tone="warn" title="Save this now">
              This is the only time we&rsquo;ll show the full secret. Store it in your secret manager.
            </Alert>
            <pre className="rounded border border-[color:var(--rule)] bg-[color:var(--sunk)] px-3 py-3 font-mono text-[12px] break-all">
              {secret}
            </pre>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(secret)
                }}
              >
                Copy
              </Button>
              <Button
                onClick={() => {
                  setSecret(null)
                  setOpen(false)
                  setName('')
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {error && <Alert tone="bad">{error}</Alert>}
            <Field label="Name" id="k-name">
              <Input
                id="k-name"
                required
                placeholder="Production server"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Environment" id="k-env">
              <select
                id="k-env"
                className="block w-full rounded border border-[color:var(--rule)] bg-[color:var(--ground)] px-3 py-2 text-sm"
                value={env}
                onChange={(e) => setEnv(e.target.value as 'live' | 'test')}
              >
                <option value="live">live (vs_live_…)</option>
                <option value="test">test (vs_test_…)</option>
              </select>
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                Create
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
