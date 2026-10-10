import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTourStore } from '@/stores/tour'
import { useSlidesStore } from '@/stores/slides'
import { useAsideService } from '@/composables/useAsideService'
import { resolveSlideDescriptor } from '@/factories/slideFactory'
import { CHAT, resolveDestination } from '@/factories/slideDestination'

// Applies whatever slide the guided tour currently points at to its
// destination. "main" slides are already rendered inline by the feed's v-for,
// so there's nothing to do for those beyond closing the aside if it was left
// open from a previous slide; "chat" slides have no inline rendering at all,
// so this is the only place that opens them.
export function useSlideRouter() {
  const { currentIndex } = storeToRefs(useTourStore())
  const { slidesByIndex } = storeToRefs(useSlidesStore())
  const asideService = useAsideService()

  const currentSlide = computed(() => slidesByIndex.value.get(currentIndex.value))

  watch(
    currentSlide,
    (slide) => {
      if (!slide) return

      if (resolveDestination(slide) === CHAT) {
        const { component, props } = resolveSlideDescriptor(slide)
        asideService.open(component, props)
      } else {
        asideService.close()
      }
    },
    { immediate: true },
  )
}
