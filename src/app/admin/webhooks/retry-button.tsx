'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { retryDeliveryAction } from './actions'

export function RetryButton({ deliveryId }: { deliveryId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Button
      size="sm"
      loading={pending}
      onClick={() => {
        start(async () => {
          await retryDeliveryAction({ deliveryId })
          router.refresh()
        })
      }}
    >
      Retry now
    </Button>
  )
}
