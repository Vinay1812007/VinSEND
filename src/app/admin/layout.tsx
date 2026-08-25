import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Brand } from '@/components/layout/brand'
import { SignOutButton } from '@/components/layout/sign-out-button'
import { requireStaff } from '@/server/services/admin'

export const dynamic = 'force-dynamic'

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/organizations', label: 'Organizations' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/webhooks', label: 'Webhook triage' },
  { href: '/admin/system', label: 'System' },
] as const

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user
  try {
    user = await requireStaff()
  } catch {
    redirect('/app')
  }

  return (
    <div className="grid min-h-screen grid-cols-[220px_1fr]">
      <aside className="border-r border-[color:var(--rule)] bg-[color:var(--sunk)] px-5 py-6 flex flex-col">
        <Brand href="/admin" />
        <div className="mt-8 mb-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
          Staff · admin
        </div>
        <div className="mb-6 text-xs text-[color:var(--muted)] truncate" title={user.email}>
          {user.email}
        </div>
        <nav className="flex flex-col gap-[2px]">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded px-3 py-1.5 text-sm text-[color:var(--ink-2)] hover:bg-[color:var(--ground)] hover:text-[color:var(--ink)]"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-6 border-t border-[color:var(--rule)] flex flex-col gap-2">
          <Link
            href="/app"
            className="rounded px-3 py-1.5 text-xs text-[color:var(--muted)] hover:text-[color:var(--accent)]"
          >
            ← Back to dashboard
          </Link>
          <SignOutButton />
        </div>
      </aside>
      <main className="min-w-0 bg-[color:var(--ground)]">
        <div className="mx-auto max-w-5xl px-8 py-10">{children}</div>
      </main>
    </div>
  )
}
