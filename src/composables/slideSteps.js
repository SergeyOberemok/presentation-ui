// Cursor over the tour stops a slide's renderer reports in its content (e.g.
// emphasized markdown blocks), walked by ArrowRight/ArrowLeft before the slide
// fetches its next chunk. Pure, like slideStreamPhase.js, so every move can be
// tested without mounting anything.
//
// `cursor` is the last stop visited (-1 = none yet). It stays put when the
// highlight is cleared, which happens when ArrowRight runs out of stops and
// asks for the next chunk. Stops from a newly streamed chunk are appended after
// the old ones, so the walk continues from the cursor and never revisits
// earlier stops.

export function initialSteps() {
  return { cursor: -1, highlighted: false }
}

export function hasPendingStep(state, count) {
  return state.cursor + 1 < count
}

// moved: false means no stop is left. The caller falls through to its next
// action (fetching a chunk), so the highlight is cleared.
export function nextStep(state, count) {
  if (hasPendingStep(state, count)) {
    return { state: { cursor: state.cursor + 1, highlighted: true }, moved: true }
  }
  return { state: { ...state, highlighted: false }, moved: false }
}

// moved: false means there is nothing before the current stop, so the caller
// hands ArrowLeft back to the tour. A cleared highlight (after a chunk fetch)
// first re-shows the last visited stop, then steps back from there.
export function prevStep(state) {
  if (state.highlighted && state.cursor > 0) {
    return { state: { cursor: state.cursor - 1, highlighted: true }, moved: true }
  }
  if (!state.highlighted && state.cursor >= 0) {
    return { state: { ...state, highlighted: true }, moved: true }
  }
  return { state: { ...state, highlighted: false }, moved: false }
}
