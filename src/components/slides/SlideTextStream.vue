<script setup>
import { computed, onScopeDispose, ref, useTemplateRef, watch } from 'vue'
import { useSlideTextStream } from '@/composables/useSlideTextStream'
import { useCaptureWhile, useTourCapture } from '@/composables/useTourCapture'
import { hasPendingStep, initialSteps, nextStep, prevStep } from '@/composables/slideSteps'
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

// Tour stops inside the content (e.g. emphasized markdown blocks). The
// renderer reports how many there are, and this component owns the cursor.
// Renderers that don't support stops never emit, so the count stays 0.
const stepCount = ref(0)
const steps = ref(initialSteps())
const activeStep = computed(() => (steps.value.highlighted ? steps.value.cursor : null))

// ArrowRight first walks the stops of the text streamed so far, then reveals
// the next chunk. Stops aren't walked mid-chunk because the text (and the
// count) is still changing. Once there's nothing left to stream,
// fetchNextChunk() returns false and the tour moves on.
function onNext() {
  if (isStreaming.value) return true
  const { state, moved } = nextStep(steps.value, stepCount.value)
  steps.value = state
  return moved || fetchNextChunk()
}

// ArrowLeft walks the stops back. Before the first one, it hands control back
// to the tour. Chunks already streamed stay revealed.
function onPrev() {
  const { state, moved } = prevStep(steps.value)
  steps.value = state
  return moved
}

// Holds the arrow keys while this is the tour's node and there's still
// something to stream or a stop to visit. A slide that's fully streamed and
// walked hands the keys back, including when revisited later, since its
// stream and cursor state survive. Keyed by index/filename so an instance
// given a new node's props re-captures for it. The aside remounts per node
// (see the aside store's activeKey), but this stays correct if an instance is
// ever reused.
useCaptureWhile(
  () =>
    isCurrent.value &&
    (!isDone.value || hasPendingStep(steps.value, stepCount.value)) &&
    `${props.index}:${props.filename}`,
  { onNext, onPrev },
)

// Watches filename too, not just the isCurrent transition, for the same
// reused-instance case.
watch(
  [isCurrent, () => props.filename],
  ([current]) => {
    if (current && props.autoStart && !started.value) fetchNextChunk()
  },
  { immediate: true },
)

// Keeps the newest streamed line in view. The zero-height end marker with
// 'nearest' scrolls only as far as needed to reveal the last line, and not at
// all while it's already visible. A short slide the tour just aligned to the
// top therefore stays put. Lines arrive every few ms, so scrolls are batched
// to one per frame. Only the tour's current node scrolls, so main-feed slides
// mounted ahead of the tour never move the feed.
const streamEnd = useTemplateRef('streamEnd')
let followFrame = null

watch(
  text,
  () => {
    if (!isStreaming.value || !isCurrent.value || followFrame !== null) return
    followFrame = requestAnimationFrame(() => {
      followFrame = null
      streamEnd.value?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
    })
  },
  { flush: 'post' },
)

onScopeDispose(() => {
  if (followFrame !== null) cancelAnimationFrame(followFrame)
})

// A different file's stops start from scratch. useSlideTextStream resets its
// own state on the same change.
watch(
  () => props.filename,
  () => {
    steps.value = initialSteps()
  },
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

    <component
      :is="renderer"
      :text="text"
      :filename="filename"
      :active-step="activeStep"
      @steps="stepCount = $event"
    />
    <div ref="streamEnd" aria-hidden="true" />

    <p v-if="hasFailed" class="mt-2 text-sm text-red-500">Connection lost while streaming.</p>
  </div>
</template>
