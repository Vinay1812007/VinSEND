import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'

const BASE =
  'block w-full rounded border border-[color:var(--rule)] bg-[color:var(--ground)] px-3 py-2 text-sm ' +
  'text-[color:var(--ink)] placeholder:text-[color:var(--faint)] focus:outline-none focus:border-[color:var(--accent)] ' +
  'disabled:opacity-60 font-sans'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={clsx(BASE, className)} {...rest} />
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={clsx(BASE, 'min-h-[100px] font-mono text-[12px]', className)} {...rest} />
  },
)

export function Label({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string
  children: React.ReactNode
  hint?: React.ReactNode
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]"
    >
      <span>{children}</span>
      {hint && <span className="text-[color:var(--faint)]">{hint}</span>}
    </label>
  )
}

export function Field({
  label,
  children,
  hint,
  error,
  id,
}: {
  label: string
  children: React.ReactNode
  hint?: React.ReactNode
  error?: string | null
  id?: string
}) {
  return (
    <div>
      <Label htmlFor={id} hint={hint}>
        {label}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-[color:var(--bad)]">{error}</p>}
    </div>
  )
}
