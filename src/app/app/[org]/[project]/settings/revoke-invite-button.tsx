'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { revokeInviteAction } from './invite-actions'

export function RevokeInviteButton({
  orgSlug,
  projectPublicId,
  invitationId,
}: {
  orgSlug: string
  projectPublicId: string
  invitationId: string
}) {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={() => {
        if (!confirm('Revoke this invite?')) return
        start(async () => {
          await revokeInviteAction({ orgSlug, projectPublicId, invitationId })
        })
      }}
    >
      Revoke
    </Button>
  )
}
