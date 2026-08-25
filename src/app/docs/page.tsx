import Link from 'next/link'
import { Brand } from '@/components/layout/brand'

export const metadata = {
  title: 'API reference',
}

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12 flex items-center justify-between">
        <Brand size="lg" />
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/app" className="text-[color:var(--ink-2)] hover:text-[color:var(--accent)]">
            Dashboard
          </Link>
          <Link href="/sign-in" className="text-[color:var(--ink-2)] hover:text-[color:var(--accent)]">
            Sign in
          </Link>
        </nav>
      </header>

      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
        API Reference &middot; v1
      </div>
      <h1 className="font-display text-4xl font-medium tracking-tight text-[color:var(--ink)] mb-6">
        VinSEND API
      </h1>
      <p className="text-lg text-[color:var(--muted)] mb-12">
        Every endpoint lives under <code className="font-mono text-[13px]">/v1</code>, speaks JSON, and
        authenticates with an <code className="font-mono text-[13px]">Authorization: Bearer</code>{' '}
        header carrying a VinSEND API key.
      </p>

      <Nav />

      <Section id="authentication" title="Authentication" eyebrow="§ 1">
        <p>
          Every request must include a bearer token generated in{' '}
          <b>Dashboard → API Keys</b>. Keys are shown once at creation; VinSEND stores only a peppered
          SHA-256 hash.
        </p>
        <Code>{`curl -H "Authorization: Bearer vs_live_..." $API/v1/emails`}</Code>
        <p>
          Keys carry <code>scopes</code>. A read-only integration should be issued a key restricted to{' '}
          <code>emails.read</code> rather than a full-access key.
        </p>
      </Section>

      <Section id="send-email" title="Send an email" eyebrow="§ 2">
        <p className="font-mono text-[12px] mb-3"><b>POST</b> /v1/emails</p>
        <Code>{`curl -X POST $API/v1/emails \\
  -H "Authorization: Bearer $VINSEND_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -d '{
    "from": "Company <orders@your-domain.com>",
    "to": ["customer@example.com"],
    "subject": "Order confirmed",
    "html": "<h1>Your order</h1>",
    "text": "Your order was confirmed."
  }'`}</Code>
        <p><b>Response</b> (<code>202 Accepted</code>):</p>
        <Code>{`{
  "id": "email_01k4h72q9m5xw8vz",
  "status": "sent",
  "created_at": "2026-08-25T12:00:00Z"
}`}</Code>
        <p>The pipeline validates the sender domain, checks the suppression list, hands the message
        to the configured provider, and returns as soon as the provider accepts (or fails) it.</p>
        <p><b>Idempotency.</b> Repeat the same request with the same body + same{' '}
        <code>Idempotency-Key</code> header to receive the original response verbatim. A conflicting
        body under the same key returns <code>409 idempotency_conflict</code>.</p>
      </Section>

      <Section id="errors" title="Error shape" eyebrow="§ 3">
        <p>Every error uses one stable shape:</p>
        <Code>{`{
  "error": {
    "code": "domain_not_verified",
    "message": "The sender domain has not been verified.",
    "request_id": "req_01k4h72q9m5x"
  }
}`}</Code>
        <p>Codes are drawn from a closed enum; log <code>request_id</code> for support.</p>
      </Section>

      <Section id="domains" title="Domains" eyebrow="§ 4">
        <p className="font-mono text-[12px]"><b>POST</b> /v1/domains &middot;{' '}
          <b>GET</b> /v1/domains &middot;{' '}
          <b>GET</b> /v1/domains/:id &middot;{' '}
          <b>POST</b> /v1/domains/:id/verify
        </p>
        <p>
          Adding a domain returns the required SPF / DKIM / DMARC records. Once you&rsquo;ve added them at
          your DNS host, POST to <code>/v1/domains/:id/verify</code> to trigger a live TXT lookup.
        </p>
        <Code>{`curl -X POST $API/v1/domains \\
  -H "Authorization: Bearer $VINSEND_API_KEY" \\
  -d '{"domain":"mail.example.com"}'`}</Code>
      </Section>

      <Section id="webhooks" title="Webhooks" eyebrow="§ 5">
        <p>Register an endpoint and pick the events you want:</p>
        <Code>{`curl -X POST $API/v1/webhooks \\
  -H "Authorization: Bearer $VINSEND_API_KEY" \\
  -d '{
    "url": "https://api.yourapp.com/vinsend",
    "events": ["email.sent", "email.bounced", "email.complained"]
  }'`}</Code>
        <p>The response includes a <code>signing_secret</code> that is only shown once.</p>

        <h3 className="font-display text-xl font-medium mt-8 mb-2">Verifying a webhook</h3>
        <p>Every request VinSEND sends carries three headers:</p>
        <Code>{`VinSEND-Webhook-Id:          evt_01k4h72q9m5x
VinSEND-Webhook-Timestamp:   1756123200
VinSEND-Webhook-Signature:   v1,sha256=<base64>`}</Code>
        <p>
          The signature is <code>HMAC-SHA256(secret, &quot;id.timestamp.body&quot;)</code> in base64. Reject
          requests older than 5 minutes based on the timestamp header.
        </p>
        <Code>{`import crypto from "node:crypto";

function verify(req, secret) {
  const id  = req.headers["vinsend-webhook-id"];
  const ts  = req.headers["vinsend-webhook-timestamp"];
  const sig = req.headers["vinsend-webhook-signature"];
  if (Math.abs(Date.now()/1000 - Number(ts)) > 300) throw new Error("stale");
  const match = /^v1,sha256=(.+)$/.exec(sig);
  if (!match) throw new Error("bad signature format");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(\`\${id}.\${ts}.\${req.rawBody}\`)
    .digest("base64");
  if (!crypto.timingSafeEqual(Buffer.from(match[1], "base64"),
                               Buffer.from(expected, "base64"))) {
    throw new Error("signature mismatch");
  }
}`}</Code>
      </Section>

      <Section id="suppressions" title="Suppressions" eyebrow="§ 6">
        <p><b>POST</b> /v1/suppressions to block an address. Removing an entry created automatically
        from a hard bounce or complaint requires action in the dashboard (safety catch).</p>
      </Section>

      <Section id="event-types" title="Event vocabulary" eyebrow="§ 7">
        <ul className="list-disc pl-5 text-sm text-[color:var(--ink-2)] font-mono">
          <li>email.queued</li>
          <li>email.sent</li>
          <li>email.delivered</li>
          <li>email.deferred</li>
          <li>email.bounced</li>
          <li>email.complained</li>
          <li>email.opened</li>
          <li>email.clicked</li>
          <li>email.failed</li>
          <li>email.rejected</li>
        </ul>
        <p className="mt-3 text-sm text-[color:var(--muted)]">
          Not every provider emits every event. Generic SMTP surfaces only{' '}
          <code>email.queued</code>, <code>email.sent</code>, and <code>email.failed</code>.
        </p>
      </Section>

      <footer className="mt-16 pt-8 border-t border-[color:var(--rule)] text-xs text-[color:var(--muted)] font-mono uppercase tracking-[0.1em]">
        VinSEND &middot; API v1
      </footer>
    </div>
  )
}

