'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteContactAction } from './actions'

export function DeleteContactButton({
  orgSlug,
  projectPublicId,
  publicId,
}: {
  orgSlug: string
  projectPublicId: string
  publicId: string
}) {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={() => {
        if (!confirm('Delete this contact?')) return
        start(async () => {
          await deleteContactAction({ orgSlug, projectPublicId, publicId })
        })
      }}
    >
      Delete
    </Button>
  )
}
