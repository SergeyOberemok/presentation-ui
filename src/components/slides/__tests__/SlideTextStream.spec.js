import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
  const capturedPrev = () => tourStore.activeCapture?.onPrev

  it('captures the tour and starts the stream when mounted as the current slide', () => {
    mount(SlideTextStream, { props: { filename: 'a.txt', index: 0 } })

    expect(capturedNext()).toBeTypeOf('function')
    expect(stream.fetchNextChunk).toHaveBeenCalledTimes(1)
  })

  it('does not capture or fetch when mounted ahead of the tour reaching it', () => {
    mount(SlideTextStream, { props: { filename: 'a.txt', index: 1 } })

    expect(tourStore.activeCapture).toBeNull()
    expect(stream.fetchNextChunk).not.toHaveBeenCalled()
  })

  it('captures and fetches once the tour reaches this slide', async () => {
    mount(SlideTextStream, { props: { filename: 'a.txt', index: 1 } })

    tourStore.currentIndex = 1
    await nextTick()

    expect(capturedNext()).toBeTypeOf('function')
    expect(stream.fetchNextChunk).toHaveBeenCalledTimes(1)
  })

  it('does not re-fetch if the stream had already started when it becomes current again', async () => {
    stream.started.value = true
    mount(SlideTextStream, { props: { filename: 'a.txt', index: 1 } })

    tourStore.currentIndex = 1
    await nextTick()

    expect(capturedNext()).toBeTypeOf('function')
    expect(stream.fetchNextChunk).not.toHaveBeenCalled()
  })

  it('releases when the tour moves past this slide without unmounting it', async () => {
    mount(SlideTextStream, { props: { filename: 'a.txt', index: 0 } })

    tourStore.currentIndex = 1
    await nextTick()

    expect(tourStore.activeCapture).toBeNull()
  })

  it('re-captures when the filename changes on a reused instance', async () => {
    // AsidePanel.vue remounts per slide now, but an instance reused across
    // slides (only `filename`/`index` change) must still capture for the new one
    // once the previous capture was handed back.
    const wrapper = mount(SlideTextStream, { props: { filename: 'a.txt', index: 0 } })
    tourStore.release()

    tourStore.currentIndex = 1
    await wrapper.setProps({ filename: 'b.txt', index: 1 })

    expect(capturedNext()).toBeTypeOf('function')
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

    expect(capturedNext()).toBeTypeOf('function')
    expect(stream.fetchNextChunk).not.toHaveBeenCalled()
  })

  describe('tour stops', () => {
    const TWO_STOPS = 'intro\n\n==first== point\n\nplain\n\n- ==second== point'

    async function mountStreamed(text, { isDone = false } = {}) {
      stream.started.value = true
      stream.text.value = text
      stream.isDone.value = isDone
      const wrapper = mount(SlideTextStream, { props: { filename: 'a.md', index: 0 } })
      await nextTick()
      return wrapper
    }

    const activeStops = (wrapper) =>
      wrapper.findAll('.tour-step-active').map((el) => el.attributes('data-tour-step'))

    it('walks the stops before fetching the next chunk', async () => {
      const wrapper = await mountStreamed(TWO_STOPS)

      expect(await capturedNext()()).toBe(true)
      await nextTick()
      expect(activeStops(wrapper)).toEqual(['0'])

      expect(await capturedNext()()).toBe(true)
      await nextTick()
      expect(activeStops(wrapper)).toEqual(['1'])
      expect(stream.fetchNextChunk).not.toHaveBeenCalled()

      stream.fetchNextChunk.mockReturnValue(true)
      expect(await capturedNext()()).toBe(true)
      await nextTick()
      expect(stream.fetchNextChunk).toHaveBeenCalledTimes(1)
      expect(activeStops(wrapper)).toEqual([])
    })

    it('does not walk stops while a chunk is still streaming', async () => {
      await mountStreamed(TWO_STOPS)
      stream.isStreaming.value = true

      expect(await capturedNext()()).toBe(true)
      expect(stream.fetchNextChunk).not.toHaveBeenCalled()
    })

    it('keeps the capture on a fully streamed file until its last stop is visited', async () => {
      await mountStreamed(TWO_STOPS, { isDone: true })
      expect(capturedNext()).toBeTypeOf('function')

      await capturedNext()()
      await nextTick()
      expect(capturedNext()).toBeTypeOf('function')

      await capturedNext()()
      await nextTick()
      expect(tourStore.activeCapture).toBeNull()
    })

    it('hands ArrowRight back to the tour after the last stop of a done file', async () => {
      await mountStreamed('==only==', { isDone: true })
      const onNext = capturedNext()
      stream.fetchNextChunk.mockReturnValue(false)

      expect(await onNext()).toBe(true)
      expect(await onNext()).toBe(false)
    })

    it('walks ArrowLeft back through the stops, then hands back to the tour', async () => {
      const wrapper = await mountStreamed(TWO_STOPS)
      await capturedNext()()
      await capturedNext()()

      expect(await capturedPrev()()).toBe(true)
      await nextTick()
      expect(activeStops(wrapper)).toEqual(['0'])

      expect(await capturedPrev()()).toBe(false)
      await nextTick()
      expect(activeStops(wrapper)).toEqual([])
    })

    it('restarts the stops for a different file', async () => {
      const wrapper = await mountStreamed(TWO_STOPS)
      await capturedNext()()
      await capturedNext()()

      await wrapper.setProps({ filename: 'b.md' })
      await capturedNext()()
      await nextTick()

      expect(activeStops(wrapper)).toEqual(['0'])
    })
  })

  describe('following streamed text', () => {
    let scrollIntoView

    beforeEach(() => {
      scrollIntoView = vi.fn()
      Element.prototype.scrollIntoView = scrollIntoView
      vi.stubGlobal('requestAnimationFrame', (cb) => {
        cb()
        return 1
      })
    })

    afterEach(() => {
      delete Element.prototype.scrollIntoView
      vi.unstubAllGlobals()
    })

    async function streamLine(line) {
      stream.text.value += line
      await nextTick()
    }

    it('keeps the newest line in view while the current slide streams', async () => {
      const wrapper = mount(SlideTextStream, {
        props: { filename: 'a.md', index: 0, followStream: true },
      })
      stream.isStreaming.value = true

      await streamLine('first line')

      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' })
      expect(scrollIntoView.mock.contexts.at(-1)).toBe(
        wrapper.find('div[aria-hidden="true"]').element,
      )
    })

    it('does not follow the stream without followStream (main feed stays centered)', async () => {
      mount(SlideTextStream, { props: { filename: 'a.md', index: 0 } })
      stream.isStreaming.value = true

      await streamLine('first line')

      expect(scrollIntoView).not.toHaveBeenCalled()
    })

    it('does not scroll for a slide the tour has not reached', async () => {
      mount(SlideTextStream, { props: { filename: 'a.md', index: 1, followStream: true } })
      stream.isStreaming.value = true

      await streamLine('first line')

      expect(scrollIntoView).not.toHaveBeenCalled()
    })

    it('does not scroll when text changes without streaming', async () => {
      mount(SlideTextStream, { props: { filename: 'a.md', index: 0, followStream: true } })

      await streamLine('first line')

      expect(scrollIntoView).not.toHaveBeenCalled()
    })
  })

  it('shows a connection-lost message when the stream failed', async () => {
    const wrapper = mount(SlideTextStream, { props: { filename: 'a.txt', index: 0 } })
    expect(wrapper.text()).not.toContain('Connection lost while streaming.')

    stream.hasFailed.value = true
    await nextTick()

    expect(wrapper.text()).toContain('Connection lost while streaming.')
  })

  it('streams the filename it was given, tracking later changes', async () => {
    const wrapper = mount(SlideTextStream, { props: { filename: 'a.txt', index: 0 } })
    const getFilename = useSlideTextStream.mock.calls.at(-1)[0]
    expect(getFilename()).toBe('a.txt')

    await wrapper.setProps({ filename: 'b.txt' })

    expect(getFilename()).toBe('b.txt')
  })

  it('cancels a pending follow-scroll frame on unmount', async () => {
    const cancel = vi.fn()
    vi.stubGlobal('requestAnimationFrame', () => 7) // never fires
    vi.stubGlobal('cancelAnimationFrame', cancel)
    const wrapper = mount(SlideTextStream, {
      props: { filename: 'a.md', index: 0, followStream: true },
    })
    stream.isStreaming.value = true
    stream.text.value = 'line'
    await nextTick()

    wrapper.unmount()

    expect(cancel).toHaveBeenCalledWith(7)
    vi.unstubAllGlobals()
  })
})
