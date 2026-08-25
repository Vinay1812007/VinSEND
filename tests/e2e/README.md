# End-to-end tests

## What runs in CI

`public-surface.spec.ts` — no external dependencies. Boots the app and hits:

- `/` — landing page
- `/docs` — API reference
- `GET /api/health` — liveness
- `POST /v1/emails` (unauthenticated) — asserts the 401 shape

Run: `npm run test:e2e`

## Full send-flow smoke (not in CI)

The full sign-up → project → SMTP → domain → key → send flow needs a live
Supabase project, migrations applied, and an SMTP host reachable from the
runner. Enable it locally by:

1. Copying `.env.example` to `.env.local` and pointing at a **disposable**
   Supabase project.
2. Running `supabase db push` against it.
3. Setting SMTP env for Mailtrap Sandbox or MailHog.
4. `PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test send-flow.spec.ts`

Never run this against a production Supabase — it creates real rows.
