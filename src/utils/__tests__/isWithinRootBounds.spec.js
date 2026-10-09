import { describe, it, expect } from 'vitest'
import { isWithinRootBounds } from '../isWithinRootBounds'

function box(top, bottom) {
  return { getBoundingClientRect: () => ({ top, bottom }) }
}

describe('isWithinRootBounds', () => {
  const root = box(0, 500)

  it('is true for a target inside the root', () => {
    expect(isWithinRootBounds(box(100, 101), root)).toBe(true)
  })

  it('is false for a target below the root', () => {
    expect(isWithinRootBounds(box(600, 601), root)).toBe(false)
  })

  it('is false for a target above the root', () => {
    expect(isWithinRootBounds(box(-100, -99), root)).toBe(false)
  })

  it('expands the root by the margin on both sides', () => {
    expect(isWithinRootBounds(box(600, 601), root, 200)).toBe(true)
    expect(isWithinRootBounds(box(-100, -99), root, 200)).toBe(true)
  })

  it('is false while either element is missing (not rendered yet)', () => {
    expect(isWithinRootBounds(null, root)).toBe(false)
    expect(isWithinRootBounds(box(0, 1), null)).toBe(false)
  })
})
