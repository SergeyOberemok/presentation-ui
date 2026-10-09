import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('@/composables/useSlideTextStream', () => ({
  useSlideTextStream: vi.fn(),
}))

vi.mock('@/composables/useTourCapture', () => ({
  useTourCapture: vi.fn(),
}))

import { useSlideTextStream } from '@/composables/useSlideTextStream'
import { useTourCapture } from '@/composables/useTourCapture'
import SlideTextStream from '../SlideTextStream.vue'

describe('SlideTextStream', () => {
  let stream
  let capture
  let release
  let currentIndex

  beforeEach(() => {
    stream = {
      text: ref(''),
      isStreaming: ref(false),
      hasFailed: ref(false),
      isDone: ref(false),
      started: ref(false),
      fetchNextChunk: vi.fn(),
    }
    useSlideTextStream.mockReturnValue(stream)

    capture = vi.fn()
    release = vi.fn()
    currentIndex = ref(0)
    useTourCapture.mockReturnValue({ capture, release, currentIndex })
  })

  it('captures the tour and starts the stream when mounted as the current node', () => {
    mount(SlideTextStream, { props: { filename: 'a.txt', index: 0 } })

    expect(capture).toHaveBeenCalledWith({ onNext: stream.fetchNextChunk })
    expect(stream.fetchNextChunk).toHaveBeenCalledTimes(1)
  })

  it('does not capture or fetch when mounted ahead of the tour reaching it', () => {
    currentIndex.value = 0

    mount(SlideTextStream, { props: { filename: 'a.txt', index: 1 } })

    expect(capture).not.toHaveBeenCalled()
    expect(stream.fetchNextChunk).not.toHaveBeenCalled()
  })

  it('captures and fetches once the tour reaches this node', async () => {
    currentIndex.value = 0
    const wrapper = mount(SlideTextStream, { props: { filename: 'a.txt', index: 1 } })

    currentIndex.value = 1
    await wrapper.vm.$nextTick()

    expect(capture).toHaveBeenCalledWith({ onNext: stream.fetchNextChunk })
    expect(stream.fetchNextChunk).toHaveBeenCalledTimes(1)
  })

  it('does not re-fetch if the stream had already started when it becomes current again', async () => {
    stream.started.value = true
    currentIndex.value = 0
    const wrapper = mount(SlideTextStream, { props: { filename: 'a.txt', index: 1 } })

    currentIndex.value = 1
    await wrapper.vm.$nextTick()

    expect(capture).toHaveBeenCalledWith({ onNext: stream.fetchNextChunk })
    expect(stream.fetchNextChunk).not.toHaveBeenCalled()
  })

  it('releases when the tour moves past this node without unmounting it', async () => {
    const wrapper = mount(SlideTextStream, { props: { filename: 'a.txt', index: 0 } })
    release.mockClear()

    currentIndex.value = 1
    await wrapper.vm.$nextTick()

    expect(release).toHaveBeenCalledTimes(1)
  })

  it('re-captures when the filename changes on a reused instance', async () => {
    // Mirrors AsidePanel.vue reusing the same mounted instance across
    // consecutive file nodes - only `filename`/`index` change, no remount.
    const wrapper = mount(SlideTextStream, { props: { filename: 'a.txt', index: 0 } })
    capture.mockClear()

    currentIndex.value = 1
    await wrapper.setProps({ filename: 'b.txt', index: 1 })

    expect(capture).toHaveBeenCalledWith({ onNext: stream.fetchNextChunk })
  })

  it('releases once the stream reports done', async () => {
    const wrapper = mount(SlideTextStream, { props: { filename: 'a.txt', index: 0 } })
    release.mockClear()

    stream.isDone.value = true
    await wrapper.vm.$nextTick()

    expect(release).toHaveBeenCalledTimes(1)
  })

  it('releases on unmount as a safety net, even if the stream never finished', () => {
    const wrapper = mount(SlideTextStream, { props: { filename: 'a.txt', index: 0 } })
    release.mockClear()

    wrapper.unmount()

    expect(release).toHaveBeenCalledTimes(1)
  })
})
