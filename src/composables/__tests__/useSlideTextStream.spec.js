import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'

vi.mock('@vueuse/core', () => ({
  useEventSource: vi.fn(),
}))

import { useEventSource } from '@vueuse/core'
import { useSlideTextStream } from '../useSlideTextStream'

function fakeEventSource() {
  return {
    data: ref(null),
    event: ref(null),
    lastEventId: ref(null),
    status: ref('CONNECTING'),
    error: ref(null),
    close: vi.fn(),
    open: vi.fn(),
  }
}

function doneData({ chunkIndex = 0, totalChunks = 1, hasMore = false } = {}) {
  return JSON.stringify({ chunk_index: chunkIndex, total_chunks: totalChunks, has_more: hasMore })
}

describe('useSlideTextStream', () => {
  let es

  beforeEach(() => {
    es = fakeEventSource()
    useEventSource.mockReset()
    useEventSource.mockReturnValue(es)
  })

  it('builds the initial EventSource URL from the filename, without a chunk param', () => {
    useSlideTextStream('a b.md', { delayMs: 0 })

    const [urlArg] = useEventSource.mock.calls[0]
    expect(urlArg.value).toBe('/slides/a%20b.md')
  })

  it('paces server-side delivery with a default per-line delay', () => {
    useSlideTextStream('a.md')

    const [urlArg] = useEventSource.mock.calls[0]
    expect(urlArg.value).toBe('/slides/a.md?delay_ms=10')
  })

  it('allows overriding the per-line delay', () => {
    useSlideTextStream('a.md', { delayMs: 200 })

    const [urlArg] = useEventSource.mock.calls[0]
    expect(urlArg.value).toBe('/slides/a.md?delay_ms=200')
  })

  it('does not connect until fetchNextChunk is called', () => {
    useSlideTextStream('a.md')

    expect(es.open).not.toHaveBeenCalled()
  })

  it('opens the connection on the first fetchNextChunk call', () => {
    const { fetchNextChunk, isStreaming } = useSlideTextStream('a.md')

    fetchNextChunk()

    expect(es.open).toHaveBeenCalledTimes(1)
    expect(isStreaming.value).toBe(true)
  })

  it('accumulates lines in order as data/lastEventId change', async () => {
    const { text, lines, fetchNextChunk } = useSlideTextStream('a.md')
    fetchNextChunk()

    es.lastEventId.value = '0'
    es.data.value = 'first'
    await nextTick()

    es.lastEventId.value = '1'
    es.data.value = 'second'
    await nextTick()

    expect(lines.value).toEqual(['first', 'second'])
    expect(text.value).toBe('first\nsecond')
  })

  it('accumulates consecutive lines with identical content', async () => {
    const { text, lines, fetchNextChunk } = useSlideTextStream('a.md')
    fetchNextChunk()

    es.lastEventId.value = '0'
    es.data.value = '---'
    await nextTick()

    es.lastEventId.value = '1'
    es.data.value = '---'
    await nextTick()

    expect(lines.value).toEqual(['---', '---'])
    expect(text.value).toBe('---\n---')
  })

  it('is not streaming before the first fetch, even though useEventSource reports CONNECTING', () => {
    const { isStreaming, started } = useSlideTextStream('a.md')

    expect(es.status.value).toBe('CONNECTING')
    expect(isStreaming.value).toBe(false)
    expect(started.value).toBe(false)
  })

  it('stops streaming once the connection fails', async () => {
    const { fetchNextChunk, isStreaming } = useSlideTextStream('a.md')
    fetchNextChunk()
    expect(isStreaming.value).toBe(true)

    es.error.value = new Event('error')
    await nextTick()

    expect(isStreaming.value).toBe(false)
  })

  it('ignores a repeated fetchNextChunk while a chunk is still streaming', () => {
    const { fetchNextChunk } = useSlideTextStream('a.md')
    fetchNextChunk()

    expect(fetchNextChunk()).toBe(true) // still "handled", so the tour doesn't advance
    expect(es.open).toHaveBeenCalledTimes(1)
  })

  it('returns to idle (and can start again) after the filename changes mid-stream', async () => {
    const filename = ref('a.md')
    const { fetchNextChunk, phase } = useSlideTextStream(filename)
    fetchNextChunk()

    filename.value = 'b.md'
    await nextTick()

    expect(phase.value).toBe('idle')
    expect(es.close).toHaveBeenCalled()
  })

  it('resets accumulated lines when the filename changes', async () => {
    const filename = ref('a.md')
    const { text, lines, fetchNextChunk } = useSlideTextStream(filename)
    fetchNextChunk()

    es.lastEventId.value = '0'
    es.data.value = 'first'
    await nextTick()
    expect(lines.value).toEqual(['first'])

    filename.value = 'b.md'
    await nextTick()

    expect(lines.value).toEqual([])
    expect(text.value).toBe('')
  })

  describe('done event', () => {
    it('ends only the current chunk, keeping lines gathered so far, when has_more is true', async () => {
      const { isDone, hasMore, totalChunks, isStreaming, lines, fetchNextChunk } =
        useSlideTextStream('a.md')
      fetchNextChunk()

      es.lastEventId.value = '0'
      es.data.value = 'first'
      await nextTick()

      es.event.value = 'done'
      es.data.value = doneData({ chunkIndex: 0, totalChunks: 3, hasMore: true })
      await nextTick()
      es.status.value = 'CLOSED' // real useEventSource.close() does this; the mock doesn't

      expect(lines.value).toEqual(['first'])
      expect(isDone.value).toBe(false)
      expect(hasMore.value).toBe(true)
      expect(totalChunks.value).toBe(3)
      expect(isStreaming.value).toBe(false)
      expect(es.close).toHaveBeenCalled()
    })

    it('marks the stream fully done once has_more is false', async () => {
      const { isDone, fetchNextChunk } = useSlideTextStream('a.md')
      fetchNextChunk()

      es.event.value = 'done'
      es.data.value = doneData({ hasMore: false })
      await nextTick()

      expect(isDone.value).toBe(true)
    })

    it('advances to the next chunk on a subsequent fetchNextChunk call, updating the url', async () => {
      const { fetchNextChunk } = useSlideTextStream('a.md', { delayMs: 0 })
      fetchNextChunk()

      es.event.value = 'done'
      es.data.value = doneData({ chunkIndex: 0, totalChunks: 3, hasMore: true })
      await nextTick()
      es.status.value = 'CLOSED' // real useEventSource.close() does this; the mock doesn't

      es.open.mockClear()
      fetchNextChunk()
      await nextTick()

      const [urlArg] = useEventSource.mock.calls[0]
      expect(urlArg.value).toBe('/slides/a.md?chunk=1')
      expect(es.open).toHaveBeenCalledTimes(1) // explicit, since autoConnect is off
    })

    it('does nothing when fetchNextChunk is called again after isDone', async () => {
      const { fetchNextChunk } = useSlideTextStream('a.md', { delayMs: 0 })
      fetchNextChunk()

      es.event.value = 'done'
      es.data.value = doneData({ hasMore: false })
      await nextTick()

      es.open.mockClear()
      expect(fetchNextChunk()).toBe(false) // lets a tour capture hand control back

      const [urlArg] = useEventSource.mock.calls[0]
      expect(urlArg.value).toBe('/slides/a.md')
      expect(es.open).not.toHaveBeenCalled()
    })
  })

  describe('hasFailed', () => {
    it('is false once a done event is received, even though the backend then closes the connection', async () => {
      const { hasFailed, fetchNextChunk } = useSlideTextStream('a.md')
      fetchNextChunk()

      es.lastEventId.value = '0'
      es.data.value = 'first'
      await nextTick()

      es.event.value = 'done'
      es.data.value = doneData({ hasMore: true })
      await nextTick()

      // Backend closing the TCP connection after "done" still fires onerror.
      es.error.value = new Event('error')
      await nextTick()

      expect(hasFailed.value).toBe(false)
    })

    it('is true when an error occurs without ever receiving a done event', async () => {
      const { hasFailed, fetchNextChunk } = useSlideTextStream('a.md')
      fetchNextChunk()

      es.lastEventId.value = '0'
      es.data.value = 'first'
      await nextTick()

      es.error.value = new Event('error')
      await nextTick()

      expect(hasFailed.value).toBe(true)
    })

    it('retries the same chunk via fetchNextChunk after a failed attempt', async () => {
      const { fetchNextChunk } = useSlideTextStream('a.md', { delayMs: 0 })
      fetchNextChunk()

      es.error.value = new Event('error')
      es.status.value = 'CLOSED'
      await nextTick()

      es.open.mockClear()
      fetchNextChunk()

      expect(es.open).toHaveBeenCalledTimes(1)
      const [urlArg] = useEventSource.mock.calls[0]
      expect(urlArg.value).toBe('/slides/a.md')
    })
  })

  it('closes the underlying EventSource once an error occurs, to stop silent background reconnects', async () => {
    const { fetchNextChunk } = useSlideTextStream('a.md')
    fetchNextChunk()

    es.error.value = new Event('error')
    await nextTick()

    expect(es.close).toHaveBeenCalled()
  })
})
