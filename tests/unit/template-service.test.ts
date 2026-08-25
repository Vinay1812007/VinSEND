import { describe, expect, it } from 'vitest'
import { previewTemplate } from '@/server/services/templates'

describe('template service', () => {
  it('renders subject + html with variables', () => {
    const out = previewTemplate({
      subject: 'Hi {{first_name}}',
      html: '<p>Order {{order_id}} confirmed</p>',
      variables: { first_name: 'Ada', order_id: '10231' },
    })
    expect(out.subject).toBe('Hi Ada')
    expect(out.html).toContain('Order 10231 confirmed')
  })

  it('handles missing variables as empty', () => {
    const out = previewTemplate({
      subject: 'Hi {{name}}',
      html: '<p>{{copy}}</p>',
      variables: {},
    })
    expect(out.subject).toBe('Hi ')
    expect(out.html).toBe('<p></p>')
  })
})
