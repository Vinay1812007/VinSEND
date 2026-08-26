import Link from 'next/link'
import { Brand } from './brand'
import { SignOutButton } from './sign-out-button'

export interface ProjectContext {
  orgSlug: string
  projectPublicId: string
  orgName: string
  projectName: string
}

const NAV = [
  { href: 'overview', label: 'Overview' },
  { href: 'emails', label: 'Emails' },
  { href: 'domains', label: 'Domains' },
  { href: 'api-keys', label: 'API Keys' },
  { href: 'templates', label: 'Templates' },
  { href: 'contacts', label: 'Contacts' },
  { href: 'suppressions', label: 'Suppressions' },
  { href: 'webhooks', label: 'Webhooks' },
  { href: 'analytics', label: 'Analytics' },
  { href: 'audit', label: 'Audit log' },
  { href: 'settings', label: 'Settings' },
] as const

export function DashboardShell({
  context,
  currentPath,
  userEmail,
  children,
}: {
  context: ProjectContext
  currentPath: string
  userEmail: string
  children: React.ReactNode
}) {
  const base = `/app/${context.orgSlug}/${context.projectPublicId}`
  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <aside className="border-r border-[color:var(--rule)] bg-[color:var(--sunk)] px-5 py-6 flex flex-col">
        <Brand href="/app" />
        <div className="mt-8 mb-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
          Workspace
        </div>
        <div className="mb-1 text-sm font-medium text-[color:var(--ink)]">{context.orgName}</div>
        <div className="mb-6 font-mono text-[11px] text-[color:var(--muted)]">
          {context.projectName}
        </div>

        <nav className="flex flex-col gap-[2px]">
          {NAV.map((item) => {
            const href = `${base}/${item.href}`
            const active = currentPath.startsWith(href)
            return (
              <Link
                key={item.href}
                href={href}
                className={`rounded px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? 'bg-[color:var(--ground)] text-[color:var(--accent)] font-medium border border-[color:var(--rule)]'
                    : 'text-[color:var(--ink-2)] hover:bg-[color:var(--ground)] hover:text-[color:var(--ink)]'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-[color:var(--rule)] flex flex-col gap-2">
          <div className="text-xs text-[color:var(--muted)] truncate" title={userEmail}>
            {userEmail}
          </div>
          <SignOutButton />
        </div>
      </aside>
      <main className="min-w-0 bg-[color:var(--ground)]">
        <div className="mx-auto max-w-5xl px-8 py-10">{children}</div>
      </main>
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <header className="mb-8 flex items-start justify-between gap-6 border-b border-[color:var(--rule)] pb-6">
      <div>
        {eyebrow && (
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-3xl font-medium leading-tight tracking-tight text-[color:var(--ink)]">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-xl text-sm text-[color:var(--muted)]">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}

