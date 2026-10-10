import { useTourStore } from '@/stores/tour'

// Relays slides as they're pooled in/out by whatever is rendering them (e.g.
// InfiniteSlideFeed's v-for) into the tour store's registry, without either
// side knowing about the other.
export function useTourMediator() {
  const tourStore = useTourStore()

  const vTourSlide = {
    mounted(el, binding) {
      tourStore.registerSlide(binding.value, el)
    },
    updated(el, binding) {
      if (binding.value !== binding.oldValue) {
        tourStore.unregisterSlide(binding.oldValue)
        tourStore.registerSlide(binding.value, el)
      }
    },
    unmounted(el, binding) {
      tourStore.unregisterSlide(binding.value)
    },
  }

  return { vTourSlide }
}
