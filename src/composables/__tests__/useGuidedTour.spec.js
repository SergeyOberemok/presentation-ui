import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'

vi.mock('@vueuse/core', () => ({
  useScroll: vi.fn(),
  onKeyStroke: vi.fn(),
}))

vi.mock('@/api/slides', () => ({
  fetchSlidesPage: vi.fn(),
}))

import { useScroll, onKeyStroke } from '@vueuse/core'
import { fetchSlidesPage } from '@/api/slides'
import { useSlidesStore } from '@/stores/slides'
import { useTourStore } from '@/stores/tour'
import { useGuidedTour } from '../useGuidedTour'

function fakeEl(top) {
  return { getBoundingClientRect: () => ({ top }) }
}

function fakeContainer() {
  return ref({ scrollTop: 0, scrollHeight: 0, getBoundingClientRect: () => ({ top: 0 }) })
}

// Runs against the real slides store with only the HTTP call mocked, so the
// tour's interaction with paging (joining in-flight loads, clamping at the
// edges, errors) is what's actually under test. One slide per page keeps the
// arithmetic obvious: index i lives on page i + 1.
function apiPage(index, slide = {}, totalPages = 5) {
  return {
    page: index + 1,
    page_size: 1,
    total_items: totalPages,
    total_pages: totalPages,
    items: [{ type: 'text', value: `n${index}`, ...slide }],
  }
}

