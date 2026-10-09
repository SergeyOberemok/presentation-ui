import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTourStore } from '@/stores/tour'
import { useNodesStore } from '@/stores/nodes'
import { useAsideService } from '@/composables/useAsideService'
import { resolveNodeDescriptor } from '@/factories/nodeFactory'
import { CHAT, resolveDestination } from '@/factories/nodeDestination'

// Applies whatever node the guided tour currently points at to its
// destination. "main" nodes are already rendered inline by the feed's v-for,
// so there's nothing to do for those beyond closing the aside if it was left
// open from a previous node; "chat" nodes have no inline rendering at all,
// so this is the only place that opens them.
export function useNodeRouter() {
  const { currentIndex } = storeToRefs(useTourStore())
  const { itemsByIndex } = storeToRefs(useNodesStore())
  const asideService = useAsideService()

  const currentNode = computed(() => itemsByIndex.value.get(currentIndex.value))

  watch(
    currentNode,
    (node) => {
      if (!node) return

      if (resolveDestination(node) === CHAT) {
        const { component, props } = resolveNodeDescriptor(node)
        asideService.open(component, props)
      } else {
        asideService.close()
      }
    },
    { immediate: true },
  )
}
