import Link from 'next/link'
import { Brand } from '@/components/layout/brand'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-24">
      <header className="mb-16 flex items-center justify-between">
        <Brand size="lg" />
        <nav className="flex items-center gap-6">
          <Link href="/sign-in" className="text-sm text-[color:var(--ink-2)] hover:text-[color:var(--accent)]">
            Sign in
          </Link>
          <Link href="/sign-up">
            <Button size="sm">Create account</Button>
          </Link>
        </nav>
      </header>

      <section>
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
          Email infrastructure &middot; Developer platform
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-medium leading-[1.04] tracking-tight text-[color:var(--ink)] max-w-3xl">
          Ship transactional email <em className="text-[color:var(--accent)] italic font-normal">without owning an MTA.</em>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[color:var(--muted)]">
          VinSEND is a clean control plane for the SMTP provider you already use — one API, real
          verification, signed webhooks, and a dashboard that stays out of your way.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link href="/sign-up">
            <Button size="lg">Get started</Button>
          </Link>
          <Link href="/docs" className="text-sm text-[color:var(--ink-2)] hover:text-[color:var(--accent)]">
            Read the API reference &rarr;
          </Link>
        </div>
      </section>

      <section className="mt-24 grid gap-0 border border-[color:var(--rule)] rounded bg-[color:var(--sunk)] md:grid-cols-3">
        {[
          { eyebrow: '01 Sign', title: 'BYO provider', copy: 'Connect Amazon SES, generic SMTP, or the provider of your choice. We stay out of the delivery path.' },
          { eyebrow: '02 Send', title: 'One API', copy: 'POST /v1/emails. Idempotent, validated, and shaped exactly the way you’d expect.' },
          { eyebrow: '03 Track', title: 'Signed events', copy: 'Signed webhooks, immutable event streams, and suppression handling built in.' },
        ].map((c, i) => (
          <div key={i} className={`p-6 ${i > 0 ? 'md:border-l border-[color:var(--rule)]' : ''}`}>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
              {c.eyebrow}
            </div>
            <h3 className="font-display text-xl font-medium text-[color:var(--ink)] mb-1">{c.title}</h3>
            <p className="text-sm text-[color:var(--muted)]">{c.copy}</p>
          </div>
        ))}
      </section>

      <footer className="mt-24 pt-8 border-t border-[color:var(--rule)] text-xs text-[color:var(--muted)] font-mono uppercase tracking-[0.1em]">
        VinSEND &middot; Developer-focused email infrastructure
      </footer>
    </div>
  )
}
