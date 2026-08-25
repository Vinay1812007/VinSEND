'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { inviteTeammateAction } from './invite-actions'

export function InviteForm({
  orgSlug,
  projectPublicId,
}: {
  orgSlug: string
  projectPublicId: string
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [acceptUrl, setAcceptUrl] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await inviteTeammateAction({ orgSlug, projectPublicId, email, role })
    setPending(false)
    if ('error' in res) setError(res.error!)
    else {
      setAcceptUrl(res.acceptUrl!)
      setEmail('')
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {error && <Alert tone="bad">{error}</Alert>}
      {acceptUrl && (
        <Alert tone="good" title="Invite created">
          <p className="mb-2">Send this URL to the invitee. It expires in 14 days.</p>
          <pre className="rounded border border-[color:var(--rule)] bg-[color:var(--ground)] px-3 py-2 font-mono text-[12px] break-all">
            {acceptUrl}
          </pre>
          <div className="mt-2">
            <Button variant="secondary" size="sm" onClick={() => navigator.clipboard?.writeText(acceptUrl)}>
              Copy
            </Button>
          </div>
        </Alert>
      )}
      <Field label="Email" id="inv-email">
        <Input
          id="inv-email"
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Role" id="inv-role">
        <select
          id="inv-role"
          className="block w-full rounded border border-[color:var(--rule)] bg-[color:var(--ground)] px-3 py-2 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
        >
          <option value="member">member</option>
          <option value="admin">admin</option>
        </select>
      </Field>
      <Button type="submit" loading={pending}>
        Send invite
      </Button>
    </form>
  )
}
