// The lifecycle of one file's chunked stream, as a single explicit phase
// instead of several booleans (started / chunkFinished / hasMore / error)
// that could drift into combinations that mean nothing. Pure, so every
// transition can be tested without an EventSource.
//
//   idle --fetch--> streaming --chunkEnd(hasMore)--> chunk-done --fetch--> streaming
//                       |      \--chunkEnd(!hasMore)--> done
//                       \--error--> failed --fetch--> streaming (retries the same chunk)
//
// `reset` (a different file) returns to idle from anywhere.

export const IDLE = 'idle'
export const STREAMING = 'streaming'
export const CHUNK_DONE = 'chunk-done'
export const FAILED = 'failed'
export const DONE = 'done'

const TRANSITIONS = {
  [IDLE]: { fetch: STREAMING },
  [STREAMING]: {
    chunkEnd: (event) => (event.hasMore ? CHUNK_DONE : DONE),
    error: FAILED,
  },
  [CHUNK_DONE]: { fetch: STREAMING },
  [FAILED]: { fetch: STREAMING },
  [DONE]: {},
}

// Returns the phase after `event` ({ type, ...payload }). Pairs not in the
// table leave the phase unchanged - e.g. the backend closing the connection
// right after a chunk's "done" still fires onerror, which must not turn a
// finished chunk into a failure.
export function transition(phase, event) {
  if (event.type === 'reset') return IDLE

  const target = TRANSITIONS[phase][event.type]
  if (target === undefined) return phase
  return typeof target === 'function' ? target(event) : target
}
