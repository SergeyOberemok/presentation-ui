import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTourStore } from '../tour'

describe('useTourStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts at index 0 with no slides registered', () => {
    const store = useTourStore()

    expect(store.currentIndex).toBe(0)
    expect(store.knownMinIndex).toBeNull()
    expect(store.knownMaxIndex).toBeNull()
  })

  it('tracks the known bounds as slides are registered', () => {
    const store = useTourStore()

    store.registerSlide(2, {})
    store.registerSlide(0, {})
    store.registerSlide(1, {})

    expect(store.knownMinIndex).toBe(0)
    expect(store.knownMaxIndex).toBe(2)
    expect(store.slideEls.has(1)).toBe(true)
  })

  it('shrinks the known bounds as slides are unregistered', () => {
    const store = useTourStore()
    store.registerSlide(0, {})
    store.registerSlide(1, {})

    store.unregisterSlide(1)

    expect(store.knownMaxIndex).toBe(0)
    expect(store.slideEls.has(1)).toBe(false)
  })

  it('releases unconditionally when called with no token', () => {
    const store = useTourStore()
    store.capture({ onNext: () => {} })

    store.release()

    expect(store.activeCapture).toBeNull()
  })

  it('releases when the given token still owns the active capture', () => {
    const store = useTourStore()
    const token = store.capture({ onNext: () => {} })

    store.release(token)

    expect(store.activeCapture).toBeNull()
  })

  it('ignores a release from a stale token once a newer capture has taken over', () => {
    const store = useTourStore()
    const staleToken = store.capture({ onNext: () => {} })
    store.capture({ onNext: () => {} }) // a second component captures afterwards

    store.release(staleToken)

    expect(store.activeCapture).not.toBeNull()
  })
})
