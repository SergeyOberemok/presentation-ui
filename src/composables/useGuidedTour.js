import { nextTick, toValue } from 'vue'
import { storeToRefs } from 'pinia'
import { useScroll, onKeyStroke } from '@vueuse/core'
import { useTourStore } from '@/stores/tour'
import { useNodesStore } from '@/stores/nodes'
import { useScrollAnchoredPrepend } from '@/composables/useScrollAnchoredPrepend'
import { useTourCapture } from '@/composables/useTourCapture'
import { resolveNodeDescriptor } from '@/factories/nodeFactory'

function isEditableTarget(target) {
  if (!target) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

// Keyboard-driven guided tour: ArrowRight/ArrowLeft step through node
// indices, loading more pages from the nodes store when the target isn't
// loaded yet - it keeps requesting until the real end/start of the data, not
// just the currently rendered edge. Only "main"-destination nodes are
// scrolled into view (they're the only ones with a DOM element pooled by
// useTourMediator); other destinations are left for useNodeRouter to apply.
export function useGuidedTour(containerRef) {
  const tourStore = useTourStore()
  const { currentIndex, nodeEls } = storeToRefs(tourStore)
  const { handleNext, handlePrev } = useTourCapture()

  const nodesStore = useNodesStore()
  const { hasNext, hasPrev, nextError, prevError, itemsByIndex, minLoadedIndex, maxLoadedIndex } =
    storeToRefs(nodesStore)
  const { loadNext, loadPrev } = nodesStore

  const { y } = useScroll(containerRef, { behavior: 'smooth' })
  const { runAnchored } = useScrollAnchoredPrepend(containerRef)

  let isNavigating = false

  async function goTo(targetIndex) {
    if (isNavigating) return
    isNavigating = true

    try {
      let index = Math.max(0, targetIndex)
      const forward = index > currentIndex.value

      // Waits for the node's *data* to be loaded, not for a DOM element -
      // some nodes (e.g. destination: "chat") are never rendered inline here,
      // so they'd never get a nodeEls entry.
      while (!itemsByIndex.value.has(index)) {
        if (forward && hasNext.value) {
          await loadNext()
          if (nextError.value) {
            index = maxLoadedIndex.value ?? currentIndex.value
            break
          }
        } else if (!forward && hasPrev.value) {
          // Routed through runAnchored (same helper InfiniteNodeFeed's own
          // sentinel loop uses) so prepending a page doesn't visually shift
          // already-rendered content before the tour's own scroll lands.
          await runAnchored(loadPrev)
          if (prevError.value) {
            index = minLoadedIndex.value ?? currentIndex.value
            break
          }
        } else {
          index = (forward ? maxLoadedIndex.value : minLoadedIndex.value) ?? currentIndex.value
          break
        }
        await nextTick()
      }

      const node = itemsByIndex.value.get(index)
      if (node && resolveNodeDescriptor(node).destination === 'main') {
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
