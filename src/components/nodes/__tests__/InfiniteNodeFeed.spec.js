import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/api/nodes', () => ({
  fetchNodesPage: vi.fn(),
}))

import { fetchNodesPage } from '@/api/nodes'
import { useNodesStore } from '@/stores/nodes'
import { useAsideStore } from '@/stores/aside'
import NodeDetailPanel from '@/components/aside/NodeDetailPanel.vue'
import InfiniteNodeFeed from '../InfiniteNodeFeed.vue'

// jsdom has no IntersectionObserver; this stand-in lets a test fire the
// "sentinel came into view" notification by hand.
let observers = []
class FakeIntersectionObserver {
  constructor(callback) {
    this.callback = callback
    observers.push(this)
  }
  observe() {}
  disconnect() {}
}
function sentinelsIntersect() {
  observers.forEach((o) => o.callback([{ isIntersecting: true }]))
}

// VueUse attaches its observer in a post-flush watcher once the sentinel
// template refs resolve, i.e. one tick after mount.
async function mountFeed() {
  const wrapper = mount(InfiniteNodeFeed)
  await flushPromises()
  return wrapper
}

function apiPage(page, items, totalPages) {
  return { page, page_size: items.length, total_items: 0, total_pages: totalPages, items }
}

describe('InfiniteNodeFeed', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchNodesPage.mockReset()
    observers = []
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // jsdom reports zero-sized rects, so both sentinels always count as in
  // view: the fill loop can only stop by running out of pages or failing.
  it('keeps loading while the bottom sentinel stays in view, until the last page', async () => {
    fetchNodesPage
      .mockResolvedValueOnce(apiPage(1, [{ type: 'text', value: 'a' }], 2))
      .mockResolvedValueOnce(apiPage(2, [{ type: 'text', value: 'b' }], 2))
    const wrapper = await mountFeed()

    sentinelsIntersect()
    await flushPromises()

    expect(fetchNodesPage.mock.calls).toEqual([[1], [2]])
    expect(wrapper.findAll('li').map((li) => li.text())).toEqual(['a#0', 'b#1'])
  })

  it('renders only main-destination nodes inline', async () => {
    fetchNodesPage.mockResolvedValueOnce(
      apiPage(
        1,
        [
          { type: 'text', value: 'a' },
          { type: 'file:md', value: 'notes.md' }, // aside ("chat") node
          { type: 'text', value: 'c' },
        ],
        1,
      ),
    )
    const wrapper = await mountFeed()

    sentinelsIntersect()
    await flushPromises()

    expect(wrapper.findAll('li').map((li) => li.text())).toEqual(['a#0', 'c#2'])
  })

  it('stops filling after a failed load instead of retrying in a loop', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchNodesPage
      .mockResolvedValueOnce(apiPage(1, [{ type: 'text', value: 'a' }], 3))
      .mockRejectedValueOnce(new Error('boom'))
    const wrapper = await mountFeed()

    sentinelsIntersect()
    await flushPromises()

    expect(fetchNodesPage).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Failed to load more.')
  })

  it('does not start a second fill loop while one is running', async () => {
    let resolveFirst
    fetchNodesPage.mockReturnValueOnce(new Promise((r) => (resolveFirst = r)))
    await mountFeed()

    sentinelsIntersect()
    sentinelsIntersect()
    resolveFirst(apiPage(1, [{ type: 'text', value: 'a' }], 1))
    await flushPromises()

    expect(fetchNodesPage).toHaveBeenCalledTimes(1)
    expect(useNodesStore().items).toHaveLength(1)
  })

  it('loads earlier pages once the end is reached when the first page is not page 1', async () => {
    fetchNodesPage
      .mockResolvedValueOnce(apiPage(2, [{ type: 'text', value: 'b' }], 2))
      .mockResolvedValueOnce(apiPage(1, [{ type: 'text', value: 'a' }], 2))
    const wrapper = await mountFeed()

    sentinelsIntersect()
    await flushPromises()

    // The store always bootstraps by asking for page 1; the response's own
    // page number decides whether earlier pages remain.
    expect(fetchNodesPage.mock.calls).toEqual([[1], [1]])
    expect(wrapper.findAll('li').map((li) => li.text())).toEqual(['a#0', 'b#1'])
  })

  it('stops filling after a failed load of an earlier page', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchNodesPage
      .mockResolvedValueOnce(apiPage(3, [{ type: 'text', value: 'c' }], 3))
      .mockRejectedValueOnce(new Error('boom'))
    const wrapper = await mountFeed()

    sentinelsIntersect()
    await flushPromises()

    expect(fetchNodesPage).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Failed to load more.')
  })

  it('opens the node detail panel in the aside when an item is clicked', async () => {
    fetchNodesPage.mockResolvedValueOnce(apiPage(1, [{ type: 'text', value: 'a' }], 1))
    const wrapper = await mountFeed()
    sentinelsIntersect()
    await flushPromises()

    await wrapper.find('li').trigger('click')

    const aside = useAsideStore()
    expect(aside.isOpen).toBe(true)
    expect(aside.activeComponent).toBe(NodeDetailPanel)
    expect(aside.activeProps.node).toMatchObject({ index: 0, value: 'a' })
  })
})
