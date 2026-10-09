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

// The store always bootstraps on page 1, so a state with earlier pages still
// unloaded (needed to exercise loadPrev) has to be seeded directly.
function seedPage(store, pageNumber, values, { pageSize = 2, totalPages = 5 } = {}) {
  store.$patch({
    items: values.map((value, i) => ({
      type: 'text',
      value,
      index: (pageNumber - 1) * pageSize + i,
    })),
    minPage: pageNumber,
    maxPage: pageNumber,
    totalPages,
  })
}

describe('useNodesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchNodesPage.mockReset()
  })

  it('bootstraps on page 1 on the first loadNext', async () => {
    fetchNodesPage.mockResolvedValueOnce(
      page(1, [
        { type: 'text', value: 'a' },
        { type: 'text', value: 'b' },
      ]),
    )
    const store = useNodesStore()

    await store.loadNext()

    expect(fetchNodesPage).toHaveBeenCalledExactlyOnceWith(1)
    expect(store.minPage).toBe(1)
    expect(store.maxPage).toBe(1)
    expect(store.items).toEqual([
      { type: 'text', value: 'a', index: 0 },
      { type: 'text', value: 'b', index: 1 },
    ])
    expect(store.hasNext).toBe(true)
    expect(store.hasPrev).toBe(false)
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
    fetchNodesPage.mockResolvedValueOnce(
      page(2, [
        { type: 'text', value: 'd1' },
        { type: 'text', value: 'd2' },
      ]),
    )
    const store = useNodesStore()
    seedPage(store, 3, ['e1', 'e2'])
    expect(store.hasPrev).toBe(true)

    await store.loadPrev()

    expect(fetchNodesPage).toHaveBeenCalledExactlyOnceWith(2)
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
    fetchNodesPage.mockRejectedValueOnce(new Error('network down'))
    const store = useNodesStore()
    seedPage(store, 3, ['a'])

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

  it('joins an in-flight loadNext instead of resolving immediately', async () => {
    let resolveFetch
    fetchNodesPage.mockReturnValueOnce(new Promise((r) => (resolveFetch = r)))
    const store = useNodesStore()

    store.loadNext()
    let joinedSettled = false
    const joined = store.loadNext().then(() => (joinedSettled = true))
    await Promise.resolve()
    expect(joinedSettled).toBe(false) // still waiting on the shared fetch

    resolveFetch(page(1, [{ type: 'text', value: 'a' }]))
    await joined

    expect(store.itemsByIndex.has(0)).toBe(true)
    expect(fetchNodesPage).toHaveBeenCalledTimes(1)
  })

  describe('ensureLoaded', () => {
    it('resolves immediately for an index that is already loaded', async () => {
      const store = useNodesStore()
      seedPage(store, 1, ['a', 'b'])

      expect(await store.ensureLoaded(1)).toBe(1)
      expect(fetchNodesPage).not.toHaveBeenCalled()
    })

    it('bootstraps and loads forward page by page until the index exists', async () => {
      fetchNodesPage
        .mockResolvedValueOnce(page(1, [{ value: 'a' }, { value: 'b' }]))
        .mockResolvedValueOnce(page(2, [{ value: 'c' }, { value: 'd' }]))
      const store = useNodesStore()

      expect(await store.ensureLoaded(3)).toBe(3)
      expect(fetchNodesPage.mock.calls).toEqual([[1], [2]])
    })

    it('loads backward until the index exists', async () => {
      fetchNodesPage
        .mockResolvedValueOnce(page(2, [{ value: 'c' }, { value: 'd' }]))
        .mockResolvedValueOnce(page(1, [{ value: 'a' }, { value: 'b' }]))
      const store = useNodesStore()
      seedPage(store, 3, ['e', 'f'])

      expect(await store.ensureLoaded(0)).toBe(0)
      expect(fetchNodesPage.mock.calls).toEqual([[2], [1]])
    })

    it('clamps to the last loaded index when the data ends first', async () => {
      const store = useNodesStore()
      seedPage(store, 1, ['a', 'b'], { totalPages: 1 })

      expect(await store.ensureLoaded(5)).toBe(1)
      expect(fetchNodesPage).not.toHaveBeenCalled()
    })

    it('stops and clamps once a forward load fails', async () => {
      fetchNodesPage.mockRejectedValueOnce(new Error('boom'))
      const store = useNodesStore()
      seedPage(store, 1, ['a', 'b'])

      expect(await store.ensureLoaded(3)).toBe(1)
      expect(fetchNodesPage).toHaveBeenCalledTimes(1)
    })

    it('stops and clamps once a backward load fails', async () => {
      fetchNodesPage.mockRejectedValueOnce(new Error('boom'))
      const store = useNodesStore()
      seedPage(store, 3, ['e', 'f'])

      expect(await store.ensureLoaded(0)).toBe(4)
      expect(fetchNodesPage).toHaveBeenCalledTimes(1)
    })

    it('resolves to null when nothing could be loaded at all', async () => {
      fetchNodesPage.mockRejectedValueOnce(new Error('boom'))
      const store = useNodesStore()

      expect(await store.ensureLoaded(0)).toBeNull()
    })

    it('shares a page request already started by someone else (e.g. the feed)', async () => {
      let resolveFetch
      fetchNodesPage.mockReturnValueOnce(new Promise((r) => (resolveFetch = r)))
      const store = useNodesStore()

      const feedLoad = store.loadNext()
      const tourLoad = store.ensureLoaded(0)
      resolveFetch(page(1, [{ value: 'a' }]))
      await feedLoad

      expect(await tourLoad).toBe(0)
      expect(fetchNodesPage).toHaveBeenCalledTimes(1)
    })
  })
})
