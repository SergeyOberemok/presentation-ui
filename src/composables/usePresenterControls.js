import { ref } from 'vue'
import { onKeyStroke, useEventListener, useFullscreen } from '@vueuse/core'
import { isEditableTarget } from '@/utils/isEditableTarget'

// The extra buttons of a presenter clicker (e.g. Logitech R400); its
// next/back buttons are handled by the guided tour (NEXT_KEYS / PREV_KEYS).
// - Slideshow sends F5 and Escape on alternate presses. F5 would reload the
//   page, so it toggles fullscreen instead; the following Escape is what the
//   browser itself uses to leave fullscreen.
// - Blank screen sends '.', which toggles a black overlay.
export const FULLSCREEN_KEY = 'F5'
export const BLANK_KEY = '.'

export function usePresenterControls() {
  const { isFullscreen, toggle } = useFullscreen(document.documentElement)
  const isBlank = ref(false)

  onKeyStroke(FULLSCREEN_KEY, (e) => {
    if (isEditableTarget(e.target)) return
    e.preventDefault()
    // The keydown is a user activation, so requestFullscreen is allowed.
    toggle()
  })

  onKeyStroke(BLANK_KEY, (e) => {
    if (isEditableTarget(e.target)) return
    e.preventDefault()
    isBlank.value = !isBlank.value
  })

  // TEMPORARY: logs every key in dev, to confirm what a clicker actually sends.
  // Remove once the codes are confirmed on the device.
  if (import.meta.env.DEV) {
    useEventListener(window, 'keydown', (e) => {
      console.debug('[presenter]', e.key, e.code, e.keyCode)
    })
  }

  return { isBlank, isFullscreen }
}
