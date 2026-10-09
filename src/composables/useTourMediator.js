import { useTourStore } from '@/stores/tour'

// Relays nodes as they're pooled in/out by whatever is rendering them (e.g.
// InfiniteNodeFeed's v-for) into the tour store's registry, without either
// side knowing about the other.
export function useTourMediator() {
  const tourStore = useTourStore()

  const vTourNode = {
    mounted(el, binding) {
      tourStore.registerNode(binding.value, el)
    },
    updated(el, binding) {
      if (binding.value !== binding.oldValue) {
        tourStore.unregisterNode(binding.oldValue)
        tourStore.registerNode(binding.value, el)
      }
    },
    unmounted(el, binding) {
      tourStore.unregisterNode(binding.value)
    },
  }

  return { vTourNode }
}
