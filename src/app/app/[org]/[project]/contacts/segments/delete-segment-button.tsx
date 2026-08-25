'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteSegmentAction } from '../lists-actions'

export function DeleteSegmentButton({
  orgSlug,
  projectPublicId,
  segmentId,
}: {
  orgSlug: string
  projectPublicId: string
  segmentId: string
}) {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={() => {
        if (!confirm('Delete this segment?')) return
        start(async () => {
          await deleteSegmentAction({ orgSlug, projectPublicId, segmentId })
        })
      }}
    >
      Delete
    </Button>
  )
}
