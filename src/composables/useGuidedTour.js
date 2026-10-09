import { nextTick, toValue } from 'vue'
import { storeToRefs } from 'pinia'
import { useScroll, onKeyStroke } from '@vueuse/core'
import { useTourStore } from '@/stores/tour'
import { useNodesStore } from '@/stores/nodes'
import { useTourCapture } from '@/composables/useTourCapture'
import { MAIN, resolveDestination } from '@/factories/nodeDestination'

function isEditableTarget(target) {
  if (!target) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

// Keyboard-driven guided tour: ArrowRight/ArrowLeft step through node
// indices, asking the nodes store to load pages until the target's data
// exists - up to the real end/start of the data, not just the currently
// rendered edge. Only "main"-destination nodes are scrolled into view
// (they're the only ones with a DOM element pooled by useTourMediator); other
// destinations are left for useNodeRouter to apply. Scroll anchoring for
// prepended pages is the feed's job (useScrollAnchoredPrepend), not this one's.
export function useGuidedTour(containerRef) {
  const tourStore = useTourStore()
  const { currentIndex, nodeEls } = storeToRefs(tourStore)
  const { handleNext, handlePrev } = useTourCapture()

  const nodesStore = useNodesStore()
  const { itemsByIndex } = storeToRefs(nodesStore)

  const { y } = useScroll(containerRef, { behavior: 'smooth' })

  let isNavigating = false

  async function goTo(targetIndex) {
    if (isNavigating) return
    isNavigating = true

    try {
      const index = (await nodesStore.ensureLoaded(Math.max(0, targetIndex))) ?? currentIndex.value

      // Let the feed render (and scroll-anchor) any page just loaded, so the
      // target's element exists and its position is final before measuring.
      await nextTick()

      const node = itemsByIndex.value.get(index)
      if (node && resolveDestination(node) === MAIN) {
        const el = nodeEls.value.get(index)
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

  onKeyStroke(['ArrowLeft', 'ArrowRight'], async (e) => {
    if (isEditableTarget(e.target)) return

    // Runs synchronously before any await below, as required for
    // preventDefault() to actually suppress the browser's default action.
    e.preventDefault()

    // A captured node (e.g. SlideTextStream) drives ArrowRight itself; for
    // ArrowLeft, it either steps back internally or - once it has no more
    // previous steps - releases control so the main tour's prev() takes over.
    // handleNext()/handlePrev() await the capture's own handler, so this
    // works whether that handler is sync or async.
    if (e.key === 'ArrowRight') {
      if (await handleNext()) return
      next()
    } else {
      if (await handlePrev()) return
      prev()
    }
  })

  return { currentIndex, next, prev, goTo }
}
