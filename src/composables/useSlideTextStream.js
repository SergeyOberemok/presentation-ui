import { computed, ref, toValue, watch } from 'vue'
import { useEventSource } from '@vueuse/core'
import { buildSlideStreamUrl } from '@/api/slides'

const MESSAGE_EVENT = 'message'
const DONE_EVENT = 'done'

// Pace the backend's own line-by-line delivery (via delay_ms) rather than
// faking a reveal client-side, so the "typing" effect reflects data that has
// actually arrived. Small enough that a long file still finishes quickly.
const DEFAULT_DELAY_MS = 10

// The backend streams one chunk per request (selected by the `chunk` query
// param) rather than the whole file, so a `done` event only ends the current
// chunk - its payload (`{chunk_index, total_chunks, has_more}`) says whether
// more chunks remain. Advancing is left to the caller via fetchNextChunk()
// (button-triggered, no auto-advance) rather than happening automatically.
export function useSlideTextStream(filename, options = {}) {
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS

  const chunk = ref(0)
  const started = ref(false)
  const chunkFinished = ref(false)
  const totalChunks = ref(null)
  const hasMore = ref(true)
  const isDone = ref(false)
  const chunkLines = ref([])
  const completedLines = ref([])
  // Flattens completed chunks with the in-flight chunk's buffer so the text
  // keeps revealing live as lines arrive, not just once a chunk finishes.
  const lines = computed(() => [...completedLines.value, ...chunkLines.value])

  const url = computed(() =>
    buildSlideStreamUrl(toValue(filename), { delayMs: toValue(delayMs), chunk: chunk.value }),
  )

  const { data, event, lastEventId, status, error, close, open } = useEventSource(
    url,
    [MESSAGE_EVENT, DONE_EVENT],
    { autoReconnect: false, immediate: false },
  )

  function resetAll() {
    close()
    chunk.value = 0
    started.value = false
    chunkFinished.value = false
    totalChunks.value = null
    hasMore.value = true
    isDone.value = false
    chunkLines.value = []
    completedLines.value = []
  }

  watch(() => toValue(filename), resetAll)

  // Watch event/lastEventId alongside data: all three are set together for
  // every message, but data alone (a shallowRef) won't re-trigger this
  // watcher when two consecutive lines have identical content, and event
  // tells us whether this was a line ("message") or the terminal "done".
  watch([data, lastEventId, event], ([value, id, eventName]) => {
    if (eventName === DONE_EVENT) {
      chunkFinished.value = true

      const payload = parseDonePayload(value)
      if (payload) {
        totalChunks.value = payload.total_chunks
        hasMore.value = payload.has_more
      }
      isDone.value = !hasMore.value

      completedLines.value = [...completedLines.value, ...chunkLines.value]
      chunkLines.value = []
      close()
      return
    }

    if (value == null) return

    const lineIndex = Number(id)
    if (Number.isInteger(lineIndex) && lineIndex >= 0) {
      chunkLines.value[lineIndex] = value
    } else {
      chunkLines.value.push(value)
    }
  })

  // A real connection failure (never got a "done") should keep the browser
  // from silently retrying in the background - useEventSource only closes
  // the native EventSource itself when autoReconnect is configured.
  watch(error, (err) => {
    if (err) close()
  })

  const text = computed(() => lines.value.join('\n'))
  const isStreaming = computed(() => started.value && status.value !== 'CLOSED')
  const hasFailed = computed(() => error.value != null && !chunkFinished.value)

  function fetchNextChunk() {
    if (isStreaming.value || isDone.value) return

    if (!started.value) {
      started.value = true
      open()
      return
    }

    if (chunkFinished.value) {
      chunkFinished.value = false
      // Changing chunk changes the computed url, which useEventSource's own
      // autoConnect watcher reacts to by reopening - no explicit open() here.
      chunk.value += 1
      return
    }

    // Previous attempt errored out before a "done" arrived - retry the same chunk.
    chunkLines.value = []
    open()
  }

  return {
    text,
    lines,
    status,
    error,
    isStreaming,
    isDone,
    hasFailed,
    hasMore,
    totalChunks,
    chunkIndex: chunk,
    started,
    fetchNextChunk,
    close,
  }
}

function parseDonePayload(value) {
  if (typeof value !== 'string') return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}
