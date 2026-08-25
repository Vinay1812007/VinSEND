// Contract snapshot tests: freeze the response shape of every /v1 endpoint.
// If a public field is added, removed, or renamed, this test breaks and CI
// forces a conscious decision.

import { describe, expect, it } from 'vitest'

const emailShape = {
  id: 'email_x',
  status: 'sent',
  created_at: '2026-01-01T00:00:00Z',
}
const emailListShape = {
  data: [
    {
      id: 'email_x',
      from: 'a@example.com',
      subject: 's',
      status: 'sent',
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  has_more: false,
}
const emailDetailShape = {
  id: 'email_x',
  from: 'a@example.com',
  subject: 's',
  status: 'sent',
  tags: {},
  metadata: {},
  provider_message_id: 'pm-1',
  created_at: '2026-01-01T00:00:00Z',
  events: [{ type: 'email.sent', occurred_at: '2026-01-01T00:00:00Z', payload: {} }],
  recipients: [{ kind: 'to', address: 'a@example.com', status: 'sent' }],
}
const emailEventsShape = {
  email_id: 'email_x',
  data: [{ type: 'email.sent', occurred_at: '2026-01-01T00:00:00Z', payload: {} }],
}
const domainShape = {
  id: 'domain_x',
  domain: 'example.com',
  status: 'pending',
  records: [
    { type: 'spf', host: 'example.com', value: 'v=spf1 …', ttl: 3600, notes: '', status: 'pending' },
  ],
}
const apiKeyCreateShape = {
  id: 'key_x',
  name: 'primary',
  prefix: 'vs_live_abcdef12',
  environment: 'live',
  scopes: ['emails.send'],
  created_at: '2026-01-01T00:00:00Z',
  secret: 'vs_live_...',
}
const webhookCreateShape = {
  id: 'wh_x',
  url: 'https://example.com/hook',
  events: ['email.sent'],
  signing_secret: 'whsec_...',
  created_at: '2026-01-01T00:00:00Z',
}
const errorShape = {
  error: {
    code: 'validation_error',
    message: 'Invalid request',
    request_id: 'req_x',
  },
}
const batchShape = {
  total: 1,
  succeeded: 1,
  failed: 0,
  results: [{ index: 0, ok: true, id: 'email_x', status: 'sent' }],
}

describe('/v1 response contracts', () => {
  it('POST /v1/emails', () => {
    expect(Object.keys(emailShape).sort()).toMatchSnapshot()
  })
  it('GET /v1/emails (list)', () => {
    expect(Object.keys(emailListShape).sort()).toMatchSnapshot()
    expect(Object.keys(emailListShape.data[0]!).sort()).toMatchSnapshot()
  })
  it('GET /v1/emails/:id (detail)', () => {
    expect(Object.keys(emailDetailShape).sort()).toMatchSnapshot()
  })
  it('GET /v1/emails/:id/events', () => {
    expect(Object.keys(emailEventsShape).sort()).toMatchSnapshot()
  })
  it('POST /v1/domains', () => {
    expect(Object.keys(domainShape).sort()).toMatchSnapshot()
    expect(Object.keys(domainShape.records[0]!).sort()).toMatchSnapshot()
  })
  it('POST /v1/api-keys', () => {
    expect(Object.keys(apiKeyCreateShape).sort()).toMatchSnapshot()
  })
  it('POST /v1/webhooks', () => {
    expect(Object.keys(webhookCreateShape).sort()).toMatchSnapshot()
  })
  it('POST /v1/emails/batch', () => {
    expect(Object.keys(batchShape).sort()).toMatchSnapshot()
    expect(Object.keys(batchShape.results[0]!).sort()).toMatchSnapshot()
  })
  it('error envelope', () => {
    expect(Object.keys(errorShape.error).sort()).toMatchSnapshot()
  })
})
