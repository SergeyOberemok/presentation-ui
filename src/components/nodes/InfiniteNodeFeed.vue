<script setup>
import { computed, nextTick, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useNodesStore } from '@/stores/nodes'
import { useIntersectionObserver } from '@vueuse/core'
import { isWithinRootBounds } from '@/utils/isWithinRootBounds'
import { useScrollAnchoredPrepend } from '@/composables/useScrollAnchoredPrepend'
import { useTourMediator } from '@/composables/useTourMediator'
import { useGuidedTour } from '@/composables/useGuidedTour'
import { useNodeRouter } from '@/composables/useNodeRouter'
import { useAsideService } from '@/composables/useAsideService'
import { resolveNodeDescriptor } from '@/factories/nodeFactory'
import NodeDetailPanel from '@/components/aside/NodeDetailPanel.vue'

const SENTINEL_MARGIN = 400

const nodesStore = useNodesStore()
const { hasNext, hasPrev, nextError, prevError, items, minLoadedIndex } = storeToRefs(nodesStore)
const { loadNext, loadPrev } = nodesStore

const mainItems = computed(() =>
  items.value
    .map((item) => ({ item, descriptor: resolveNodeDescriptor(item) }))
    .filter(({ descriptor }) => descriptor.destination === 'main'),
)

const scrollContainer = useTemplateRef('scrollContainer')
const topSentinel = useTemplateRef('topSentinel')
const bottomSentinel = useTemplateRef('bottomSentinel')

useScrollAnchoredPrepend(scrollContainer, minLoadedIndex)
const { vTourNode } = useTourMediator()
useGuidedTour(scrollContainer)
useNodeRouter()

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
    <div class="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
      <h1 class="text-sm font-semibold text-gray-700">Nodes</h1>
    </div>

    <div ref="scrollContainer" class="flex-1 overflow-y-auto scrollbar-none">
      <div ref="topSentinel" class="h-px" />

      <ul class="flex flex-col gap-2 px-4 py-6">
        <li
          v-for="{ item, descriptor } in mainItems"
          :key="item.index"
          v-tour-node="item.index"
          class="flex items-baseline gap-2 rounded-lg bg-slate-100 px-4 py-3 cursor-pointer"
          @click="() => asideService.open(NodeDetailPanel, { node: item })"
        >
          <component :is="descriptor.component" v-bind="descriptor.props" />
          <span class="font-mono text-xs text-gray-400">#{{ item.index }}</span>
        </li>
      </ul>

      <div ref="bottomSentinel" class="h-px" />

      <p v-if="nextError || prevError" class="px-4 py-3 text-sm text-red-500">
        Failed to load more.
      </p>
    </div>
  </div>
</template>
