// Wraps an async function so a call made while a previous one is still in
// flight joins that run (gets the same promise) instead of starting another
// or returning early. Callers that loop until some data shows up must await
// the real work: an early-returning "already loading" guard hands them an
// already-resolved promise, and looping on those (microtasks only) starves
// the very fetch they're waiting for and freezes the tab.
export function singleFlight(fn) {
  let inFlight = null

  return function run() {
    inFlight ??= fn().finally(() => {
      inFlight = null
    })
    return inFlight
  }
}
