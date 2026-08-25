// Analytics service. Aggregates `email_events` into daily counts by type.
// Fits the initial scale by grouping in Postgres via a raw call; the schema
// is designed so a materialized view can replace this in Phase 6.

import { getServiceRoleClient } from '@/lib/db/service'

export interface DailyBucket {
  date: string // yyyy-mm-dd
  queued: number
  sent: number
  delivered: number
  bounced: number
  complained: number
  failed: number
}

export interface AnalyticsSummary {
  buckets: DailyBucket[]
  totals: {
    queued: number
    sent: number
    delivered: number
    bounced: number
    complained: number
    failed: number
  }
  rates: {
    delivery: number | null
    bounce: number | null
    complaint: number | null
    failure: number | null
  }
}

export async function projectSummary(
  projectId: string,
  days = 30,
): Promise<AnalyticsSummary> {
  const sb = getServiceRoleClient()
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)
  since.setUTCDate(since.getUTCDate() - (days - 1))

  const { data, error } = await sb
    .from('email_events')
    .select('type, occurred_at, emails!inner(project_id)')
    .eq('emails.project_id', projectId)
    .gte('occurred_at', since.toISOString())
  if (error) throw new Error(`projectSummary: ${error.message}`)

  const map: Record<string, DailyBucket> = {}
  for (let i = 0; i < days; i++) {
    const d = new Date(since)
    d.setUTCDate(d.getUTCDate() + i)
    const key = d.toISOString().slice(0, 10)
    map[key] = { date: key, queued: 0, sent: 0, delivered: 0, bounced: 0, complained: 0, failed: 0 }
  }

  for (const raw of (data ?? []) as { type: string; occurred_at: string }[]) {
    const date = raw.occurred_at.slice(0, 10)
    const bucket = map[date]
    if (!bucket) continue
    switch (raw.type) {
      case 'email.queued':
        bucket.queued++
        break
      case 'email.sent':
        bucket.sent++
        break
      case 'email.delivered':
        bucket.delivered++
        break
      case 'email.bounced':
        bucket.bounced++
        break
      case 'email.complained':
        bucket.complained++
        break
      case 'email.failed':
        bucket.failed++
        break
    }
  }

  const buckets = Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  const totals = buckets.reduce(
    (acc, b) => ({
      queued: acc.queued + b.queued,
      sent: acc.sent + b.sent,
      delivered: acc.delivered + b.delivered,
      bounced: acc.bounced + b.bounced,
      complained: acc.complained + b.complained,
      failed: acc.failed + b.failed,
    }),
    { queued: 0, sent: 0, delivered: 0, bounced: 0, complained: 0, failed: 0 },
  )

  const denom = totals.sent > 0 ? totals.sent : null
  const rates = {
    delivery: denom ? totals.delivered / denom : null,
    bounce: denom ? totals.bounced / denom : null,
    complaint: denom ? totals.complained / denom : null,
    failure: totals.queued + totals.failed > 0
      ? totals.failed / Math.max(1, totals.queued + totals.sent + totals.failed)
      : null,
  }

  return { buckets, totals, rates }
}
