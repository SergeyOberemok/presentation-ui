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

  describe('toggle', () => {
    it('closes when open', () => {
      const store = useAsideStore()
      store.open({ name: 'Fake' })

      store.toggle()

      expect(store.isOpen).toBe(false)
    })

    it('opens with the given component and props when closed', () => {
      const store = useAsideStore()
      const Component = { name: 'Fake' }

      store.toggle(Component, { a: 1 })

      expect(store.isOpen).toBe(true)
      expect(store.activeComponent).toBe(Component)
      expect(store.activeProps).toEqual({ a: 1 })
    })

    it('re-opens the stored component and props within the close window', () => {
      vi.useFakeTimers()
      const store = useAsideStore()
      const Component = { name: 'Fake' }
      store.open(Component, { a: 1 })
      store.close()

      store.toggle()

      expect(store.isOpen).toBe(true)
      expect(store.activeComponent).toBe(Component)
      expect(store.activeProps).toEqual({ a: 1 })
      vi.useRealTimers()
    })

    it('never opens an empty panel', () => {
      const store = useAsideStore()

      store.toggle()

      expect(store.isOpen).toBe(false)
    })

    it('bumps activeKey on every open', () => {
      const store = useAsideStore()
      const before = store.activeKey

      store.open({ name: 'Fake' })
      store.open({ name: 'Fake' })

      expect(store.activeKey).toBe(before + 2)
    })
  })
})
