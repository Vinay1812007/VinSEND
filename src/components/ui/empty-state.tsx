export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded border border-dashed border-[color:var(--rule)] bg-[color:var(--sunk)] px-6 py-10">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
        Nothing here yet
      </div>
      <h3 className="font-display text-lg font-medium text-[color:var(--ink)]">{title}</h3>
      {description && <p className="max-w-md text-sm text-[color:var(--muted)]">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
