'use client'

import { useState } from 'react'
import { getBrowserSupabase } from '@/lib/auth/browser'
import { publicEnv } from '@/lib/validation/env'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

export function OAuthButtons({ next = '/app' }: { next?: string }) {
  const [pending, setPending] = useState<null | 'google' | 'github'>(null)
  const [error, setError] = useState<string | null>(null)

  async function onOAuth(provider: 'google' | 'github') {
    setPending(provider)
    setError(null)
    const sb = getBrowserSupabase()
    const { error: err } = await sb.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${publicEnv.APP_URL}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    setPending(null)
    if (err) setError(err.message)
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert tone="bad">{error}</Alert>}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" loading={pending === 'google'} onClick={() => onOAuth('google')}>
          Continue with Google
        </Button>
        <Button variant="secondary" loading={pending === 'github'} onClick={() => onOAuth('github')}>
          Continue with GitHub
        </Button>
      </div>
      <div className="my-1 flex items-center gap-3">
        <div className="h-px flex-1 bg-[color:var(--rule)]" />
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--muted)]">
          or
        </span>
        <div className="h-px flex-1 bg-[color:var(--rule)]" />
      </div>
    </div>
  )
}
