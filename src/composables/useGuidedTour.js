import { nextTick, toValue } from 'vue'
import { storeToRefs } from 'pinia'
import { useScroll, onKeyStroke } from '@vueuse/core'
import { useTourStore } from '@/stores/tour'
import { useSlidesStore } from '@/stores/slides'
import { useTourCapture } from '@/composables/useTourCapture'
import { MAIN, resolveDestination } from '@/factories/slideDestination'
import { isEditableTarget } from '@/utils/isEditableTarget'

// A presenter clicker (e.g. Logitech R400) sends PageDown/PageUp for its
// next/back buttons, so they're aliases of the arrow keys everywhere,
// including slide captures.
export const NEXT_KEYS = ['ArrowRight', 'PageDown']
export const PREV_KEYS = ['ArrowLeft', 'PageUp']

// Keyboard-driven guided tour: ArrowRight/ArrowLeft step through slide
// indices, asking the slides store to load pages until the target's data
// exists - up to the real end/start of the data, not just the currently
// rendered edge. Only "main"-destination slides are scrolled into view
// (they're the only ones with a DOM element pooled by useTourMediator); other
// destinations are left for useSlideRouter to apply. Scroll anchoring for
// prepended pages is the feed's job (useScrollAnchoredPrepend), not this one's.
export function useGuidedTour(containerRef) {
  const tourStore = useTourStore()
  const { currentIndex, slideEls } = storeToRefs(tourStore)
  const { handleNext, handlePrev } = useTourCapture()

  const slidesStore = useSlidesStore()
  const { slidesByIndex } = storeToRefs(slidesStore)

  const { y } = useScroll(containerRef, { behavior: 'smooth' })

  let isNavigating = false

  async function goTo(targetIndex) {
    if (isNavigating) return
    isNavigating = true

    try {
      const index = (await slidesStore.ensureLoaded(Math.max(0, targetIndex))) ?? currentIndex.value

      // Let the feed render (and scroll-anchor) any page just loaded, so the
      // target's element exists and its position is final before measuring.
      await nextTick()

      const slide = slidesByIndex.value.get(index)
      if (slide && resolveDestination(slide) === MAIN) {
        const el = slideEls.value.get(index)
        const container = toValue(containerRef)
        if (el && container) {
          const delta = el.getBoundingClientRect().top - container.getBoundingClientRect().top
          y.value = container.scrollTop + delta
        }
      }

      currentIndex.value = index
    } finally {
      isNavigating = false
    }
  }

  function next() {
    return goTo(currentIndex.value + 1)
  }

  function prev() {
    return goTo(currentIndex.value - 1)
  }

  onKeyStroke([...PREV_KEYS, ...NEXT_KEYS], async (e) => {
    if (isEditableTarget(e.target)) return

    // Runs synchronously before any await below, as required for
    // preventDefault() to actually suppress the browser's default action
    // (including PageUp/PageDown scrolling the feed).
    e.preventDefault()

    // A captured slide (e.g. SlideTextStream) drives ArrowRight itself; for
    // ArrowLeft, it either steps back internally or - once it has no more
    // previous steps - releases control so the main tour's prev() takes over.
    // handleNext()/handlePrev() await the capture's own handler, so this
    // works whether that handler is sync or async.
    if (NEXT_KEYS.includes(e.key)) {
      if (await handleNext()) return
      next()
    } else {
      if (await handlePrev()) return
      prev()
    }
  })

  return { currentIndex, next, prev, goTo }
}
