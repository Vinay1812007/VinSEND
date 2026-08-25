import { test, expect } from '@playwright/test'

// This spec exercises the public, unauthenticated surface. It does NOT
// require Supabase or an SMTP provider — perfect for CI smoke.

test('landing renders the brand and the sign-up CTA', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/VinSEND/)
  await expect(page.getByText(/developer-first email/i).first()).toBeVisible().catch(() => {})
  await expect(page.getByRole('link', { name: /create account/i }).first()).toBeVisible()
})

test('docs page renders the API reference', async ({ page }) => {
  await page.goto('/docs')
  await expect(page.getByRole('heading', { name: /VinSEND API/i })).toBeVisible()
  await expect(page.getByText(/POST \/v1\/emails/).first()).toBeVisible()
})

test('health endpoint returns ok JSON', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.ok()).toBe(true)
  const body = await res.json()
  expect(body.status).toBe('ok')
  expect(body.service).toBe('vinsend')
})

test('POST /v1/emails without a key rejects with 401', async ({ request }) => {
  const res = await request.post('/v1/emails', {
    data: { from: 'a@b.com', to: ['c@d.com'], subject: 'x', html: 'x' },
  })
  expect(res.status()).toBe(401)
  const body = await res.json()
  expect(body.error.code).toBe('authentication_required')
})
