# VinSEND

Developer-focused email infrastructure. A control plane and REST API for sending
transactional email through configurable third-party providers (SMTP for MVP;
Amazon SES / Mailgun / Postmark / SendGrid / Brevo adapters designed-for).

VinSEND is not an MTA. It handles authentication, per-project provider
configuration, sender domain verification, message persistence, event streams,
suppression handling, signed webhooks, and the dashboard around all of that.

## Architecture at a glance

- **Presentation** — Next.js App Router + React Server Components (dashboard, docs).
- **Service layer** — pure TypeScript under `src/server/services` and `src/server/repositories`. Business rules and data access. Framework-free so the API can later be extracted into its own service.
- **Edge** — REST route handlers under `src/app/v1` and `src/app/api`. Thin — parse, validate with Zod, call a service, serialize.
- **Data** — Supabase Postgres with RLS on every tenant-scoped table.
- **Delivery** — an `EmailProvider` abstraction (`src/lib/email`). SMTP adapter (nodemailer) ships in the MVP.

See `docs/plan.html` (published as a claude.ai artifact) for the full architectural plan and decision log.

## Stack

TypeScript 5 (strict, `noUncheckedIndexedAccess`) · Next.js 15 · React 19 · Tailwind 3 · Supabase JS · Zod · nodemailer · Vitest · Playwright · Node 20 LTS.

## Local development

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env.local
# Fill in Supabase URL/keys, generate SECRET_ENCRYPTION_KEY and API_KEY_PEPPER:
openssl rand -base64 32   # for SECRET_ENCRYPTION_KEY
openssl rand -base64 32   # for API_KEY_PEPPER

# 3. Push migrations to your Supabase project
supabase link --project-ref <ref>
supabase db push

# 4. Run
npm run dev
```

Then open `http://localhost:3000` and sign up. The onboarding flow creates an organization and first project.

## Environment variables

See `.env.example` for the full list with comments. Categories:

| Category         | Variables                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------- |
| App              | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_BASE_URL`                                              |
| Supabase         | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` |
| Secrets          | `SECRET_ENCRYPTION_KEY` (32-byte base64), `API_KEY_PEPPER` (32-byte base64)                     |
| Webhooks         | `WEBHOOK_USER_AGENT`                                                                          |
| Runtime          | `LOG_LEVEL`, `NODE_ENV`                                                                       |

Never prefix a sensitive value with `NEXT_PUBLIC_`. The service-role key must never appear in client bundles.

## SMTP configuration

For local development, either:

- **Mailtrap Sandbox** — free, safe. Host `sandbox.smtp.mailtrap.io`, port `2525`.
- **MailHog** — local, `docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog`; host `localhost`, port `1025`, no auth, no TLS.

Provider config lives per-project in the `email_providers` table (encrypted with AES-256-GCM). Enter it via **Settings → Providers** in the dashboard.

## API usage

```bash
curl -X POST $NEXT_PUBLIC_API_BASE_URL/v1/emails \
  -H "Authorization: Bearer $VINSEND_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "from": "orders@yourdomain.com",
    "to": ["customer@example.com"],
    "subject": "Order confirmed",
    "html": "<h1>Your order has been confirmed</h1>",
    "text": "Your order has been confirmed."
  }'
```

Response:

```json
{ "id": "email_01k4h72q9m5xw8vz", "status": "queued", "created_at": "2026-08-25T12:00:00Z" }
```

Errors follow a stable shape:

```json
{ "error": { "code": "domain_not_verified", "message": "The sender domain has not been verified.", "request_id": "req_..." } }
```

See `/docs` on a running instance for the full API reference.

## Testing

```bash
npm run typecheck   # strict TS
npm run lint        # ESLint + layer boundaries
npm test            # Vitest unit + integration
npm run test:e2e    # Playwright end-to-end
npm run build       # production build
```

CI runs the first four on every push.

## Deployment (GitHub → Render → Supabase)

1. Create a Supabase project and note the URL / anon key / service-role key / DB URL.
2. Run `supabase db push` against it.
3. Create a Render Web Service, connect this repo, use `render.yaml` (already committed).
4. Enter all env vars in Render (marked `sync: false` in `render.yaml`).
5. Verify `/api/health` returns `200`.
6. Sign up, verify email, configure a provider, add a domain, verify DNS, create a key, send.

See §16 of `docs/plan.html` for the runbook and DNS-cutover procedure.

## Security notes

- API keys are stored as `SHA-256(secret + pepper)`. Shown to the caller once at creation.
- Provider credentials are AES-256-GCM encrypted with a per-project HKDF-derived key. Never returned by any API. The master key rotates by re-encrypting all rows.
- Webhook payloads are signed `HMAC-SHA256(secret, "<id>.<timestamp>.<body>")`, sent as `VinSEND-Webhook-Signature: v1,sha256=<b64>`.
- RLS on every tenant-scoped table. Server code that acts on a user's behalf uses that user's JWT so RLS is enforced by Postgres.
- Structured logger redacts `password`, `secret`, `hash`, `authorization`, `smtp_password`, `signing_secret`, `api_key`, and any value matching `/^vs_(live|test)_/`.

## Known MVP limitations

- Rate limiter is Postgres-backed (fixed window). Adapter for Upstash Redis is a Phase 6 upgrade.
- Send is inline in `POST /v1/emails`. Worker seam exists at `src/server/workers`.
- SMTP adapter capabilities: `deliveryEvents: false`. Delivery timelines populate only for providers that emit them (P4+).
- No inbound email.
- Templates use `{{variable}}` only. No conditionals or loops (spec §23).

## Provider architecture

Every delivery integration implements `EmailProvider` (`src/lib/email/types/provider.ts`). Provider errors are normalized to `EmailProviderErrorCode` before crossing the service seam. Adding a provider is: implement the interface, register it in `src/lib/email/registry.ts`, add a settings UI form. Nothing else in the codebase changes.

## License

Proprietary — all rights reserved.
