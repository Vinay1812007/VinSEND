'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { extractTemplateVariables, renderTemplate } from '@/lib/templating/render'
import { createTemplateAction, editTemplateAction } from './actions'

export function TemplateForm({
  mode,
  orgSlug,
  projectPublicId,
  publicId,
  initial,
}: {
  mode: 'create' | 'edit'
  orgSlug: string
  projectPublicId: string
  publicId?: string
  initial?: { name: string; subject: string; html: string; text: string | null }
}) {
  const router = useRouter()
  const [name, setName] = useState(initial?.name ?? '')
  const [subject, setSubject] = useState(initial?.subject ?? '')
  const [html, setHtml] = useState(initial?.html ?? '')
  const [text, setText] = useState(initial?.text ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const variables = useMemo(
    () => extractTemplateVariables(`${subject}\n${html}\n${text}`),
    [subject, html, text],
  )
  const [values, setValues] = useState<Record<string, string>>({})
  const preview = useMemo(() => renderTemplate(html, values), [html, values])
  const subjectPreview = useMemo(() => renderTemplate(subject, values), [subject, values])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res =
      mode === 'create'
        ? await createTemplateAction({ orgSlug, projectPublicId, name, subject, html, text })
        : await editTemplateAction({
            orgSlug,
            projectPublicId,
            publicId: publicId!,
            name,
            subject,
            html,
            text,
          })
    setPending(false)
    if ('error' in res) setError(res.error!)
    else if (mode === 'create' && 'publicId' in res) {
      router.push(`/app/${orgSlug}/${projectPublicId}/templates/${res.publicId}`)
    } else {
      router.refresh()
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="flex flex-col gap-4">
        {error && <Alert tone="bad">{error}</Alert>}
        <Field label="Name" id="t-name">
          <Input id="t-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Subject" id="t-subject">
          <Input id="t-subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label="HTML body" id="t-html" hint="Use {{variable}} for placeholders">
          <Textarea
            id="t-html"
            required
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={12}
          />
        </Field>
        <Field label="Plain-text body (optional)" id="t-text">
          <Textarea id="t-text" value={text} onChange={(e) => setText(e.target.value)} rows={4} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" loading={pending}>
            {mode === 'create' ? 'Create template' : 'Save changes'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
            Variables detected
          </div>
          {variables.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">None yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {variables.map((v) => (
                <label key={v} className="grid grid-cols-[130px_1fr] items-center gap-2">
                  <span className="font-mono text-[12px] text-[color:var(--ink)]">{`{{${v}}}`}</span>
                  <Input
                    placeholder={`test value for ${v}`}
                    value={values[v] ?? ''}
                    onChange={(e) => setValues({ ...values, [v]: e.target.value })}
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
            Preview subject
          </div>
          <div className="rounded border border-[color:var(--rule)] bg-[color:var(--sunk)] px-3 py-2 font-mono text-[13px]">
            {subjectPreview || <span className="text-[color:var(--faint)]">—</span>}
          </div>
        </div>

        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
            Preview HTML (sandboxed)
          </div>
          <iframe
            sandbox=""
            className="w-full min-h-[300px] rounded border border-[color:var(--rule)] bg-white"
            srcDoc={preview}
            title="Template preview"
          />
        </div>
      </div>
    </form>
  )
}
