import { describe, expect, it } from 'vitest'
import { withLogContext, currentLogBindings } from '@/lib/logger/context'

describe('log context', () => {
  it('binds and unwinds', async () => {
    expect(currentLogBindings()).toEqual({})
    await withLogContext({ request_id: 'r1' }, async () => {
      expect(currentLogBindings().request_id).toBe('r1')
      await withLogContext({ project_id: 'p1' }, async () => {
        expect(currentLogBindings().request_id).toBe('r1')
        expect(currentLogBindings().project_id).toBe('p1')
      })
      expect(currentLogBindings().project_id).toBeUndefined()
    })
    expect(currentLogBindings()).toEqual({})
  })
})
