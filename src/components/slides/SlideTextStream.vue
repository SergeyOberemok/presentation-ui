<script setup>
import { computed, watch } from 'vue'
import { useSlideTextStream } from '@/composables/useSlideTextStream'
import { useCaptureWhile, useTourCapture } from '@/composables/useTourCapture'
import { resolveSlideRenderer } from '@/components/slides/renderers'

const props = defineProps({
  filename: { type: String, required: true },
  // The index this node occupies in the tour, used to tell whether the tour
  // has actually reached this node yet - see the watcher below. Optional
  // because tests may mount this component standalone.
  index: { type: Number, default: null },
  // Fetch the first chunk as soon as this node becomes current. When false
  // (aside panel), the slide starts empty and the first ArrowRight - routed
  // through the capture below - starts the stream instead.
  autoStart: { type: Boolean, default: true },
})

const { text, isStreaming, hasFailed, isDone, fetchNextChunk, started } = useSlideTextStream(
  () => props.filename,
)

const renderer = computed(() => resolveSlideRenderer(props.filename))

const { currentIndex } = useTourCapture()

// A "chat"-destination node is opened one at a time, so for it mount really
// does mean current. A "main"-destination node (e.g. file:json) has no such
// guarantee - the feed mounts every loaded node up front, well ahead of the
// tour reaching it - so capturing arrow keys and starting the fetch both
// have to wait for isCurrent, not mount.
const isCurrent = computed(() => props.index === currentIndex.value)

// ArrowRight reveals the next chunk while this is the tour's node and there's
// still something left to stream; a fully streamed slide hands the keys back
// (also when revisited later, since its isDone state survives). Keyed by
// index/filename so an instance given a new node's props re-captures for it
// (the aside remounts per node - see the aside store's activeKey - but this
// stays correct if an instance is ever reused).
useCaptureWhile(() => isCurrent.value && !isDone.value && `${props.index}:${props.filename}`, {
  onNext: fetchNextChunk,
})

// Watches filename too, not just the isCurrent transition, for the same
// reused-instance case.
watch(
  [isCurrent, () => props.filename],
  ([current]) => {
    if (current && props.autoStart && !started.value) fetchNextChunk()
  },
  { immediate: true },
)
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
