import clsx from 'clsx'

type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'accent'

const TONES: Record<Tone, string> = {
  neutral: 'bg-[color:var(--sunk-2)] text-[color:var(--muted)]',
  good: 'bg-[color-mix(in_srgb,var(--good)_14%,var(--ground))] text-[color:var(--good)]',
  warn: 'bg-[color-mix(in_srgb,var(--warn)_14%,var(--ground))] text-[color:var(--warn)]',
  bad: 'bg-[color-mix(in_srgb,var(--bad)_14%,var(--ground))] text-[color:var(--bad)]',
  accent: 'bg-[color-mix(in_srgb,var(--accent)_14%,var(--ground))] text-[color:var(--accent)]',
}

export function Tag({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={clsx(
        'inline-block rounded px-2 py-[2px] font-mono text-[10px] font-medium uppercase tracking-[0.08em] whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function statusToTone(status: string): Tone {
  switch (status) {
    case 'sent':
    case 'delivered':
    case 'verified':
    case 'matched':
    case 'active':
      return 'good'
    case 'queued':
    case 'processing':
    case 'pending':
    case 'verifying':
    case 'deferred':
      return 'warn'
    case 'failed':
    case 'bounced':
    case 'complained':
    case 'rejected':
    case 'missing':
    case 'mismatched':
    case 'disabled':
      return 'bad'
    default:
      return 'neutral'
  }
}
