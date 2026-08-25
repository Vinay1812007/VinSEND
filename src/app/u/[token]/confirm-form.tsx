'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { confirmUnsubscribeAction } from './actions'

export function ConfirmForm({ token, email: _email }: { token: string; email: string }) {
  void _email
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onClick() {
    setPending(true)
    setError(null)
    const res = await confirmUnsubscribeAction({ token })
    setPending(false)
    if ('error' in res) setError(res.error!)
    else setDone(true)
  }

  if (done) return <Alert tone="good">You&rsquo;ve been unsubscribed.</Alert>
  return (
    <div className="flex flex-col gap-3">
      {error && <Alert tone="bad">{error}</Alert>}
      <Button loading={pending} onClick={onClick}>Confirm unsubscribe</Button>
    </div>
  )
}
