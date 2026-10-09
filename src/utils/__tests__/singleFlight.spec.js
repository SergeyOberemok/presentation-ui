import { describe, it, expect, vi } from 'vitest'
import { singleFlight } from '../singleFlight'

function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('singleFlight', () => {
  it('joins overlapping calls onto the one in-flight run', async () => {
    const d = deferred()
    const fn = vi.fn(() => d.promise)
    const run = singleFlight(fn)

    const a = run()
    const b = run()
    let bSettled = false
    b.then(() => (bSettled = true))
    await Promise.resolve()

    expect(fn).toHaveBeenCalledTimes(1)
    expect(bSettled).toBe(false) // waits on the real work, not an early return

    d.resolve('done')
    expect(await a).toBe('done')
    expect(await b).toBe('done')
  })

  it('starts a fresh run once the previous one settled', async () => {
    const fn = vi.fn().mockResolvedValue(undefined)
    const run = singleFlight(fn)

    await run()
    await run()

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('clears the in-flight run after a rejection too', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok')
    const run = singleFlight(fn)

    await expect(run()).rejects.toThrow('boom')
    expect(await run()).toBe('ok')
  })
})
