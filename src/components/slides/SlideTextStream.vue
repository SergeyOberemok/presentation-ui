<script setup>
import { computed, onUnmounted, watch } from 'vue'
import { useSlideTextStream } from '@/composables/useSlideTextStream'
import { useTourCapture } from '@/composables/useTourCapture'
import { resolveSlideRenderer } from '@/components/slides/renderers'

const props = defineProps({
  filename: { type: String, required: true },
  // The index this node occupies in the tour, used to tell whether the tour
  // has actually reached this node yet - see the watcher below. Optional
  // because tests may mount this component standalone.
  index: { type: Number, default: null },
})

const { text, isStreaming, hasFailed, isDone, fetchNextChunk, started } = useSlideTextStream(
  () => props.filename,
)

const renderer = computed(() => resolveSlideRenderer(props.filename))

const { capture, release, currentIndex } = useTourCapture()

const isCurrent = computed(() => props.index === currentIndex.value)

// A "chat"-destination node is opened one at a time, so for it mount really
// does mean current. A "main"-destination node (e.g. file:json) has no such
// guarantee - the feed mounts every loaded node up front, well ahead of the
// tour reaching it - so capturing arrow keys and starting the fetch both
// have to wait for isCurrent, not mount. The aside panel also reuses this
// same instance across consecutive file nodes (only `filename`/`index`
// change, no remount), hence watching filename too rather than relying on
// the isCurrent transition alone.
watch(
  [isCurrent, () => props.filename],
  ([current]) => {
    if (!current) {
      release()
      return
    }

    capture({ onNext: fetchNextChunk })
    if (!started.value) fetchNextChunk()
  },
  { immediate: true },
)

watch(isDone, (done) => {
  if (done) release()
})

onUnmounted(release)
</script>

<template>
  <div class="p-4">
    <div class="mb-4 flex items-center gap-2">
      <h2 class="text-lg font-semibold text-gray-800">{{ filename }}</h2>
      <span
        v-if="isStreaming"
        class="h-2 w-2 shrink-0 animate-pulse rounded-full bg-slate-400"
        aria-hidden="true"
      />
    </div>

    <component :is="renderer" :text="text" :filename="filename" />

    <p v-if="hasFailed" class="mt-2 text-sm text-red-500">Connection lost while streaming.</p>
  </div>
</template>
