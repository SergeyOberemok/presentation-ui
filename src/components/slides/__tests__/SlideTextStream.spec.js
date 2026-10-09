import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useTourStore } from '@/stores/tour'

vi.mock('@/composables/useSlideTextStream', () => ({
  useSlideTextStream: vi.fn(),
}))

import { useSlideTextStream } from '@/composables/useSlideTextStream'
import SlideTextStream from '../SlideTextStream.vue'

// Runs against the real tour store (rather than a mocked useTourCapture), so
// these assert what the guided tour actually sees: whether ArrowRight is
// currently routed to this slide.
describe('SlideTextStream', () => {
  let stream
  let tourStore

  beforeEach(() => {
    setActivePinia(createPinia())
    tourStore = useTourStore()

    stream = {
      text: ref(''),
      isStreaming: ref(false),
      hasFailed: ref(false),
      isDone: ref(false),
      started: ref(false),
      fetchNextChunk: vi.fn(),
    }
    useSlideTextStream.mockReturnValue(stream)
  })

  const capturedNext = () => tourStore.activeCapture?.onNext

  it('captures the tour and starts the stream when mounted as the current node', () => {
    mount(SlideTextStream, { props: { filename: 'a.txt', index: 0 } })

    expect(capturedNext()).toBe(stream.fetchNextChunk)
    expect(stream.fetchNextChunk).toHaveBeenCalledTimes(1)
  })

  it('does not capture or fetch when mounted ahead of the tour reaching it', () => {
    mount(SlideTextStream, { props: { filename: 'a.txt', index: 1 } })

    expect(tourStore.activeCapture).toBeNull()
    expect(stream.fetchNextChunk).not.toHaveBeenCalled()
  })

  it('captures and fetches once the tour reaches this node', async () => {
    mount(SlideTextStream, { props: { filename: 'a.txt', index: 1 } })

    tourStore.currentIndex = 1
    await nextTick()

    expect(capturedNext()).toBe(stream.fetchNextChunk)
    expect(stream.fetchNextChunk).toHaveBeenCalledTimes(1)
  })

  it('does not re-fetch if the stream had already started when it becomes current again', async () => {
    stream.started.value = true
    mount(SlideTextStream, { props: { filename: 'a.txt', index: 1 } })

    tourStore.currentIndex = 1
    await nextTick()

    expect(capturedNext()).toBe(stream.fetchNextChunk)
    expect(stream.fetchNextChunk).not.toHaveBeenCalled()
  })

  it('releases when the tour moves past this node without unmounting it', async () => {
    mount(SlideTextStream, { props: { filename: 'a.txt', index: 0 } })

    tourStore.currentIndex = 1
    await nextTick()

    expect(tourStore.activeCapture).toBeNull()
  })

  it('re-captures when the filename changes on a reused instance', async () => {
    // AsidePanel.vue remounts per node now, but an instance reused across
    // nodes (only `filename`/`index` change) must still capture for the new one
    // once the previous capture was handed back.
    const wrapper = mount(SlideTextStream, { props: { filename: 'a.txt', index: 0 } })
    tourStore.release()

    tourStore.currentIndex = 1
    await wrapper.setProps({ filename: 'b.txt', index: 1 })

    expect(capturedNext()).toBe(stream.fetchNextChunk)
  })

  it('releases once the stream reports done', async () => {
    mount(SlideTextStream, { props: { filename: 'a.txt', index: 0 } })

    stream.isDone.value = true
    await nextTick()

    expect(tourStore.activeCapture).toBeNull()
  })

  it('releases on unmount as a safety net, even if the stream never finished', () => {
    const wrapper = mount(SlideTextStream, { props: { filename: 'a.txt', index: 0 } })

    wrapper.unmount()

    expect(tourStore.activeCapture).toBeNull()
  })

  it('does not re-capture a fully streamed slide when the tour comes back to it', async () => {
    // Main-feed instances survive the tour moving away, so isDone stays true.
    mount(SlideTextStream, { props: { filename: 'a.txt', index: 1 } })
    stream.started.value = true
    stream.isDone.value = true
    await nextTick()

    tourStore.currentIndex = 1
    await nextTick()

    expect(tourStore.activeCapture).toBeNull()
  })

  it('with autoStart false, captures but waits for ArrowRight (onNext) to start streaming', () => {
    // Aside-panel slides open empty; the first ArrowRight fetches chunk 0.
    mount(SlideTextStream, { props: { filename: 'a.md', index: 0, autoStart: false } })

    expect(capturedNext()).toBe(stream.fetchNextChunk)
    expect(stream.fetchNextChunk).not.toHaveBeenCalled()
  })
})
