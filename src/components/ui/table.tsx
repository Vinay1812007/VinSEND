import clsx from 'clsx'

export function DataTable({
  columns,
  children,
  className,
}: {
  columns: { key: string; label: string; align?: 'left' | 'right' }[]
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="w-full min-w-[560px] border-collapse text-sm tabular">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={clsx(
                  'border-b border-[color:var(--rule-strong)] bg-[color:var(--sunk)] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--muted)] font-medium',
                  c.align === 'right' ? 'text-right' : 'text-left',
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function TableRow({ children }: { children: React.ReactNode }) {
  return (
    <tr className="border-b border-[color:var(--rule)] last:border-b-0 hover:bg-[color:var(--sunk)]/50 transition-colors">
      {children}
    </tr>
  )
}

export function TableCell({
  children,
  className,
  align,
  mono,
}: {
  children?: React.ReactNode
  className?: string
  align?: 'left' | 'right'
  mono?: boolean
}) {
  return (
    <td
      className={clsx(
        'px-4 py-3 text-[color:var(--ink-2)]',
        align === 'right' && 'text-right',
        mono && 'font-mono text-[12.5px] text-[color:var(--ink)]',
        className,
      )}
    >
      {children}
    </td>
  )
}
