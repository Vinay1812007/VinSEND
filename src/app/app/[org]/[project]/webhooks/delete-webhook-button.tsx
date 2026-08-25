'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteWebhookAction } from './actions'

export function DeleteWebhookButton({
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
        if (!confirm('Delete this webhook? Pending deliveries will stop.')) return
        start(async () => {
          await deleteWebhookAction({ orgSlug, projectPublicId, publicId })
        })
      }}
    >
      Delete
    </Button>
  )
}
