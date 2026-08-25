'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { saveProviderAction, testProviderAction } from './actions'

export function SesForm({
  orgSlug,
  projectPublicId,
}: {
  orgSlug: string
  projectPublicId: string
}) {
  const router = useRouter()
  const [name, setName] = useState('Amazon SES')
  const [region, setRegion] = useState('us-east-1')
  const [accessKeyId, setAccessKeyId] = useState('')
  const [secretAccessKey, setSecretAccessKey] = useState('')
  const [configurationSet, setConfigurationSet] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [pending, setPending] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const config = () => ({
    region: region.trim(),
    accessKeyId: accessKeyId.trim(),
    secretAccessKey: secretAccessKey.trim(),
    ...(configurationSet.trim() ? { configurationSet: configurationSet.trim() } : {}),
  })

  async function onTest() {
    setTesting(true)
    setError(null)
    setOk(null)
    const res = await testProviderAction({ type: 'ses', config: config() })
    setTesting(false)
    if (res.ok) setOk('SES credentials accepted.')
    else setError(res.message ?? 'SES test failed.')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    setOk(null)
    const res = await saveProviderAction({
      orgSlug,
      projectPublicId,
      type: 'ses',
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
      <Field label="Name" id="ses-name">
        <Input id="ses-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="AWS region" id="ses-region">
        <Input
          id="ses-region"
          required
          placeholder="us-east-1"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        />
      </Field>
      <Field label="Access key ID" id="ses-akid" hint="IAM key with ses:SendEmail">
        <Input
          id="ses-akid"
          required
          value={accessKeyId}
          onChange={(e) => setAccessKeyId(e.target.value)}
        />
      </Field>
      <Field label="Secret access key" id="ses-sak" hint="Stored encrypted">
        <Input
          id="ses-sak"
          required
          type="password"
          value={secretAccessKey}
          onChange={(e) => setSecretAccessKey(e.target.value)}
        />
      </Field>
      <Field
        label="Configuration set (optional)"
        id="ses-cfgset"
        hint="For SNS delivery events"
      >
        <Input
          id="ses-cfgset"
          value={configurationSet}
          onChange={(e) => setConfigurationSet(e.target.value)}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
        Default provider
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onTest} loading={testing}>
          Test credentials
        </Button>
        <Button type="submit" loading={pending}>
          Save
        </Button>
      </div>
    </form>
  )
}
