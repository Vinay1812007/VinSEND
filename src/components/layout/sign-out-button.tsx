'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/auth/browser'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const [pending, start] = useTransition()
  const router = useRouter()

  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={() =>
        start(async () => {
          const sb = getBrowserSupabase()
          await sb.auth.signOut()
          router.push('/sign-in')
          router.refresh()
        })
      }
    >
      Sign out
    </Button>
  )
}
