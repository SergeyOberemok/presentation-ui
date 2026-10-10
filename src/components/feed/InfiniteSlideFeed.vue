<script setup>
import SlideDetailPanel from '@/components/aside/SlideDetailPanel.vue'
import { useAsideService } from '@/composables/useAsideService'
import { useGuidedTour } from '@/composables/useGuidedTour'
import { useScrollAnchoredPrepend } from '@/composables/useScrollAnchoredPrepend'
import { useSlideRouter } from '@/composables/useSlideRouter'
import { useTourMediator } from '@/composables/useTourMediator'
import { resolveSlideDescriptor } from '@/factories/slideFactory'
import { useSlidesStore } from '@/stores/slides'
import { isWithinRootBounds } from '@/utils/isWithinRootBounds'
import { useIntersectionObserver } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, nextTick, useTemplateRef } from 'vue'

const SENTINEL_MARGIN = 400

const slidesStore = useSlidesStore()
const { hasNext, hasPrev, nextError, prevError, slides, minLoadedIndex } = storeToRefs(slidesStore)
const { loadNext, loadPrev } = slidesStore

const mainSlides = computed(() =>
  slides.value
    .map((slide) => ({ slide, descriptor: resolveSlideDescriptor(slide) }))
    .filter(({ descriptor }) => descriptor.destination === 'main'),
)

const scrollContainer = useTemplateRef('scrollContainer')
const topSentinel = useTemplateRef('topSentinel')
const bottomSentinel = useTemplateRef('bottomSentinel')

useScrollAnchoredPrepend(scrollContainer, minLoadedIndex)
const { vTourSlide } = useTourMediator()
const { currentIndex } = useGuidedTour(scrollContainer)
useSlideRouter()

const asideService = useAsideService()

// One combined loop (rather than a separate loop per sentinel) because a load
// in one direction can change the other direction's hasMore/visibility
// without that other sentinel ever crossing an IntersectionObserver threshold
// - e.g. the very first load establishes a starting page with content above
// it, which never fires a new "intersecting" notification for the top
// sentinel since it was already intersecting. Re-checking both directions
// after every load is what actually surfaces that. The isFilling guard stops
// the two observer callbacks from running overlapping loops. Loads the guided
// tour starts concurrently are joined by the store (single-flight), and
// prepends are scroll-anchored by useScrollAnchoredPrepend whoever made them.
let isFilling = false

async function fillSentinels() {
  if (isFilling) return
  isFilling = true

  try {
    for (;;) {
      if (
        hasNext.value &&
        isWithinRootBounds(bottomSentinel.value, scrollContainer.value, SENTINEL_MARGIN)
      ) {
        await loadNext()
        if (nextError.value) break
      } else if (
        hasPrev.value &&
        isWithinRootBounds(topSentinel.value, scrollContainer.value, SENTINEL_MARGIN)
      ) {
        await loadPrev()
        if (prevError.value) break
      } else {
        break
      }

      // Re-measure sentinels against the freshly rendered page.
      await nextTick()
    }
  } finally {
    isFilling = false
  }
}

// One observer for both sentinels - fillSentinels() re-checks each direction
// itself. VueUse's observer re-attaches if either element is ever recreated.
useIntersectionObserver(
  [topSentinel, bottomSentinel],
  (entries) => entries.some((entry) => entry.isIntersecting) && fillSentinels(),
  { root: scrollContainer, rootMargin: `${SENTINEL_MARGIN}px` },
)
</script>

<template>
  <div class="flex h-full w-full flex-col">
    <!-- A size container, so slides can be sized to the visible scroll area
         (100cqh) while the list itself grows with its content. A percentage
         height would pin the <ul> to one screen, letting tall slides overflow
         into their neighbours and leaving the bottom sentinel stuck in view. -->
    <div
      ref="scrollContainer"
      class="h-full flex-1 overflow-y-auto scrollbar-none [container-type:size]"
    >
      <div ref="topSentinel" class="h-px" />

      <ul class="flex flex-col">
        <!-- min-h, not h: a slide taller than the screen (e.g. a long JSON file)
             grows instead of overflowing, so the tour lands on its start. -->
        <li
          v-for="{ slide, descriptor } in mainSlides"
          :key="slide.index"
          v-tour-slide="slide.index"
          :data-slide-index="slide.index"
          :aria-current="slide.index === currentIndex ? 'step' : undefined"
          class="flex min-h-[100cqh] shrink-0 items-center justify-center gap-2 bg-slate-100 px-4 py-3 cursor-pointer"
          @click="() => asideService.open(SlideDetailPanel, { slide: slide })"
        >
          <component :is="descriptor.component" v-bind="descriptor.props" />
          <span class="font-mono text-xs text-gray-400">#{{ slide.index }}</span>
        </li>
      </ul>

      <div ref="bottomSentinel" class="h-px" />

      <p v-if="nextError || prevError" class="px-4 py-3 text-sm text-red-500">
        Failed to load more.
      </p>
    </div>
  </div>
</template>
