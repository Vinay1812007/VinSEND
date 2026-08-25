// k6 load test: hammer the send API and measure end-to-end latency.
//
// Requires k6 (https://k6.io). Run with:
//   VINSEND_URL=https://api.vinsend.example \
//   VINSEND_API_KEY=vs_live_... \
//   k6 run --vus 25 --duration 60s loadtest/send-flow.js
//
// The test assumes the sender domain is verified and the recipient can be
// silently discarded (Mailtrap sandbox or a discard alias).

import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
  },
}

const URL = `${__ENV.VINSEND_URL || 'http://localhost:3000'}/v1/emails`
const KEY = __ENV.VINSEND_API_KEY
const FROM = __ENV.VINSEND_FROM || 'load@example.com'
const TO = __ENV.VINSEND_TO || 'sink@example.com'

if (!KEY) throw new Error('VINSEND_API_KEY is required')

export default function () {
  const idempotencyKey = `${__VU}-${__ITER}-${Date.now()}`
  const payload = JSON.stringify({
    from: FROM,
    to: [TO],
    subject: `k6 test ${idempotencyKey}`,
    text: 'This is a load-test message.',
  })
  const res = http.post(URL, payload, {
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
  })
  check(res, {
    'status is 202 or 200': (r) => r.status === 202 || r.status === 200,
    'has id': (r) => (r.json('id') || '').toString().startsWith('email_'),
  })
  sleep(0.1)
}
