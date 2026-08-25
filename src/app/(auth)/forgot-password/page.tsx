'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { getBrowserSupabase } from '@/lib/auth/browser'
import { publicEnv } from '@/lib/validation/env'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      const sb = getBrowserSupabase()
      const { error: err } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${publicEnv.APP_URL}/reset-password`,
      })
      if (err) throw err
      setSent(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardBody className="p-8">
        <h1 className="mb-1 font-display text-2xl font-medium text-[color:var(--ink)]">
          Reset your password
        </h1>
        <p className="mb-6 text-sm text-[color:var(--muted)]">
          Enter your email and we&rsquo;ll send a reset link.
        </p>

        {sent ? (
          <Alert tone="good" title="Sent">
            If an account exists for that email, a reset link is on its way.
          </Alert>
        ) : (
          <>
            {error && (
              <div className="mb-4">
                <Alert tone="bad">{error}</Alert>
              </div>
            )}
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <Field label="Email" id="email">
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Button type="submit" loading={pending}>
                Send reset link
              </Button>
            </form>
          </>
        )}
        <div className="mt-6 text-center text-xs">
          <Link href="/sign-in" className="text-[color:var(--muted)] hover:text-[color:var(--accent)]">
            Back to sign in
          </Link>
        </div>
      </CardBody>
    </Card>
  )
}
