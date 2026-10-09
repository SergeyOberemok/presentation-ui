import { describe, it, expect } from 'vitest'
import { CHUNK_DONE, DONE, FAILED, IDLE, STREAMING, transition } from '../slideStreamPhase'

const fetch = { type: 'fetch' }
const error = { type: 'error' }
const reset = { type: 'reset' }
const chunkEnd = (hasMore) => ({ type: 'chunkEnd', hasMore })

describe('slide stream phase transitions', () => {
  it.each([
    [IDLE, fetch, STREAMING],
    [STREAMING, chunkEnd(true), CHUNK_DONE],
    [STREAMING, chunkEnd(false), DONE],
    [STREAMING, error, FAILED],
    [CHUNK_DONE, fetch, STREAMING],
    [FAILED, fetch, STREAMING],
  ])('%s --%o--> %s', (from, event, to) => {
    expect(transition(from, event)).toBe(to)
  })

  it.each([
    // The backend closes the connection after "done", which fires onerror.
    [CHUNK_DONE, error],
    [DONE, error],
    [IDLE, error],
    // Nothing left to fetch.
    [DONE, fetch],
    // Already in flight.
    [STREAMING, fetch],
    // A stray "done" with no request open.
    [IDLE, chunkEnd(false)],
    [DONE, chunkEnd(true)],
  ])('ignores %s --%o', (from, event) => {
    expect(transition(from, event)).toBe(from)
  })

  it.each([IDLE, STREAMING, CHUNK_DONE, FAILED, DONE])('resets %s to idle', (from) => {
    expect(transition(from, reset)).toBe(IDLE)
  })
})