describe('useGuidedTour', () => {
  let scrollY
  let slidesStore
  let tourStore

  // Seeds loaded data for indices [from..to], as if those pages had been
  // fetched, and registers a DOM element for each (what useTourMediator does
  // for rendered "main" slides).
  function seedLoaded(from, to, { totalPages = 5, overrides = {}, tops = {} } = {}) {
    const loaded = []
    for (let i = from; i <= to; i++) {
      loaded.push({ type: 'text', value: `n${i}`, ...overrides[i], index: i })
      tourStore.registerSlide(i, fakeEl(tops[i] ?? i * 50))
    }
    slidesStore.$patch({ slides: loaded, minPage: from + 1, maxPage: to + 1, totalPages })
  }

  function keyHandler() {
    return onKeyStroke.mock.calls[0][1]
  }

  function press(key) {
    return keyHandler()({ key, target: { tagName: 'DIV' }, preventDefault: vi.fn() })
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    slidesStore = useSlidesStore()
    tourStore = useTourStore()

    scrollY = ref(0)
    useScroll.mockReturnValue({ y: scrollY })
    onKeyStroke.mockReset()
    fetchSlidesPage.mockReset()
  })

  it('registers the arrow keys and the presenter PageUp/PageDown keys', () => {
    useGuidedTour(fakeContainer())

    expect(onKeyStroke).toHaveBeenCalledWith(
      ['ArrowLeft', 'PageUp', 'ArrowRight', 'PageDown'],
      expect.any(Function),
    )
  })

  it('treats PageDown / PageUp (presenter clicker) like ArrowRight / ArrowLeft', async () => {
    seedLoaded(0, 1)
    useGuidedTour(fakeContainer())

    await press('PageDown')
    await vi.waitFor(() => expect(tourStore.currentIndex).toBe(1))
    await press('PageUp')
    await vi.waitFor(() => expect(tourStore.currentIndex).toBe(0))
  })

  it('delegates PageDown to an active capture like ArrowRight', async () => {
    seedLoaded(0, 1)
    const onNext = vi.fn()
    tourStore.capture({ onNext })
    useGuidedTour(fakeContainer())

    await press('PageDown')

    expect(onNext).toHaveBeenCalledTimes(1)
    expect(tourStore.currentIndex).toBe(0)
  })

  it('scrolls straight to an already-loaded slide without loading more pages', async () => {
    seedLoaded(0, 1)

    const { next, currentIndex } = useGuidedTour(fakeContainer())
    await next()

    expect(fetchSlidesPage).not.toHaveBeenCalled()
    expect(currentIndex.value).toBe(1)
    expect(scrollY.value).toBe(50)
  })

  it('loads the next page when the target slide is not loaded yet', async () => {
    seedLoaded(0, 0)
    fetchSlidesPage.mockResolvedValueOnce(apiPage(1))

    const { next, currentIndex } = useGuidedTour(fakeContainer())
    await next()

    expect(fetchSlidesPage).toHaveBeenCalledExactlyOnceWith(2)
    expect(currentIndex.value).toBe(1)
  })

  it('clamps to the last slide once there is nothing more to load forward', async () => {
    seedLoaded(0, 0, { totalPages: 1 })

    const { next, currentIndex } = useGuidedTour(fakeContainer())
    await next()

    expect(fetchSlidesPage).not.toHaveBeenCalled()
    expect(currentIndex.value).toBe(0)
  })

  it('loads the previous page when moving to an unloaded lower index', async () => {
    tourStore.currentIndex = 2
    seedLoaded(2, 2)
    fetchSlidesPage.mockResolvedValueOnce(apiPage(1))

    const { prev, currentIndex } = useGuidedTour(fakeContainer())
    await prev()

    expect(fetchSlidesPage).toHaveBeenCalledExactlyOnceWith(2)
    expect(currentIndex.value).toBe(1)
  })

  it('never drops below index 0', async () => {
    seedLoaded(0, 1)

    const { prev, currentIndex } = useGuidedTour(fakeContainer())
    await prev()

    expect(fetchSlidesPage).not.toHaveBeenCalled()
    expect(currentIndex.value).toBe(0)
  })

  it('stays put when loading forward fails', async () => {
    seedLoaded(0, 0)
    fetchSlidesPage.mockRejectedValueOnce(new Error('boom'))

    const { next, currentIndex } = useGuidedTour(fakeContainer())
    await next()

    expect(fetchSlidesPage).toHaveBeenCalledTimes(1)
    expect(currentIndex.value).toBe(0)
  })

  it('stays put when loading backward fails', async () => {
    tourStore.currentIndex = 2
    seedLoaded(2, 2)
    fetchSlidesPage.mockRejectedValueOnce(new Error('boom'))

    const { prev, currentIndex } = useGuidedTour(fakeContainer())
    await prev()

    expect(fetchSlidesPage).toHaveBeenCalledTimes(1)
    expect(currentIndex.value).toBe(2)
  })

  it('joins a page load the feed already started instead of fetching it twice', async () => {
    // The race behind the earlier tab freeze: the feed's bottom sentinel and
    // the tour both want the next page at the same time.
    seedLoaded(0, 0)
    let resolveFetch
    fetchSlidesPage.mockReturnValueOnce(new Promise((r) => (resolveFetch = r)))

    const feedLoad = slidesStore.loadNext()
    const { next, currentIndex } = useGuidedTour(fakeContainer())
    const navigation = next()
    resolveFetch(apiPage(1))
    await Promise.all([feedLoad, navigation])

    expect(fetchSlidesPage).toHaveBeenCalledTimes(1)
    expect(currentIndex.value).toBe(1)
  })

  it('ignores arrow keys typed into form fields', () => {
    useGuidedTour(fakeContainer())

    const preventDefault = vi.fn()
    keyHandler()({ key: 'ArrowRight', target: { tagName: 'INPUT' }, preventDefault })

    expect(preventDefault).not.toHaveBeenCalled()
  })

  it('handles arrow keys outside of form fields', async () => {
    seedLoaded(0, 1)
    useGuidedTour(fakeContainer())

    const preventDefault = vi.fn()
    await keyHandler()({ key: 'ArrowRight', target: { tagName: 'DIV' }, preventDefault })

    expect(preventDefault).toHaveBeenCalled()
    await vi.waitFor(() => expect(tourStore.currentIndex).toBe(1))
  })

  it('skips scrolling for a non-main destination slide, but still advances currentIndex', async () => {
    seedLoaded(0, 1, { overrides: { 1: { type: 'file:md', destination: 'chat', value: 'f.md' } } })

    const { next, currentIndex } = useGuidedTour(fakeContainer())
    await next()

    expect(currentIndex.value).toBe(1)
    expect(scrollY.value).toBe(0)
  })

  it('skips scrolling for a file slide with no explicit destination (defaults to chat)', async () => {
    // Matches the real backend shape today: file slides arrive as just
    // { type, value }, with no destination field at all.
    seedLoaded(0, 1, { overrides: { 1: { type: 'file:md', value: 'f.md' } } })

    const { next, currentIndex } = useGuidedTour(fakeContainer())
    await next()

    expect(currentIndex.value).toBe(1)
    expect(scrollY.value).toBe(0)
  })

  it('delegates ArrowRight to an active capture instead of advancing', async () => {
    seedLoaded(0, 1)
    const onNext = vi.fn()
    tourStore.capture({ onNext })
    useGuidedTour(fakeContainer())

    await press('ArrowRight')

    expect(onNext).toHaveBeenCalledTimes(1)
    expect(tourStore.currentIndex).toBe(0)
  })

  it('advances in the same keypress when the capture reports nothing left (onNext false)', async () => {
    seedLoaded(0, 1)
    tourStore.capture({ onNext: () => false })
    useGuidedTour(fakeContainer())

    await press('ArrowRight')
    await vi.waitFor(() => expect(tourStore.currentIndex).toBe(1))
    expect(tourStore.activeCapture).toBeNull()
  })

  it('releases the capture and runs the normal prev() when it has no previous step', async () => {
    tourStore.currentIndex = 1
    seedLoaded(0, 1)
    tourStore.capture({ onNext: vi.fn() }) // no onPrev
    useGuidedTour(fakeContainer())

    await press('ArrowLeft')
    await vi.waitFor(() => expect(tourStore.currentIndex).toBe(0))
    expect(tourStore.activeCapture).toBeNull()
  })

  it('lets an active capture handle ArrowLeft itself without releasing or calling prev()', async () => {
    tourStore.currentIndex = 1
    seedLoaded(0, 1)
    const onPrev = vi.fn().mockReturnValue(true)
    tourStore.capture({ onNext: vi.fn(), onPrev })
    useGuidedTour(fakeContainer())

    await press('ArrowLeft')

    expect(onPrev).toHaveBeenCalledTimes(1)
    expect(tourStore.currentIndex).toBe(1)
    expect(tourStore.activeCapture).not.toBeNull()
  })

  it('handles arrow keys when the event has no target', async () => {
    seedLoaded(0, 1)
    useGuidedTour(fakeContainer())

    const preventDefault = vi.fn()
    await keyHandler()({ key: 'ArrowRight', target: null, preventDefault })

    expect(preventDefault).toHaveBeenCalled()
    await vi.waitFor(() => expect(tourStore.currentIndex).toBe(1))
  })

  it('ignores keys pressed while a navigation is still loading', async () => {
    seedLoaded(0, 0)
    let resolvePage
    fetchSlidesPage.mockReturnValueOnce(new Promise((r) => (resolvePage = r)))
    const ensureLoaded = vi.spyOn(slidesStore, 'ensureLoaded')
    useGuidedTour(fakeContainer())

    const first = press('ArrowRight')
    await press('ArrowLeft') // dropped: the first navigation hasn't finished
    resolvePage(apiPage(1))
    await first

    await vi.waitFor(() => expect(tourStore.currentIndex).toBe(1))
    expect(ensureLoaded).toHaveBeenCalledTimes(1)
  })

  it('stays on the current slide when nothing could be loaded', async () => {
    seedLoaded(0, 0)
    tourStore.currentIndex = 0
    vi.spyOn(slidesStore, 'ensureLoaded').mockResolvedValue(null)
    useGuidedTour(fakeContainer())

    await press('ArrowRight')

    expect(tourStore.currentIndex).toBe(0)
  })
})
