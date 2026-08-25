import { describe, expect, it } from 'vitest'

// Contract test for the health-endpoint response shape. We invoke the route
// handler directly rather than going through the network to keep the test
// hermetic.

describe('/api/health', () => {
  it('reports service + timestamp', async () => {
    const { GET } = await import('@/app/api/health/route')
    const res = await GET()
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.service).toBe('vinsend')
    expect(typeof body.timestamp).toBe('string')
    expect(typeof body.uptime_seconds).toBe('number')
  })
})
