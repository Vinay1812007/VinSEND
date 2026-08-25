'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { createListAction } from '../lists-actions'

export function CreateListForm({
  orgSlug,
  projectPublicId,
}: {
  orgSlug: string
  projectPublicId: string
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await createListAction({ orgSlug, projectPublicId, name })
    setPending(false)
    if ('error' in res) setError(res.error!)
    else {
      setName('')
      router.refresh()
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {error && <Alert tone="bad">{error}</Alert>}
      <Field label="Name" id="l-name">
        <Input id="l-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Button type="submit" loading={pending}>Create list</Button>
    </form>
  )
}
