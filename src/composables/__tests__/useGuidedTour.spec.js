import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'

vi.mock('@vueuse/core', () => ({
  useScroll: vi.fn(),
  onKeyStroke: vi.fn(),
}))

vi.mock('@/stores/nodes', () => ({
  useNodesStore: vi.fn(),
}))

import { useScroll, onKeyStroke } from '@vueuse/core'
import { useNodesStore } from '@/stores/nodes'
import { useTourStore } from '@/stores/tour'
import { useGuidedTour } from '../useGuidedTour'

function fakeEl(top) {
  return { getBoundingClientRect: () => ({ top }) }
}

function fakeContainer() {
  return ref({ scrollTop: 0, scrollHeight: 0, getBoundingClientRect: () => ({ top: 0 }) })
}

describe('useGuidedTour', () => {
  let scrollY
  let nodesStore

  // Registers a "main"-destination node as both pooled DOM (what
  // useTourMediator would have registered) and pooled data (what the nodes
  // store would have loaded) - the two things useGuidedTour now consults
  // independently.
  function registerLoadedNode(index, el, node = {}) {
    useTourStore().registerNode(index, el)
    nodesStore.itemsByIndex.value.set(index, { index, type: 'text', value: '', ...node })
    if (nodesStore.minLoadedIndex.value === null || index < nodesStore.minLoadedIndex.value) {
      nodesStore.minLoadedIndex.value = index
    }
    if (nodesStore.maxLoadedIndex.value === null || index > nodesStore.maxLoadedIndex.value) {
      nodesStore.maxLoadedIndex.value = index
    }
  }

  beforeEach(() => {
    setActivePinia(createPinia())

    scrollY = ref(0)
    useScroll.mockReturnValue({ y: scrollY })
    onKeyStroke.mockReset()

    nodesStore = {
      hasNext: ref(true),
      hasPrev: ref(false),
      nextError: ref(null),
      prevError: ref(null),
      itemsByIndex: ref(new Map()),
      minLoadedIndex: ref(null),
      maxLoadedIndex: ref(null),
      loadNext: vi.fn().mockResolvedValue(undefined),
      loadPrev: vi.fn().mockResolvedValue(undefined),
    }
    useNodesStore.mockReturnValue(nodesStore)
  })

  it('registers an ArrowLeft/ArrowRight keyboard handler', () => {
    useGuidedTour(fakeContainer())

    expect(onKeyStroke).toHaveBeenCalledWith(['ArrowLeft', 'ArrowRight'], expect.any(Function))
  })

  it('scrolls straight to an already-pooled node without loading more pages', async () => {
    registerLoadedNode(0, fakeEl(0))
    registerLoadedNode(1, fakeEl(50))

    const { next, currentIndex } = useGuidedTour(fakeContainer())
    await next()

    expect(nodesStore.loadNext).not.toHaveBeenCalled()
    expect(currentIndex.value).toBe(1)
    expect(scrollY.value).toBe(50)
  })

  it('requests more pages forward until the target node is pooled', async () => {
    registerLoadedNode(0, fakeEl(0))
    nodesStore.loadNext.mockImplementation(async () => {
      registerLoadedNode(1, fakeEl(50))
    })

    const { next, currentIndex } = useGuidedTour(fakeContainer())
    await next()

    expect(nodesStore.loadNext).toHaveBeenCalledTimes(1)
    expect(currentIndex.value).toBe(1)
  })

  it('clamps to the last known node once there is nothing more to load forward', async () => {
    registerLoadedNode(0, fakeEl(0))
    nodesStore.hasNext.value = false

    const { next, currentIndex } = useGuidedTour(fakeContainer())
    await next()

    expect(nodesStore.loadNext).not.toHaveBeenCalled()
    expect(currentIndex.value).toBe(0)
  })

  it('requests more pages backward via loadPrev when moving to a lower index', async () => {
    const tourStore = useTourStore()
    tourStore.currentIndex = 2
    registerLoadedNode(2, fakeEl(0))
    nodesStore.hasPrev.value = true
    nodesStore.loadPrev.mockImplementation(async () => {
      registerLoadedNode(1, fakeEl(-50))
    })

    const { prev, currentIndex } = useGuidedTour(fakeContainer())
    await prev()

    expect(nodesStore.loadPrev).toHaveBeenCalledTimes(1)
    expect(currentIndex.value).toBe(1)
  })

  it('never drops below index 0', async () => {
    registerLoadedNode(0, fakeEl(0))

    const { prev, currentIndex } = useGuidedTour(fakeContainer())
    await prev()

    expect(nodesStore.loadPrev).not.toHaveBeenCalled()
    expect(currentIndex.value).toBe(0)
  })

  it('stops retrying and clamps once loadNext starts reporting an error', async () => {
    registerLoadedNode(0, fakeEl(0))
    nodesStore.loadNext.mockImplementation(async () => {
      nodesStore.nextError.value = new Error('boom')
    })

    const { next, currentIndex } = useGuidedTour(fakeContainer())
    await next()

    expect(nodesStore.loadNext).toHaveBeenCalledTimes(1)
    expect(currentIndex.value).toBe(0)
  })

  it('stops retrying and clamps once loadPrev starts reporting an error', async () => {
    const tourStore = useTourStore()
    tourStore.currentIndex = 2
    registerLoadedNode(2, fakeEl(0))
    nodesStore.hasPrev.value = true
    nodesStore.loadPrev.mockImplementation(async () => {
      nodesStore.prevError.value = new Error('boom')
    })

    const { prev, currentIndex } = useGuidedTour(fakeContainer())
    await prev()

    expect(nodesStore.loadPrev).toHaveBeenCalledTimes(1)
    expect(currentIndex.value).toBe(2)
  })

  it('ignores arrow keys typed into form fields', () => {
    useGuidedTour(fakeContainer())
    const handler = onKeyStroke.mock.calls[0][1]

    const preventDefault = vi.fn()
    handler({ key: 'ArrowRight', target: { tagName: 'INPUT' }, preventDefault })

    expect(preventDefault).not.toHaveBeenCalled()
  })

  it('handles arrow keys outside of form fields', async () => {
    registerLoadedNode(0, fakeEl(0))
    registerLoadedNode(1, fakeEl(50))

    useGuidedTour(fakeContainer())
    const handler = onKeyStroke.mock.calls[0][1]

    const preventDefault = vi.fn()
    await handler({ key: 'ArrowRight', target: { tagName: 'DIV' }, preventDefault })

    expect(preventDefault).toHaveBeenCalled()
    expect(useTourStore().currentIndex).toBe(1)
  })

  it('skips scrolling for a non-main destination node, but still advances currentIndex', async () => {
    registerLoadedNode(0, fakeEl(0))
    registerLoadedNode(1, fakeEl(50), { type: 'file:md', destination: 'chat', value: 'f.md' })

    const { next, currentIndex } = useGuidedTour(fakeContainer())
    await next()

    expect(currentIndex.value).toBe(1)
    expect(scrollY.value).toBe(0)
  })

  it('skips scrolling for a file node with no explicit destination (defaults to chat)', async () => {
    // Matches the real backend shape today: file nodes arrive as just
    // { type, value }, with no destination field at all.
    registerLoadedNode(0, fakeEl(0))
    registerLoadedNode(1, fakeEl(50), { type: 'file:md', value: 'f.md' })

    const { next, currentIndex } = useGuidedTour(fakeContainer())
    await next()

    expect(currentIndex.value).toBe(1)
    expect(scrollY.value).toBe(0)
  })

  it('delegates ArrowRight to an active capture instead of advancing', async () => {
    registerLoadedNode(0, fakeEl(0))
    registerLoadedNode(1, fakeEl(50))

    const onNext = vi.fn()
    useTourStore().capture({ onNext })

    useGuidedTour(fakeContainer())
    const handler = onKeyStroke.mock.calls[0][1]

    const preventDefault = vi.fn()
    await handler({ key: 'ArrowRight', target: { tagName: 'DIV' }, preventDefault })

    expect(onNext).toHaveBeenCalledTimes(1)
    expect(useTourStore().currentIndex).toBe(0)
  })

  it('releases the capture and runs the normal prev() when it has no previous step', async () => {
    const tourStore = useTourStore()
    tourStore.currentIndex = 1
    registerLoadedNode(0, fakeEl(0))
    registerLoadedNode(1, fakeEl(50))
    tourStore.capture({ onNext: vi.fn() }) // no onPrev

    useGuidedTour(fakeContainer())
    const handler = onKeyStroke.mock.calls[0][1]

    const preventDefault = vi.fn()
    await handler({ key: 'ArrowLeft', target: { tagName: 'DIV' }, preventDefault })

    expect(tourStore.currentIndex).toBe(0)
    expect(tourStore.activeCapture).toBeNull()
  })

  it('lets an active capture handle ArrowLeft itself without releasing or calling prev()', async () => {
    const tourStore = useTourStore()
    tourStore.currentIndex = 1
    registerLoadedNode(0, fakeEl(0))
    registerLoadedNode(1, fakeEl(50))
    const onPrev = vi.fn().mockReturnValue(true)
    tourStore.capture({ onNext: vi.fn(), onPrev })

    useGuidedTour(fakeContainer())
    const handler = onKeyStroke.mock.calls[0][1]

    const preventDefault = vi.fn()
    await handler({ key: 'ArrowLeft', target: { tagName: 'DIV' }, preventDefault })

    expect(onPrev).toHaveBeenCalledTimes(1)
    expect(nodesStore.loadPrev).not.toHaveBeenCalled()
    expect(tourStore.currentIndex).toBe(1)
    expect(tourStore.activeCapture).not.toBeNull()
  })
})