function Nav() {
  const items = [
    ['authentication', 'Authentication'],
    ['send-email', 'Send email'],
    ['errors', 'Error shape'],
    ['domains', 'Domains'],
    ['webhooks', 'Webhooks'],
    ['suppressions', 'Suppressions'],
    ['event-types', 'Event vocabulary'],
  ] as const
  return (
    <nav className="mb-16 border border-[color:var(--rule)] bg-[color:var(--sunk)] rounded p-5">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
        Contents
      </div>
      <ol className="grid grid-cols-2 gap-y-1 text-sm">
        {items.map(([id, label], i) => (
          <li key={id} className="flex gap-3">
            <span className="font-mono text-[11px] text-[color:var(--muted)]">§ {i + 1}</span>
            <a href={`#${id}`} className="text-[color:var(--ink)] hover:text-[color:var(--accent)]">
              {label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mb-16 scroll-mt-6">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
        {eyebrow}
      </div>
      <h2 className="font-display text-2xl font-medium tracking-tight text-[color:var(--ink)] mb-4">
        {title}
      </h2>
      <div className="prose-vinsend text-[color:var(--ink-2)] text-sm leading-relaxed flex flex-col gap-3">
        {children}
      </div>
    </section>
  )
}

function Code({ children }: { children: string }) {
  return (
    <pre className="rounded border border-[color:var(--rule)] bg-[color:var(--sunk)] p-4 overflow-x-auto text-[12.5px] font-mono leading-relaxed my-2">
      <code>{children}</code>
    </pre>
  )
}
