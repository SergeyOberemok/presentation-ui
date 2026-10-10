import { toValue, watch } from 'vue'

// Keeps already-rendered content visually still when slides are prepended
// above it, by shifting scrollTop by however much the content grew.
//
// Driven by the data - `firstIndex` (the lowest loaded index) decreasing -
// rather than by wrapping each loadPrev() call, so it applies no matter who
// triggered the prepend (the feed's top sentinel or the guided tour), and
// exactly once even when both raced into the same joined request.
//
// The "pre" watcher runs before the component re-renders, so it measures the
// old layout; the "post" watcher runs after the DOM is patched.
export function useScrollAnchoredPrepend(containerRef, firstIndex) {
  let snapshot = null

  watch(
    () => toValue(firstIndex),
    (next, prev) => {
      const container = toValue(containerRef)
      // prev == null is the initial load: nothing on screen to anchor yet.
      if (!container || prev == null || next == null || next >= prev) return
      snapshot = { scrollTop: container.scrollTop, scrollHeight: container.scrollHeight }
    },
    { flush: 'pre' },
  )

  watch(
    () => toValue(firstIndex),
    () => {
      const container = toValue(containerRef)
      if (!snapshot || !container) return
      container.scrollTop = snapshot.scrollTop + (container.scrollHeight - snapshot.scrollHeight)
      snapshot = null
    },
    { flush: 'post' },
  )
}
