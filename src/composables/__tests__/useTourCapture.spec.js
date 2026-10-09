import { describe, it, expect, vi, beforeEach } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useTourStore } from '@/stores/tour'
import { useCaptureWhile, useTourCapture } from '../useTourCapture'

describe('useTourCapture', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('capture() then release() from the same instance clears the capture', () => {
    const tourStore = useTourStore()
    const { capture, release } = useTourCapture()

    capture({ onNext: vi.fn() })
    expect(tourStore.activeCapture).not.toBeNull()

    release()
    expect(tourStore.activeCapture).toBeNull()
  })

  it("does not clobber a newer capture when a stale instance's release() fires late", () => {
    const tourStore = useTourStore()
    const first = useTourCapture()
    const second = useTourCapture()

    first.capture({ onNext: vi.fn() })
    second.capture({ onNext: vi.fn() }) // takes over before `first` released

    first.release() // e.g. a delayed onUnmounted from the first component

    expect(tourStore.activeCapture).not.toBeNull()
  })

  it('handleNext() reports no capture when none is active', async () => {
    const { handleNext } = useTourCapture()

    expect(await handleNext()).toBe(false)
  })

  it('handleNext() awaits onNext and reports the key as handled', async () => {
    const { capture, handleNext } = useTourCapture()
    const onNext = vi.fn().mockResolvedValue(undefined)

    capture({ onNext })
    const handled = await handleNext()

    expect(onNext).toHaveBeenCalledTimes(1)
    expect(handled).toBe(true)
  })

  it('handlePrev() reports no capture when none is active', async () => {
    const { handlePrev } = useTourCapture()

    expect(await handlePrev()).toBe(false)
  })

  it('handlePrev() keeps the capture when a synchronous onPrev returns true', async () => {
    const tourStore = useTourStore()
    const { capture, handlePrev } = useTourCapture()
    const onPrev = vi.fn().mockReturnValue(true)

    capture({ onNext: vi.fn(), onPrev })

    expect(await handlePrev()).toBe(true)
    expect(tourStore.activeCapture).not.toBeNull()
  })

  it('handlePrev() awaits an async onPrev instead of treating the pending promise as handled', async () => {
    const tourStore = useTourStore()
    const { capture, handlePrev } = useTourCapture()
    const onPrev = vi.fn().mockResolvedValue(false) // async, but reports "no previous step"

    capture({ onNext: vi.fn(), onPrev })

    expect(await handlePrev()).toBe(false)
    expect(tourStore.activeCapture).toBeNull()
  })

  it('handlePrev() keeps the capture when an async onPrev resolves true', async () => {
    const tourStore = useTourStore()
    const { capture, handlePrev } = useTourCapture()
    const onPrev = vi.fn().mockResolvedValue(true)

    capture({ onNext: vi.fn(), onPrev })

    expect(await handlePrev()).toBe(true)
    expect(tourStore.activeCapture).not.toBeNull()
  })

  it('handlePrev() releases unconditionally on fallback, even if another instance owns the capture', async () => {
    const tourStore = useTourStore()
    const owner = useTourCapture()
    const mainTour = useTourCapture()

    owner.capture({ onNext: vi.fn() }) // no onPrev - has no previous step

    expect(await mainTour.handlePrev()).toBe(false)
    expect(tourStore.activeCapture).toBeNull()
  })

  it('handleNext() releases and reports unhandled when onNext returns false', async () => {
    const tourStore = useTourStore()
    const { capture, handleNext } = useTourCapture()

    capture({ onNext: vi.fn().mockResolvedValue(false) }) // nothing left to reveal

    expect(await handleNext()).toBe(false)
    expect(tourStore.activeCapture).toBeNull()
  })
})

describe('useCaptureWhile', () => {
  let tourStore

  beforeEach(() => {
    setActivePinia(createPinia())
    tourStore = useTourStore()
  })

  function run(source, handlers) {
    const scope = effectScope()
    scope.run(() => useCaptureWhile(source, handlers))
    return scope
  }

  it('captures immediately when the source starts truthy', () => {
    const onNext = vi.fn()
    run(() => 'a', { onNext })

    expect(tourStore.activeCapture.onNext).toBe(onNext)
  })

  it('does not capture while the source is falsy', () => {
    run(() => false, { onNext: vi.fn() })

    expect(tourStore.activeCapture).toBeNull()
  })

  it('captures and releases as the source toggles', async () => {
    const active = ref(false)
    run(active, { onNext: vi.fn() })

    active.value = 'a'
    await nextTick()
    expect(tourStore.activeCapture).not.toBeNull()

    active.value = false
    await nextTick()
    expect(tourStore.activeCapture).toBeNull()
  })

  it('re-captures when the source changes to another truthy key', async () => {
    // e.g. a reused aside instance moving to the next file after the tour
    // released the previous one's capture.
    const key = ref('a')
    run(key, { onNext: vi.fn() })
    tourStore.release()

    key.value = 'b'
    await nextTick()

    expect(tourStore.activeCapture).not.toBeNull()
  })

  it('releases when its scope is disposed', () => {
    const scope = run(() => 'a', { onNext: vi.fn() })

    scope.stop()

    expect(tourStore.activeCapture).toBeNull()
  })

  it('does not release a newer capture taken by someone else on dispose', () => {
    const scope = run(() => 'a', { onNext: vi.fn() })
    useTourCapture().capture({ onNext: vi.fn() })

    scope.stop()

    expect(tourStore.activeCapture).not.toBeNull()
  })
})
