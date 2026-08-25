'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { addDomainAction } from './actions'

export function AddDomainForm({
  orgSlug,
  projectPublicId,
}: {
  orgSlug: string
  projectPublicId: string
}) {
  const router = useRouter()
  const [domain, setDomain] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await addDomainAction({ orgSlug, projectPublicId, domain })
    setPending(false)
    if ('error' in res) setError(res.error!)
    else {
      router.push(`/app/${orgSlug}/${projectPublicId}/domains/${res.publicId}`)
      router.refresh()
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {error && <Alert tone="bad">{error}</Alert>}
      <Field label="Domain" id="d-name" hint="e.g. mail.example.com">
        <Input
          id="d-name"
          required
          placeholder="mail.example.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
      </Field>
      <Button type="submit" loading={pending}>
        Add
      </Button>
    </form>
  )
}
