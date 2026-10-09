import { onScopeDispose, toValue, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTourStore } from '@/stores/tour'

// Public extension point for dynamic node components that need to take over
// ArrowRight/ArrowLeft from the guided tour for a while (e.g. SlideTextStream
// driving its own stream progression) and hand it back when they're done.
//
// capture({ onNext, onPrev }) makes useGuidedTour route arrow keys here
// instead of its own next()/prev():
// - ArrowRight calls onNext(). Returning (or resolving to) exactly `false`
//   means the capture has nothing left to reveal, so control releases back
//   to the main tour and its normal next() runs in the same keypress -
//   otherwise a capture that outlived its content (e.g. a finished slide
//   revisited via ArrowLeft) would swallow ArrowRight forever. Any other
//   return value (including undefined) counts as handled.
// - ArrowLeft calls onPrev() if given. onPrev() may return (or resolve to)
//   true if it stepped backward itself; returning false/undefined (or
//   omitting onPrev entirely) means the capture has no previous step to go
//   to, so control releases back to the main tour and its normal prev() runs
//   instead.
//
// Each useTourCapture() call tracks its own capture's token, so its release()
// only clears the capture it itself last made - calling it after something
// else has already taken over is a safe no-op rather than clobbering that
// newer capture.
//
// Also re-exports the tour's `currentIndex`, so a node component that can be
// mounted ahead of (or behind) the tour's actual position - e.g. a
// "main"-destination node sitting in an already-loaded feed - can tell
// whether it's the node the tour is actually on right now, rather than
// assuming mount == current (which only "chat" nodes, opened one at a time,
// can safely assume).
export function useTourCapture() {
  const tourStore = useTourStore()
  const { currentIndex } = storeToRefs(tourStore)
  let ownToken = null

  function capture(handlers) {
    ownToken = tourStore.capture(handlers)
  }

  function release() {
    tourStore.release(ownToken)
    ownToken = null
  }

  async function handleNext() {
    const active = tourStore.activeCapture
    if (!active) return false

    if ((await active.onNext?.()) !== false) return true

    tourStore.release()
    return false
  }

  async function handlePrev() {
    const active = tourStore.activeCapture
    if (!active) return false

    if (await active.onPrev?.()) return true

    // No previous step left inside the capture - release unconditionally
    // (the main tour reclaiming control), regardless of which component's
    // capture is currently active, rather than swallowing ArrowLeft.
    tourStore.release()
    return false
  }

  return { capture, release, handleNext, handlePrev, currentIndex }
}

// Declarative capture for node components: holds the arrow keys while
// `source` is truthy and hands them back when it turns falsy or the owning
// scope is disposed (e.g. unmount). Prefer this over calling capture()/
// release() by hand - wiring those to the right watchers and lifecycle hooks
// is where captures got stuck before (a finished slide re-capturing on
// revisit, never to be released).
//
// `source` should return something that identifies *what* is being captured
// (e.g. the filename), not just `true`: a change to another truthy value
// re-captures, which a component reused across nodes (the aside panel) needs
// because the previous node's capture may have been released in between.
export function useCaptureWhile(source, handlers) {
  const { capture, release } = useTourCapture()

  watch(
    () => toValue(source),
    (key) => (key ? capture(handlers) : release()),
    { immediate: true },
  )

  onScopeDispose(release)
}
