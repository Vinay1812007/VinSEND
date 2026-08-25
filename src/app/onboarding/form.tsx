'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { createWorkspaceAction } from './actions'

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const router = useRouter()
  const [orgName, setOrgName] = useState(capitalize(defaultName))
  const [projectName, setProjectName] = useState('Production')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      const result = await createWorkspaceAction({ orgName, projectName })
      if ('error' in result) {
        setError(result.error)
        return
      }
      router.push(`/app/${result.orgSlug}/${result.projectPublicId}/overview`)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {error && <Alert tone="bad">{error}</Alert>}
      <Field label="Workspace name" id="org">
        <Input id="org" required value={orgName} onChange={(e) => setOrgName(e.target.value)} />
      </Field>
      <Field label="First project" id="project">
        <Input
          id="project"
          required
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          Create workspace
        </Button>
      </div>
    </form>
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
