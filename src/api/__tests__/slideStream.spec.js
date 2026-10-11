import { describe, it, expect } from 'vitest'
import { buildSlideStreamUrl } from '../slideStream'

describe('buildSlideStreamUrl', () => {
  it('encodes the filename with no query string when delayMs is omitted', () => {
    expect(buildSlideStreamUrl('a b.md')).toBe('/slide-resources/stream/a%20b.md')
  })

  it('omits the query string when delayMs is 0', () => {
    expect(buildSlideStreamUrl('a.md', { delayMs: 0 })).toBe('/slide-resources/stream/a.md')
  })

  it('appends delay_ms when delayMs is set', () => {
    expect(buildSlideStreamUrl('a.md', { delayMs: 25 })).toBe(
      '/slide-resources/stream/a.md?delay_ms=25',
    )
  })

  it('omits the query string when chunk is 0', () => {
    expect(buildSlideStreamUrl('a.md', { chunk: 0 })).toBe('/slide-resources/stream/a.md')
  })

  it('appends chunk when chunk is set', () => {
    expect(buildSlideStreamUrl('a.md', { chunk: 2 })).toBe('/slide-resources/stream/a.md?chunk=2')
  })

  it('combines delay_ms and chunk when both are set', () => {
    expect(buildSlideStreamUrl('a.md', { delayMs: 25, chunk: 2 })).toBe(
      '/slide-resources/stream/a.md?delay_ms=25&chunk=2',
    )
  })
})
