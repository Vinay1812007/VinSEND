'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { createContactAction } from './actions'

export function AddContactForm({
  orgSlug,
  projectPublicId,
}: {
  orgSlug: string
  projectPublicId: string
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await createContactAction({
      orgSlug,
      projectPublicId,
      email,
      firstName: first,
      lastName: last,
    })
    setPending(false)
    if ('error' in res) setError(res.error!)
    else {
      setEmail('')
      setFirst('')
      setLast('')
      router.refresh()
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {error && <Alert tone="bad">{error}</Alert>}
      <Field label="Email" id="c-email">
        <Input
          id="c-email"
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" id="c-first">
          <Input id="c-first" value={first} onChange={(e) => setFirst(e.target.value)} />
        </Field>
        <Field label="Last name" id="c-last">
          <Input id="c-last" value={last} onChange={(e) => setLast(e.target.value)} />
        </Field>
      </div>
      <Button type="submit" loading={pending}>
        Add contact
      </Button>
    </form>
  )
}
