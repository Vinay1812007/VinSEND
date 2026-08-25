'use client'

import { Suspense, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { getBrowserSupabase } from '@/lib/auth/browser'
import { OAuthButtons } from '../oauth-buttons'

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  )
}

function SignInForm() {
  const router = useRouter()
  const search = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      const sb = getBrowserSupabase()
      const { error: err } = await sb.auth.signInWithPassword({ email, password })
      if (err) throw err
      const next = search.get('next') || '/app'
      router.push(next)
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
        <h1 className="mb-1 font-display text-2xl font-medium text-[color:var(--ink)]">
          Sign in
        </h1>
        <p className="mb-6 text-sm text-[color:var(--muted)]">Welcome back.</p>

        {error && (
          <div className="mb-4">
            <Alert tone="bad">{error}</Alert>
          </div>
        )}

        <div className="mb-4">
          <OAuthButtons next={search.get('next') || '/app'} />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Email" id="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password" id="password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button type="submit" loading={pending}>
            Sign in
          </Button>
        </form>

        <div className="mt-6 flex justify-between text-xs text-[color:var(--muted)]">
          <Link href="/forgot-password" className="hover:text-[color:var(--accent)]">
            Forgot password
          </Link>
          <Link href="/sign-up" className="hover:text-[color:var(--accent)]">
            Create account
          </Link>
        </div>
      </CardBody>
    </Card>
  )
}
