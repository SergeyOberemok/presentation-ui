import { describe, it, expect } from 'vitest'
import { hasPendingStep, initialSteps, nextStep, prevStep } from '../slideSteps'

const at = (cursor, highlighted = true) => ({ cursor, highlighted })

describe('slide steps', () => {
  it('starts before the first stop, with nothing highlighted', () => {
    expect(initialSteps()).toEqual(at(-1, false))
  })

  it.each([
    [at(-1, false), 2, at(0), true],
    [at(0), 2, at(1), true],
    // Out of stops: the caller fetches the next chunk, so the highlight clears.
    [at(1), 2, at(1, false), false],
    [at(-1, false), 0, at(-1, false), false],
    // A new chunk added stops after the cursor, so the walk continues from there.
    [at(1, false), 4, at(2), true],
  ])('next from %o with %i stops -> %o (moved: %s)', (from, count, to, moved) => {
    expect(nextStep(from, count)).toEqual({ state: to, moved })
  })

  it.each([
    [at(2), at(1), true],
    // After a chunk fetch cleared the highlight, re-show the last stop first.
    [at(1, false), at(1), true],
    // Nothing before the first stop: hand back to the tour.
    [at(0), at(0, false), false],
    [at(-1, false), at(-1, false), false],
  ])('prev from %o -> %o (moved: %s)', (from, to, moved) => {
    expect(prevStep(from)).toEqual({ state: to, moved })
  })

  it('reports pending stops after the cursor', () => {
    expect(hasPendingStep(at(-1, false), 1)).toBe(true)
    expect(hasPendingStep(at(0), 1)).toBe(false)
  })
})
