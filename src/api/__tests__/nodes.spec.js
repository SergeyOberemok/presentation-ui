import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchNodesPage } from '../nodes'

describe('fetchNodesPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests the given page and resolves to the parsed JSON body', async () => {
    const body = { page: 2, items: [{ type: 'text', value: 'hi' }] }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchNodesPage(2)).resolves.toEqual(body)
    expect(fetchMock).toHaveBeenCalledWith('/nodes/?page=2')
  })

  it('throws with the page and status when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

    await expect(fetchNodesPage(3)).rejects.toThrow('Failed to fetch nodes page 3: 500')
  })
})
