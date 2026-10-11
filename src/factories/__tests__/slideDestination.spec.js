import { describe, it, expect } from 'vitest'
import { CHAT, MAIN, slideNamespace, resolveDestination } from '../slideDestination'

describe('slideNamespace', () => {
  it('returns the part of the type before ":"', () => {
    expect(slideNamespace({ type: 'file:md' })).toBe('file')
    expect(slideNamespace({ type: 'text' })).toBe('text')
  })

  it('treats a missing type as text', () => {
    expect(slideNamespace({})).toBe('text')
  })
})

describe('resolveDestination', () => {
  it.each([
    [{ type: 'text' }, MAIN],
    [{ type: 'file:md' }, CHAT],
    [{ type: 'file:js' }, CHAT],
    [{ type: 'file:json' }, MAIN],
    [{ type: 'image:png' }, MAIN],
    [{ type: 'mystery' }, MAIN],
    [{}, MAIN],
  ])('defaults %o to %s', (slide, expected) => {
    expect(resolveDestination(slide)).toBe(expected)
  })

  it('prefers an explicit destination over the type default', () => {
    expect(resolveDestination({ type: 'file:md', destination: MAIN })).toBe(MAIN)
    expect(resolveDestination({ type: 'file:json', destination: CHAT })).toBe(CHAT)
  })
})
