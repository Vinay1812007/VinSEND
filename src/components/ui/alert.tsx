import clsx from 'clsx'

type Tone = 'info' | 'warn' | 'bad' | 'good'

const TONES: Record<Tone, string> = {
  info: 'border-l-[color:var(--accent)]',
  warn: 'border-l-[color:var(--warn)]',
  bad: 'border-l-[color:var(--bad)]',
  good: 'border-l-[color:var(--good)]',
}

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: Tone
  title?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={clsx(
        'rounded border border-[color:var(--rule)] bg-[color:var(--sunk)] px-4 py-3 border-l-4',
        TONES[tone],
        className,
      )}
      role="status"
    >
      {title && (
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em]">
          {title}
        </div>
      )}
      <div className="text-sm text-[color:var(--ink-2)]">{children}</div>
    </div>
  )
}
