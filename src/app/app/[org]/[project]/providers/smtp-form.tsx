'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { saveProviderAction, testProviderAction } from './actions'

export function SmtpForm({
  orgSlug,
  projectPublicId,
}: {
  orgSlug: string
  projectPublicId: string
}) {
  const router = useRouter()
  const [name, setName] = useState('Primary SMTP')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('587')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [secure, setSecure] = useState(false)
  const [isDefault, setIsDefault] = useState(true)
  const [pending, setPending] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const config = () => ({
    host: host.trim(),
    port: Number(port),
    secure,
    requireTls: !secure,
    username: username || undefined,
    password: password || undefined,
  })

  async function onTest() {
    setTesting(true)
    setError(null)
    setOk(null)
    const res = await testProviderAction({ type: 'smtp', config: config() })
    setTesting(false)
    if (res.ok) setOk('SMTP connection succeeded.')
    else setError(res.message ?? 'SMTP test failed.')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    setOk(null)
    const res = await saveProviderAction({
      orgSlug,
      projectPublicId,
      type: 'smtp',
      name,
      is_default: isDefault,
      config: config(),
    })
    setPending(false)
    if ('error' in res) setError(res.error!)
    else {
      setOk('Provider saved.')
      router.refresh()
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && <Alert tone="bad">{error}</Alert>}
      {ok && <Alert tone="good">{ok}</Alert>}
      <Field label="Name" id="p-name">
        <Input id="p-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label="Host" id="p-host">
            <Input id="p-host" required placeholder="smtp.example.com" value={host} onChange={(e) => setHost(e.target.value)} />
          </Field>
        </div>
        <Field label="Port" id="p-port">
          <Input id="p-port" required type="number" value={port} onChange={(e) => setPort(e.target.value)} />
        </Field>
      </div>
      <Field label="Username" id="p-user">
        <Input id="p-user" value={username} onChange={(e) => setUsername(e.target.value)} />
      </Field>
      <Field label="Password" id="p-pass" hint="Stored encrypted">
        <Input id="p-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} />
          Implicit TLS (port 465)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          Default provider
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onTest} loading={testing}>
          Test connection
        </Button>
        <Button type="submit" loading={pending}>
          Save
        </Button>
      </div>
    </form>
  )
}
