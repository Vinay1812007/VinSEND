import { forwardRef, type ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const BASE =
  'inline-flex items-center justify-center gap-2 font-medium rounded transition-colors ' +
  'disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[color:var(--accent)] text-[color:var(--accent-ink)] hover:brightness-95 active:brightness-90',
  secondary:
    'bg-[color:var(--sunk)] text-[color:var(--ink)] border border-[color:var(--rule)] hover:bg-[color:var(--sunk-2)]',
  ghost:
    'bg-transparent text-[color:var(--ink)] hover:bg-[color:var(--sunk)]',
  danger:
    'bg-[color:var(--bad)] text-white hover:brightness-95 active:brightness-90',
}

const SIZES: Record<Size, string> = {
  sm: 'text-xs px-3 h-8',
  md: 'text-sm px-4 h-9',
  lg: 'text-sm px-5 h-11',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, disabled, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={clsx(BASE, VARIANTS[variant], SIZES[size], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />}
      {children}
    </button>
  )
})
