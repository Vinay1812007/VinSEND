import { describe, expect, it } from 'vitest'
import {
  extractTemplateVariables,
  renderTemplate,
  validateTemplateVariables,
} from '@/lib/templating/render'

describe('templating', () => {
  it('interpolates simple variables', () => {
    const out = renderTemplate('Hi {{first_name}}, order {{order_id}} shipped.', {
      first_name: 'Ada',
      order_id: '10231',
    })
    expect(out).toBe('Hi Ada, order 10231 shipped.')
  })

  it('renders missing vars as empty', () => {
    expect(renderTemplate('Hello {{name}}', {})).toBe('Hello ')
  })

  it('extracts distinct variables sorted', () => {
    expect(extractTemplateVariables('{{b}} {{a}} {{a}} {{c}}')).toEqual(['a', 'b', 'c'])
  })

  it('validates presence of required variables', () => {
    const v = validateTemplateVariables('Hi {{name}}, code {{code}}', { name: 'A' })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.missing).toEqual(['code'])
  })

  it('ignores stray braces', () => {
    expect(renderTemplate('Curly { not a var', {})).toBe('Curly { not a var')
  })
})
