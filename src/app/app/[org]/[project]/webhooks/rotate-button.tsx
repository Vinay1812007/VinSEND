'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { rotateWebhookSecretAction } from './actions'

export function RotateSecretButton({
  orgSlug,
  projectPublicId,
  publicId,
}: {
  orgSlug: string
  projectPublicId: string
  publicId: string
}) {
  const [pending, setPending] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onRotate() {
    if (!confirm('Rotate the signing secret? Requests signed with the old secret will fail immediately.')) return
    setPending(true)
    setError(null)
    const res = await rotateWebhookSecretAction({ orgSlug, projectPublicId, publicId })
    setPending(false)
    if ('error' in res) setError(res.error!)
    else setSecret(res.secret!)
  }

  if (secret) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded border border-[color:var(--rule)] bg-[color:var(--ground)] p-6 shadow-card">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
            New signing secret
          </div>
          <h2 className="mb-4 font-display text-xl font-medium text-[color:var(--ink)]">
            Save this now
          </h2>
          <Alert tone="warn">Copy the new secret; the old one no longer signs anything.</Alert>
          <pre className="mt-3 rounded border border-[color:var(--rule)] bg-[color:var(--sunk)] px-3 py-3 font-mono text-[12px] break-all">
            {secret}
          </pre>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(secret)}>
              Copy
            </Button>
            <Button onClick={() => setSecret(null)}>Done</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {error && <div className="mb-2"><Alert tone="bad">{error}</Alert></div>}
      <Button variant="ghost" size="sm" loading={pending} onClick={onRotate}>
        Rotate secret
      </Button>
    </>
  )
}
