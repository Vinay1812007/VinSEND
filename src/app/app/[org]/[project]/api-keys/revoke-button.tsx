'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { revokeApiKeyAction } from './actions'

export function RevokeButton({
  orgSlug,
  projectPublicId,
  keyPublicId,
}: {
  orgSlug: string
  projectPublicId: string
  keyPublicId: string
}) {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={() => {
        if (!confirm('Revoke this key? Requests using it will start returning 401 immediately.')) return
        start(async () => {
          await revokeApiKeyAction({ orgSlug, projectPublicId, publicId: keyPublicId })
        })
      }}
    >
      Revoke
    </Button>
  )
}
