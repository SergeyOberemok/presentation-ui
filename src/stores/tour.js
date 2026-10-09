import { ref, reactive, computed } from 'vue'
import { defineStore } from 'pinia'

export const useTourStore = defineStore('tour', () => {
  const currentIndex = ref(0)
  const nodeEls = reactive(new Map())

  // Lets a dynamic node component (e.g. SlideTextStream) temporarily take
  // over ArrowRight/ArrowLeft from useGuidedTour - see useTourCapture().
  const activeCapture = ref(null) // null | { token, onNext: () => boolean | void, onPrev?: () => boolean }
  let captureSeq = 0

  // Avoid Math.min/max(...keys()): this feed never evicts old pages, so
  // nodeEls can grow large enough over a long session to blow the engine's
  // max call-argument limit if spread into Math.min/max.apply.
  const knownMinIndex = computed(() => {
    let min = null
    for (const key of nodeEls.keys()) {
      if (min === null || key < min) min = key
    }
    return min
  })
  const knownMaxIndex = computed(() => {
    let max = null
    for (const key of nodeEls.keys()) {
      if (max === null || key > max) max = key
    }
    return max
  })

  function registerNode(index, el) {
    nodeEls.set(index, el)
  }

  function unregisterNode(index) {
    nodeEls.delete(index)
  }

  // Returns a token identifying this capture, so the caller can later
  // release *only if it's still the active one* - see release().
  function capture(handlers) {
    const token = ++captureSeq
    activeCapture.value = { ...handlers, token }
    return token
  }

  // With a token: releases only if that token still owns the capture, so a
  // component can safely self-release (e.g. onUnmounted) without clobbering
  // a newer capture someone else took over in the meantime. Without one:
  // releases unconditionally - for the main tour reclaiming control outright
  // (e.g. once a capture reports it has no previous step left).
  function release(token) {
    if (token !== undefined && activeCapture.value?.token !== token) return
    activeCapture.value = null
  }

  return {
    currentIndex,
    nodeEls,
    knownMinIndex,
    knownMaxIndex,
    registerNode,
    unregisterNode,
    activeCapture,
    capture,
    release,
  }
})
