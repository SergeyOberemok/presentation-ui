import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

vi.mock('@vueuse/core', () => ({
  onKeyStroke: vi.fn(),
  useEventListener: vi.fn(),
  useFullscreen: vi.fn(),
}))

import { onKeyStroke, useFullscreen } from '@vueuse/core'
import { usePresenterControls } from '../usePresenterControls'

describe('usePresenterControls', () => {
  let toggle

  function handlerFor(key) {
    return onKeyStroke.mock.calls.find(([k]) => k === key)[1]
  }

  function press(key, tagName = 'DIV') {
    const e = { key, target: { tagName }, preventDefault: vi.fn() }
    handlerFor(key)(e)
    return e
  }

  beforeEach(() => {
    onKeyStroke.mockReset()
    toggle = vi.fn()
    useFullscreen.mockReturnValue({ isFullscreen: ref(false), toggle })
  })

  it('toggles fullscreen on F5 instead of reloading the page', () => {
    usePresenterControls()

    const e = press('F5')

    expect(e.preventDefault).toHaveBeenCalled()
    expect(toggle).toHaveBeenCalledTimes(1)
  })

  it("toggles the blank screen on '.'", () => {
    const { isBlank } = usePresenterControls()

    press('.')
    expect(isBlank.value).toBe(true)
    press('.')
    expect(isBlank.value).toBe(false)
  })

  it('ignores the keys while an editable element has focus', () => {
    const { isBlank } = usePresenterControls()

    const f5 = press('F5', 'INPUT')
    press('.', 'TEXTAREA')

    expect(f5.preventDefault).not.toHaveBeenCalled()
    expect(toggle).not.toHaveBeenCalled()
    expect(isBlank.value).toBe(false)
  })
})
