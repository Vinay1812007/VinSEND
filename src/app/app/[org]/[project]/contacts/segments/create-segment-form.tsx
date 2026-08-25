'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { createSegmentAction } from '../lists-actions'

export function CreateSegmentForm({
  orgSlug,
  projectPublicId,
}: {
  orgSlug: string
  projectPublicId: string
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [propKey, setPropKey] = useState('')
  const [propValue, setPropValue] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const filter = propKey.trim() ? { equals: { [propKey.trim()]: propValue } } : {}
    const res = await createSegmentAction({ orgSlug, projectPublicId, name, filter })
    setPending(false)
    if ('error' in res) setError(res.error!)
    else {
      setName('')
      setPropKey('')
      setPropValue('')
      router.refresh()
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {error && <Alert tone="bad">{error}</Alert>}
      <Field label="Name" id="s-name">
        <Input id="s-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Property key" id="s-key" hint="stored in contacts.properties">
        <Input
          id="s-key"
          placeholder="plan"
          value={propKey}
          onChange={(e) => setPropKey(e.target.value)}
        />
      </Field>
      <Field label="Property value" id="s-value">
        <Input
          id="s-value"
          placeholder="pro"
          value={propValue}
          onChange={(e) => setPropValue(e.target.value)}
        />
      </Field>
      <Button type="submit" loading={pending}>Create segment</Button>
    </form>
  )
}
