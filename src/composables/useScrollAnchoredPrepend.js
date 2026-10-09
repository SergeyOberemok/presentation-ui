import { nextTick, toValue } from 'vue'

export function useScrollAnchoredPrepend(containerRef) {
  async function runAnchored(asyncFn) {
    const container = toValue(containerRef)
    if (!container) {
      await asyncFn()
      return
    }

    const previousScrollTop = container.scrollTop
    const previousScrollHeight = container.scrollHeight

    await asyncFn()
    await nextTick()

    container.scrollTop = previousScrollTop + (container.scrollHeight - previousScrollHeight)
  }

  return { runAnchored }
}
