# Deploying VinSEND to Koyeb (free forever, no card)

Two services, both on the Koyeb free tier: `web` (Next.js app + REST API)
and `worker` (webhook retries + nightly jobs, no external cron needed).
Everything else lives in Supabase Cloud's free tier.

Total monthly cost: **$0**.

---

## 1 — Supabase (one-time)

Same setup as any other host:

1. Create a project at <https://supabase.com/dashboard> — free tier is
   fine (500 MB Postgres, 50k MAU).
2. From your Mac:
   ```bash
   brew install supabase/tap/supabase
   cd ~/Downloads/vinsend
   supabase link --project-ref <ref>
   supabase db push
   ```
3. Note four values from **Project settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL` = the project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = the service_role key
4. In **Authentication → URL configuration**, add your Koyeb URL
   (you'll get it after the first deploy) to *Site URL* and *Additional
   Redirect URLs*.

## 2 — Generate the two app secrets

Run on your Mac:

```bash
openssl rand -base64 32   # → SECRET_ENCRYPTION_KEY
openssl rand -base64 32   # → API_KEY_PEPPER
```

Save both.

## 3 — Koyeb secrets

Sign up at <https://app.koyeb.com/auth/signup> with GitHub. Then:

**Secrets tab → Create secret** (do this five times):

| Secret name                | Value                                       |
| -------------------------- | ------------------------------------------- |
| `vinsend_supabase_url`     | your Supabase project URL                   |
| `vinsend_supabase_anon`    | Supabase anon key                           |
| `vinsend_supabase_service` | Supabase service_role key                   |
| `vinsend_encryption_key`   | first `openssl rand -base64 32` from step 2 |
| `vinsend_api_key_pepper`   | second `openssl rand -base64 32`            |

## 4 — Deploy both services from `koyeb.yaml`

The repo ships `koyeb.yaml` at the root with both services defined. Two
ways to apply it:

### Option A — web console (recommended)

1. Koyeb console → **Create App**.
2. Pick **GitHub → Vinay1812007/VinSEND → main**.
3. When Koyeb offers a service form, switch to **Import from
   koyeb.yaml** (link at the top).
4. Edit the placeholder `NEXT_PUBLIC_APP_URL` — replace
   `vinsend-web-<your-handle>.koyeb.app` with what your app will
   actually be called (Koyeb shows a preview).
5. Deploy.

### Option B — CLI

```bash
brew install koyeb/tap/koyeb
koyeb login   # opens browser
cd ~/Downloads/vinsend
koyeb app init vinsend --git-branch main
# Edit koyeb.yaml → replace the URL placeholders
koyeb service create --from-file koyeb.yaml
```

## 5 — First-run smoke test

1. Wait ~3 min for both services to reach **Healthy**.
2. Open `https://<your-koyeb-url>` → sign up.
3. Onboarding → workspace created.
4. **Providers** → configure SMTP (Mailtrap Sandbox works for testing).
5. **Domains** → add + verify a domain you control.
6. **API Keys** → create → copy the `vs_live_…` secret.
7. From your Mac:

   ```bash
   curl -X POST https://<your-koyeb-url>/v1/emails \
     -H "Authorization: Bearer vs_live_..." \
     -H "Content-Type: application/json" \
     -d '{
       "from": "hello@your-verified-domain.com",
       "to":   ["you@gmail.com"],
       "subject": "First VinSEND send from Koyeb",
       "html": "<h1>It works.</h1>"
     }'
   ```

   Expect `202 { "id": "email_...", "status": "sent" }`.
8. Dashboard → **Emails** — the message appears.

## 6 — Grant yourself admin

Supabase → SQL editor:

```sql
update public.profiles set is_staff = true where id = '<your-user-uuid>';
```

Then visit `https://<your-koyeb-url>/admin`.

## 7 — Push updates

```bash
git add -A
git commit -m "your message"
git push
```

Koyeb auto-deploys on push to `main`.

## Notes specific to Koyeb

- **Cron.** The worker service runs an in-process daily scheduler
  (`WORKER_RUN_CRON=true` in `koyeb.yaml`) that hits
  `/api/internal/analytics/refresh` and `/api/internal/audit/archive` at
  ~03:00 UTC. No external cron needed.
- **Sizing.** Free instance is 0.1 vCPU / 512 MB. Handles ~10 rps sends.
  When you outgrow it, jump to the smallest paid instance — it's ~$3/mo.
- **Build minutes.** Free tier gives 5 min/month by default. Each build
  is ~2 min. If you push more than twice a month, ask Koyeb support to
  raise the limit (they usually will).
- **Regions.** `koyeb.yaml` uses `fra` (Frankfurt). Change to `was`
  (Washington), `sin` (Singapore), or `tyo` (Tokyo) to match your users.
- **Custom domain.** Console → your web service → **Settings → Domains
  → Add domain**, then add a CNAME at your registrar to the value Koyeb
  shows. HTTPS is automatic.

## Troubleshooting

| Symptom                                 | Fix                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Web service stuck "Building"            | Free tier build queue can be slow. Check build logs.                                                   |
| `SECRET_ENCRYPTION_KEY must decode to at least 32 bytes` | You saved the value wrapped in quotes. Recreate without quotes.                             |
| Every send returns `domain_not_verified` | Add + verify a domain in **Domains** first.                                                            |
| Worker restarts every few minutes       | Usually OOM — 512 MB is enough but batch size of 100+ can spike it. Set env `WORKER_BATCH=25`.         |
| Analytics never refresh                 | Worker service has `WORKER_RUN_CRON=true`? Check `koyeb.yaml` and confirm on the worker's Env page.    |
| Web URL redirects to Supabase           | You typed `SUPABASE_URL` into `APP_URL`. Fix and redeploy.                                             |
