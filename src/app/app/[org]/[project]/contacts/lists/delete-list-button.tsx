'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteListAction } from '../lists-actions'

export function DeleteListButton({
  orgSlug,
  projectPublicId,
  listId,
}: {
  orgSlug: string
  projectPublicId: string
  listId: string
}) {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={() => {
        if (!confirm('Delete this list? Contacts are not deleted.')) return
        start(async () => {
          await deleteListAction({ orgSlug, projectPublicId, listId })
        })
      }}
    >
      Delete
    </Button>
  )
}
