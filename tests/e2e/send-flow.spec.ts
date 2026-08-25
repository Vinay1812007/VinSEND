// Live-fire end-to-end. Skipped in default CI. To run:
//
//   PLAYWRIGHT_BASE_URL=http://localhost:3000 \
//   VINSEND_LIVE_TEST=1 \
//   VINSEND_LIVE_EMAIL=test-$(uuidgen)@example.com \
//   VINSEND_LIVE_PASSWORD='<a random string ≥ 8 chars>' \
//   VINSEND_LIVE_SMTP_HOST=sandbox.smtp.mailtrap.io \
//   VINSEND_LIVE_SMTP_PORT=2525 \
//   VINSEND_LIVE_SMTP_USER=... \
//   VINSEND_LIVE_SMTP_PASS=... \
//   VINSEND_LIVE_DOMAIN=verified-domain.example.com \
//   npx playwright test tests/e2e/send-flow.spec.ts
//
// Requires: a disposable Supabase project pushed with all migrations, and a
// verified sender domain there (verify manually beforehand — this test does
// not create DNS records). Never point at production.

import { test, expect } from '@playwright/test'

const LIVE = process.env.VINSEND_LIVE_TEST === '1'
const skip = !LIVE
test.skip(skip, 'set VINSEND_LIVE_TEST=1 with the full env to opt in')

test('sign up → project → SMTP → key → send → observe', async ({ page, request }) => {
  const email = process.env.VINSEND_LIVE_EMAIL!
  const password = process.env.VINSEND_LIVE_PASSWORD!
  const smtpHost = process.env.VINSEND_LIVE_SMTP_HOST!
  const smtpPort = process.env.VINSEND_LIVE_SMTP_PORT ?? '2525'
  const smtpUser = process.env.VINSEND_LIVE_SMTP_USER!
  const smtpPass = process.env.VINSEND_LIVE_SMTP_PASS!
  const verifiedDomain = process.env.VINSEND_LIVE_DOMAIN!

  // ---- sign up ------------------------------------------------------------
  await page.goto('/sign-up')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /create account/i }).click()

  // Assume email confirmation is disabled in the disposable project.
  await page.waitForURL(/\/onboarding|\/app/, { timeout: 30_000 })

  // ---- onboarding ---------------------------------------------------------
  if (page.url().includes('/onboarding')) {
    await page.getByLabel(/workspace name/i).fill('Playwright E2E')
    await page.getByRole('button', { name: /create workspace/i }).click()
  }
  await page.waitForURL(/\/app\//, { timeout: 30_000 })

  // ---- SMTP provider ------------------------------------------------------
  await page.getByRole('link', { name: 'Providers' }).click()
  await page.getByLabel('Host').fill(smtpHost)
  await page.getByLabel('Port').fill(smtpPort)
  await page.getByLabel('Username').fill(smtpUser)
  await page.getByLabel('Password').fill(smtpPass)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText(/Provider saved/i)).toBeVisible({ timeout: 15_000 })

  // ---- API key ------------------------------------------------------------
  await page.getByRole('link', { name: 'API Keys' }).click()
  await page.getByRole('button', { name: /new key/i }).click()
  await page.getByLabel('Name').fill('E2E key')
  await page.getByRole('button', { name: 'Create' }).click()
  const secretText = await page.getByRole('code').first().innerText()
  const secret = secretText.trim()
  expect(secret).toMatch(/^vs_live_[A-Za-z0-9]{32}$/)

  // ---- send via /v1/emails -------------------------------------------------
  const send = await request.post(`${process.env.PLAYWRIGHT_BASE_URL}/v1/emails`, {
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    data: {
      from: `test@${verifiedDomain}`,
      to: [`inbox@${verifiedDomain}`],
      subject: 'Playwright test',
      text: 'Hello from the e2e suite.',
    },
  })
  expect(send.status(), await send.text()).toBe(202)
  const body = (await send.json()) as { id: string; status: string }
  expect(body.id).toMatch(/^email_/)
  expect(body.status).toBe('sent')
})
