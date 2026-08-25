'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { getBrowserSupabase } from '@/lib/auth/browser'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      const sb = getBrowserSupabase()
      const { error: err } = await sb.auth.updateUser({ password })
      if (err) throw err
      router.push('/app')
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardBody className="p-8">
        <h1 className="mb-6 font-display text-2xl font-medium text-[color:var(--ink)]">
          Choose a new password
        </h1>
        {error && (
          <div className="mb-4">
            <Alert tone="bad">{error}</Alert>
          </div>
        )}
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="New password" id="password" hint="8+ characters">
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button type="submit" loading={pending}>
            Update password
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}
