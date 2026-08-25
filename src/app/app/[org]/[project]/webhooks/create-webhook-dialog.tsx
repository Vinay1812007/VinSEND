'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { createWebhookAction } from './actions'

const EVENTS = [
  'email.queued',
  'email.sent',
  'email.delivered',
  'email.deferred',
  'email.bounced',
  'email.complained',
  'email.opened',
  'email.clicked',
  'email.failed',
  'email.rejected',
] as const

export function CreateWebhookDialog({
  orgSlug,
  projectPublicId,
}: {
  orgSlug: string
  projectPublicId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [selected, setSelected] = useState<Set<string>>(
    new Set(['email.sent', 'email.failed', 'email.bounced']),
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)

  const toggle = (e: string) => {
    const next = new Set(selected)
    if (next.has(e)) next.delete(e)
    else next.add(e)
    setSelected(next)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (selected.size === 0) {
      setError('Select at least one event')
      return
    }
    setPending(true)
    setError(null)
    const res = await createWebhookAction({
      orgSlug,
      projectPublicId,
      url,
      events: Array.from(selected),
    })
    setPending(false)
    if ('error' in res) setError(res.error!)
    else {
      setSecret(res.secret!)
      router.refresh()
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>New webhook</Button>
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded border border-[color:var(--rule)] bg-[color:var(--ground)] p-6 shadow-card">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
          New webhook
        </div>
        <h2 className="mb-4 font-display text-xl font-medium text-[color:var(--ink)]">
          Register endpoint
        </h2>

        {secret ? (
          <div className="flex flex-col gap-3">
            <Alert tone="warn" title="Save this signing secret">
              This is the only time we&rsquo;ll show it. Use it to verify VinSEND-Webhook-Signature on incoming events.
            </Alert>
            <pre className="rounded border border-[color:var(--rule)] bg-[color:var(--sunk)] px-3 py-3 font-mono text-[12px] break-all">
              {secret}
            </pre>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(secret)}>
                Copy
              </Button>
              <Button
                onClick={() => {
                  setSecret(null)
                  setOpen(false)
                  setUrl('')
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {error && <Alert tone="bad">{error}</Alert>}
            <Field label="Endpoint URL" id="w-url" hint="Must be https://">
              <Input
                id="w-url"
                required
                type="url"
                placeholder="https://api.yourapp.com/vinsend"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </Field>
            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
                Events to send
              </div>
              <div className="grid grid-cols-2 gap-1 text-sm">
                {EVENTS.map((e) => (
                  <label key={e} className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      checked={selected.has(e)}
                      onChange={() => toggle(e)}
                    />
                    <span className="font-mono text-[12px]">{e}</span>
                  </label>
                ))}
              </div>
            </div>
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
