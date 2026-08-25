'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { getBrowserSupabase } from '@/lib/auth/browser'
import { publicEnv } from '@/lib/validation/env'
import { OAuthButtons } from '../oauth-buttons'

export default function SignUpPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPending(true)
    setError(null)
    setInfo(null)
    try {
      const sb = getBrowserSupabase()
      const { data, error: err } = await sb.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${publicEnv.APP_URL}/onboarding`,
          data: { display_name: name || email.split('@')[0] },
        },
      })
      if (err) throw err
      if (data.session) {
        router.push('/onboarding')
        router.refresh()
      } else {
        setInfo('Check your email to confirm your account, then sign in.')
      }
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
          Create account
        </h1>
        <p className="mb-6 text-sm text-[color:var(--muted)]">Start sending in minutes.</p>

        {error && (
          <div className="mb-4">
            <Alert tone="bad">{error}</Alert>
          </div>
        )}
        {info && (
          <div className="mb-4">
            <Alert tone="good">{info}</Alert>
          </div>
        )}

        <div className="mb-4">
          <OAuthButtons next="/onboarding" />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Full name" id="name">
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
          </Field>
          <Field label="Work email" id="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password" id="password" hint="8+ characters">
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
            Create account
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-[color:var(--muted)]">
          Already have an account?{' '}
          <Link href="/sign-in" className="hover:text-[color:var(--accent)]">
            Sign in
          </Link>
        </div>
      </CardBody>
    </Card>
  )
}
