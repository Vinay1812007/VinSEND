'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { duplicateTemplateAction } from '../actions'

export function DuplicateButton({
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
      variant="secondary"
      loading={pending}
      onClick={() => {
        start(async () => {
          const res = await duplicateTemplateAction({ orgSlug, projectPublicId, publicId })
          if ('publicId' in res) router.push(`/app/${orgSlug}/${projectPublicId}/templates/${res.publicId}`)
        })
      }}
    >
      Duplicate
    </Button>
  )
}
