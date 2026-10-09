import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAsideStore } from '../aside'

describe('useAsideStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('opens with the given component/props', () => {
    const store = useAsideStore()
    const Component = { name: 'Fake' }

    store.open(Component, { foo: 'bar' })

    expect(store.isOpen).toBe(true)
    expect(store.activeComponent).toBe(Component)
    expect(store.activeProps).toEqual({ foo: 'bar' })
  })

  it('clears the active component after the close teardown delay', () => {
    vi.useFakeTimers()
    const store = useAsideStore()
    const Component = { name: 'Fake' }
    store.open(Component)

    store.close()
    expect(store.isOpen).toBe(false)
    expect(store.activeComponent).toBe(Component)

    vi.advanceTimersByTime(300)
    expect(store.activeComponent).toBeNull()
    vi.useRealTimers()
  })

  it('re-opening before the close teardown fires keeps the new component mounted', () => {
    vi.useFakeTimers()
    const store = useAsideStore()
    const First = { name: 'First' }
    const Second = { name: 'Second' }
    store.open(First)

    store.close()
    vi.advanceTimersByTime(100)
    store.open(Second)

    vi.advanceTimersByTime(300)

    expect(store.isOpen).toBe(true)
    expect(store.activeComponent).toBe(Second)
    vi.useRealTimers()
  })
})
