#!/usr/bin/env node
// Long-running webhook-delivery worker.
//
// Runs `sweepWebhookDeliveries` on a tight loop with adaptive backoff:
//   - Empty sweep → back off to POLL_IDLE_MS (default 5s).
//   - Non-empty  → immediately loop again for the next batch.
//
// When WORKER_RUN_CRON=true, also runs an in-process daily scheduler that
// hits the analytics-refresh + audit-archive endpoints at 03:00 UTC. That
// lets Koyeb (and any other host without built-in cron) skip external
// schedulers entirely.
//
// Graceful shutdown on SIGINT / SIGTERM.

import { runWebhookRetrySweep } from '../src/server/workers/webhook-retry'

const POLL_IDLE_MS = Number(process.env.WORKER_IDLE_MS ?? 5_000)
const BATCH = Number(process.env.WORKER_BATCH ?? 50)
const RUN_CRON = process.env.WORKER_RUN_CRON === 'true'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL
const CRON_SECRET = process.env.API_KEY_PEPPER

let running = true
process.on('SIGINT', () => (running = false))
process.on('SIGTERM', () => (running = false))

// Track last-fired day for the daily jobs so a restart doesn't double-fire
// them on the same UTC day.
const lastFired: Record<string, string | null> = {
  'analytics.refresh': null,
  'audit.archive': null,
}

async function fireCronOnce(path: string, key: string): Promise<void> {
  if (!APP_URL || !CRON_SECRET) return
  const today = new Date().toISOString().slice(0, 10)
  if (lastFired[key] === today) return
  try {
    const res = await fetch(`${APP_URL}${path}`, {
      method: 'POST',
      headers: { 'x-vinsend-cron': CRON_SECRET },
    })
    lastFired[key] = today
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        level: res.ok ? 'info' : 'warn',
        msg: 'worker.cron_fired',
        path,
        http_status: res.status,
      }),
    )
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({ level: 'error', msg: 'worker.cron_error', path, err: (err as Error).message }),
    )
  }
}

function maybeFireDailyJobs() {
  if (!RUN_CRON) return
  const now = new Date()
  const utcHour = now.getUTCHours()
  const utcMinute = now.getUTCMinutes()
  // Fire between 03:00 and 03:10 UTC. Whichever tick lands in that window
  // wins; lastFired guards against double-fires.
  if (utcHour === 3 && utcMinute < 10) {
    void fireCronOnce('/api/internal/analytics/refresh', 'analytics.refresh')
    void fireCronOnce('/api/internal/audit/archive', 'audit.archive')
  }
}

async function main() {
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      level: 'info',
      msg: 'worker.start',
      batch: BATCH,
      idle_ms: POLL_IDLE_MS,
      cron: RUN_CRON,
    }),
  )
  while (running) {
    const started = Date.now()
    try {
      maybeFireDailyJobs()
      const result = await runWebhookRetrySweep(BATCH)
      const elapsed = Date.now() - started
      if (result.processed === 0) {
        await sleep(POLL_IDLE_MS)
      } else {
        // eslint-disable-next-line no-console
        console.log(
          JSON.stringify({
            level: 'info',
            msg: 'worker.batch',
            elapsed_ms: elapsed,
            ...result,
          }),
        )
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        JSON.stringify({ level: 'error', msg: 'worker.error', err: (err as Error).message }),
      )
      await sleep(POLL_IDLE_MS)
    }
  }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ level: 'info', msg: 'worker.stopped' }))
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
