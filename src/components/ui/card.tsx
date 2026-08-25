import clsx from 'clsx'

export function Card({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={clsx(
        'rounded border border-[color:var(--rule)] bg-[color:var(--ground)] shadow-card',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  eyebrow,
  action,
  description,
}: {
  title: React.ReactNode
  eyebrow?: React.ReactNode
  action?: React.ReactNode
  description?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[color:var(--rule)] px-6 py-5">
      <div>
        {eyebrow && (
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
            {eyebrow}
          </div>
        )}
        <h2 className="font-display text-xl font-medium leading-tight text-[color:var(--ink)]">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-[color:var(--muted)]">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('px-6 py-5', className)}>{children}</div>
}
