# Deploying VinSEND to Render — free tier only, external cron

Everything runs on the free Render web instance. The paid worker is
replaced by an external cron service (free) that:

1. Pings `/api/internal/webhooks/sweep` every minute → drives the
   webhook retry loop, and as a side effect keeps the free dyno warm
   so real users don't hit the 30 sec cold-start.
2. Pings `/api/internal/analytics/refresh` daily → refreshes the
   analytics materialized view.
3. Pings `/api/internal/audit/archive` daily → nightly audit log
   snapshot.

Total monthly cost: **$0**. Trade-off: a cold user request during a
long quiet window (unlikely with the 1-min sweep keeping it warm) sees
a ~30 sec startup.

---

## 1 — Supabase (one-time)

Same as any other host:

1. Create a project at <https://supabase.com/dashboard> (free tier is fine).
2. From your Mac:
   ```bash
   brew install supabase/tap/supabase
   cd ~/Downloads/vinsend
   supabase link --project-ref <ref>
   supabase db push
   ```
3. Note four values from **Project settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (from **Settings → Database → Connection string**)

## 2 — Generate the two app secrets

```bash
openssl rand -base64 32   # → SECRET_ENCRYPTION_KEY
openssl rand -base64 32   # → API_KEY_PEPPER
```

Save both.

## 3 — Deploy to Render

1. https://dashboard.render.com → **New +** → **Blueprint** → connect
   the `Vinay1812007/VinSEND` repo.
2. Render reads `render.yaml` and offers one service: `vinsend` on the
   Free plan.
3. Fill in the env vars it prompts for (all the `sync: false` keys from
   step 1 and step 2). `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_API_BASE_URL`
   both = your Render URL (something like
   `https://vinsend-xxxx.onrender.com`).
4. Deploy. First build ~4 min.
5. When health check goes green, open the URL.

## 4 — Configure the external cron

Pick one of the free schedulers. Both work fine.

### Option A — cron-job.org (recommended, supports minute schedules)

1. https://cron-job.org — sign up (free, no card).
2. **Cronjobs → Create cronjob**:

   **Job 1 — Webhook sweep (every minute)**
   - Title: `VinSEND — sweep`
   - URL: `https://<your-vinsend>.onrender.com/api/internal/webhooks/sweep`
   - Schedule: **Every minute**
   - Request method: **POST**
   - **Advanced → Custom HTTP headers → Add**:
     - `x-vinsend-cron` = `<your API_KEY_PEPPER value>`
   - Save.

   **Job 2 — Analytics refresh (daily 03:00 UTC)**
   - URL: `https://<your-vinsend>.onrender.com/api/internal/analytics/refresh`
   - Schedule: **At 03:00** (UTC)
   - Method: **POST**
   - Same custom header.

   **Job 3 — Audit archive (daily 03:05 UTC)**
   - URL: `https://<your-vinsend>.onrender.com/api/internal/audit/archive`
   - Schedule: **At 03:05** (UTC)
   - Method: **POST**
   - Same custom header.

3. Check the **Execution history** tab after 2 min — you should see
   green `200` responses. If any are red, click into the row to see the
   response body.

### Option B — UptimeRobot (5-min minimum on free)

Works, but the sweep interval drops to every 5 min instead of every
minute. Fine for low volume. Sign up, add **Monitor type: HTTP(s)**
with the sweep URL + custom `x-vinsend-cron` header, interval 5 min.

## 5 — First-run smoke test

1. Open your Render URL → sign up.
2. Onboarding creates your workspace.
3. **Providers → Add SMTP** (or SES / Mailgun / etc.). Mailtrap Sandbox
   is ideal for testing: `sandbox.smtp.mailtrap.io:2525`.
4. **Domains → Add** a domain you control. Copy the SPF / DKIM / DMARC
   records to your DNS provider, then click **Verify DNS**.
5. **API Keys → New key**. Copy the `vs_live_…` secret (shown once).
6. From your Mac:
   ```bash
   curl -X POST https://<your-render>.onrender.com/v1/emails \
     -H "Authorization: Bearer vs_live_..." \
     -H "Content-Type: application/json" \
     -d '{
       "from": "hello@your-verified-domain.com",
       "to":   ["you@gmail.com"],
       "subject": "First VinSEND send from Render",
       "html": "<h1>It works.</h1>"
     }'
   ```
7. Expect `202 { "id": "email_...", "status": "sent" }`.
8. Dashboard → **Emails** — the message is listed.

## 6 — Grant yourself admin

Supabase → SQL editor:

```sql
update public.profiles set is_staff = true where id = '<your-user-uuid>';
```

Then visit `https://<your-render>.onrender.com/admin`.

## 7 — Push updates

```bash
git add -A
git commit -m "your message"
git push
```

Render auto-deploys on push to `main`.

## What you lose vs a paid worker

- Sweep granularity is bounded by your cron provider's minimum (1 min on
  cron-job.org, 5 min on UptimeRobot).
- Cold starts are possible on very quiet accounts if the cron pause
  exceeds 15 min. With a per-minute sweep this never happens in practice.
- The nightly analytics + audit jobs share the sweep response window
  (up to 60s), which is fine — they're bounded by their own execution
  time.

## What you keep

- All 40+ `/v1` endpoints
- OAuth, admin panel, audit log, template versioning, contact
  lists/segments, CSV import/export, hosted unsubscribe, GDPR export
- All 6 provider adapters (SMTP, SES, Mailgun, Postmark, SendGrid, Brevo)
- All webhook signature verification (SNS, Mailgun HMAC, SendGrid ECDSA)

Nothing in the app is disabled on the free tier — the worker was only
an operational convenience. The external cron does the same job with
one extra hop.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Health check fails on first deploy | Usually a missing env var. Check the deploy log. |
| Cron job returns `401 unauthorized` | The `x-vinsend-cron` header value doesn't match `API_KEY_PEPPER` exactly. Copy-paste it again — no surrounding quotes. |
| Send API returns 502 first time each morning | Cold start. Set the cron interval to 1 min instead of 5 to keep the dyno warm. |
| `SECRET_ENCRYPTION_KEY must decode to at least 32 bytes` | You wrapped the value in quotes when pasting. Redo without quotes. |
