'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { archiveTemplateAction } from '../actions'

export function ArchiveButton({
  orgSlug,
  projectPublicId,
  publicId,
}: {
  orgSlug: string
  projectPublicId: string
  publicId: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Button
      variant="ghost"
      loading={pending}
      onClick={() => {
        if (!confirm('Delete this template? Sends already made are not affected.')) return
        start(async () => {
          await archiveTemplateAction({ orgSlug, projectPublicId, publicId })
          router.push(`/app/${orgSlug}/${projectPublicId}/templates`)
        })
      }}
    >
      Delete
    </Button>
  )
}
