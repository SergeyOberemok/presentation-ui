import { describe, it, expect } from 'vitest'
import { CHAT, MAIN, nodeNamespace, resolveDestination } from '../nodeDestination'

describe('nodeNamespace', () => {
  it('returns the part of the type before ":"', () => {
    expect(nodeNamespace({ type: 'file:md' })).toBe('file')
    expect(nodeNamespace({ type: 'text' })).toBe('text')
  })

  it('treats a missing type as text', () => {
    expect(nodeNamespace({})).toBe('text')
  })
})

describe('resolveDestination', () => {
  it.each([
    [{ type: 'text' }, MAIN],
    [{ type: 'file:md' }, CHAT],
    [{ type: 'file:js' }, CHAT],
    [{ type: 'file:json' }, MAIN],
    [{ type: 'mystery' }, MAIN],
    [{}, MAIN],
  ])('defaults %o to %s', (node, expected) => {
    expect(resolveDestination(node)).toBe(expected)
  })

  it('prefers an explicit destination over the type default', () => {
    expect(resolveDestination({ type: 'file:md', destination: MAIN })).toBe(MAIN)
    expect(resolveDestination({ type: 'file:json', destination: CHAT })).toBe(CHAT)
  })
})
