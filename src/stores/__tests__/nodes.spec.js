import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/api/nodes', () => ({
  fetchNodesPage: vi.fn(),
}))

import { fetchNodesPage } from '@/api/nodes'
import { useNodesStore } from '../nodes'

function page(pageNumber, items, overrides = {}) {
  return {
    page: pageNumber,
    page_size: 2,
    total_items: 10,
    total_pages: 5,
    items,
    ...overrides,
  }
}

describe('useNodesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchNodesPage.mockReset()
  })

  it('bootstraps on the first loadNext by starting on the middle page', async () => {
    fetchNodesPage.mockResolvedValueOnce(page(1, [], { total_pages: 5 }))
    fetchNodesPage.mockResolvedValueOnce(
      page(3, [
        { type: 'text', value: 'a' },
        { type: 'text', value: 'b' },
      ]),
    )
    const store = useNodesStore()

    await store.loadNext()

    expect(fetchNodesPage).toHaveBeenNthCalledWith(1, 1)
    expect(fetchNodesPage).toHaveBeenNthCalledWith(2, 3)
    expect(store.minPage).toBe(3)
    expect(store.maxPage).toBe(3)
    expect(store.items).toEqual([
      { type: 'text', value: 'a', index: 4 },
      { type: 'text', value: 'b', index: 5 },
    ])
    expect(store.hasNext).toBe(true)
    expect(store.hasPrev).toBe(true)
  })

  it('bootstraps directly on page 1 without a second request when there is only one page', async () => {
    fetchNodesPage.mockResolvedValueOnce(
      page(1, [{ type: 'text', value: 'a' }], { total_pages: 1 }),
    )
    const store = useNodesStore()

    await store.loadNext()

    expect(fetchNodesPage).toHaveBeenCalledTimes(1)
    expect(store.minPage).toBe(1)
    expect(store.hasNext).toBe(false)
    expect(store.hasPrev).toBe(false)
  })

  it('appends subsequent pages on loadNext, in order', async () => {
    fetchNodesPage.mockResolvedValueOnce(
      page(
        1,
        [
          { type: 'text', value: 'a' },
          { type: 'text', value: 'b' },
        ],
        { total_pages: 2 },
      ),
    )
    fetchNodesPage.mockResolvedValueOnce(
      page(2, [
        { type: 'text', value: 'c' },
        { type: 'text', value: 'd' },
      ]),
    )
    const store = useNodesStore()

    await store.loadNext()
    await store.loadNext()

    expect(store.items.map((i) => i.index)).toEqual([0, 1, 2, 3])
    expect(fetchNodesPage).toHaveBeenNthCalledWith(2, 2)
  })

  it('stops requesting once totalPages is reached', async () => {
    fetchNodesPage.mockResolvedValueOnce(page(1, [], { total_pages: 1 }))
    const store = useNodesStore()

    await store.loadNext()
    expect(store.hasNext).toBe(false)

    await store.loadNext()
    expect(fetchNodesPage).toHaveBeenCalledTimes(1)
  })

  it('prepends an earlier page via loadPrev and keeps items in order', async () => {
    fetchNodesPage.mockResolvedValueOnce(page(1, [], { total_pages: 5 }))
    fetchNodesPage.mockResolvedValueOnce(
      page(3, [
        { type: 'text', value: 'e1' },
        { type: 'text', value: 'e2' },
      ]),
    )
    fetchNodesPage.mockResolvedValueOnce(
      page(2, [
        { type: 'text', value: 'd1' },
        { type: 'text', value: 'd2' },
      ]),
    )
    const store = useNodesStore()

    await store.loadNext()
    expect(store.hasPrev).toBe(true)

    await store.loadPrev()

    expect(fetchNodesPage).toHaveBeenNthCalledWith(3, 2)
    expect(store.items.map((i) => i.value)).toEqual(['d1', 'd2', 'e1', 'e2'])
    expect(store.items.map((i) => i.index)).toEqual([2, 3, 4, 5])
  })

  it('does not call loadPrev while there is no previous page', async () => {
    fetchNodesPage.mockResolvedValueOnce(
      page(1, [{ type: 'text', value: 'a' }], { total_pages: 1 }),
    )
    const store = useNodesStore()

    await store.loadNext()
    expect(store.hasPrev).toBe(false)

    await store.loadPrev()
    expect(fetchNodesPage).toHaveBeenCalledTimes(1)
  })

  it('records a loadNext failure without throwing, and clears it on the next success', async () => {
    fetchNodesPage.mockRejectedValueOnce(new Error('network down'))
    fetchNodesPage.mockResolvedValueOnce(
      page(1, [{ type: 'text', value: 'a' }], { total_pages: 1 }),
    )
    const store = useNodesStore()

    await store.loadNext()
    expect(store.nextError).toBeInstanceOf(Error)

    await store.loadNext()
    expect(store.nextError).toBeNull()
  })

  it('records a loadPrev failure independently of loadNext state', async () => {
    fetchNodesPage.mockResolvedValueOnce(page(1, [], { total_pages: 5 }))
    fetchNodesPage.mockResolvedValueOnce(page(3, [{ type: 'text', value: 'a' }]))
    fetchNodesPage.mockRejectedValueOnce(new Error('network down'))
    const store = useNodesStore()

    await store.loadNext()
    expect(store.nextError).toBeNull()

    await store.loadPrev()
    expect(store.prevError).toBeInstanceOf(Error)
    expect(store.nextError).toBeNull()
  })

  it('is a singleton: a second useNodesStore() call shares the same state', async () => {
    fetchNodesPage.mockResolvedValueOnce(
      page(1, [{ type: 'text', value: 'a' }], { total_pages: 1 }),
    )
    const storeA = useNodesStore()
    await storeA.loadNext()

    const storeB = useNodesStore()
    expect(storeB.items).toEqual(storeA.items)
  })

  describe('index-keyed data lookups', () => {
    it('are empty before anything has loaded', () => {
      const store = useNodesStore()

      expect(store.itemsByIndex.size).toBe(0)
      expect(store.minLoadedIndex).toBeNull()
      expect(store.maxLoadedIndex).toBeNull()
    })

    it('track the loaded index range and support lookup by index', async () => {
      fetchNodesPage.mockResolvedValueOnce(
        page(
          1,
          [
            { type: 'text', value: 'a' },
            { type: 'text', value: 'b' },
          ],
          { total_pages: 2 },
        ),
      )
      fetchNodesPage.mockResolvedValueOnce(
        page(2, [{ type: 'file:md', destination: 'chat', value: 'notes.md' }]),
      )
      const store = useNodesStore()

      await store.loadNext()
      await store.loadNext()

      expect(store.minLoadedIndex).toBe(0)
      expect(store.maxLoadedIndex).toBe(2)
      expect(store.itemsByIndex.get(1)).toEqual({ type: 'text', value: 'b', index: 1 })
      expect(store.itemsByIndex.get(2)).toEqual({
        type: 'file:md',
        destination: 'chat',
        value: 'notes.md',
        index: 2,
      })
      expect(store.itemsByIndex.has(3)).toBe(false)
    })
  })
})
