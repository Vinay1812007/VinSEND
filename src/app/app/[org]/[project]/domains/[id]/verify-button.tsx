'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { verifyDomainAction } from '../actions'

export function VerifyButton({
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
      loading={pending}
      onClick={() =>
        start(async () => {
          await verifyDomainAction({ orgSlug, projectPublicId, publicId })
          router.refresh()
        })
      }
    >
      Verify DNS
    </Button>
  )
}
