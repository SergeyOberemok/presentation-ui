import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useTourStore } from '@/stores/tour'
import { useSlidesStore } from '@/stores/slides'
import { useAsideStore } from '@/stores/aside'
import SlideTextStream from '@/components/slides/SlideTextStream.vue'
import { useSlideRouter } from '../useSlideRouter'

function seedSlides(slidesStore, slides) {
  slidesStore.slides = slides.map((slide, index) => ({ ...slide, index }))
}

describe('useSlideRouter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('opens the aside with the resolved component/props for a chat-destination slide', () => {
    const tourStore = useTourStore()
    const slidesStore = useSlidesStore()
    const asideStore = useAsideStore()
    seedSlides(slidesStore, [{ type: 'file:md', destination: 'chat', value: 'notes.md' }])

    useSlideRouter()
    tourStore.currentIndex = 0

    expect(asideStore.isOpen).toBe(true)
    expect(asideStore.activeComponent).toBe(SlideTextStream)
    expect(asideStore.activeProps).toEqual({ filename: 'notes.md', index: 0, autoStart: false })
  })

  it('closes the aside when the current slide is a main-destination slide', async () => {
    const tourStore = useTourStore()
    const slidesStore = useSlidesStore()
    const asideStore = useAsideStore()
    seedSlides(slidesStore, [
      { type: 'file:md', destination: 'chat', value: 'notes.md' },
      { type: 'text', value: 'hello' },
    ])

    useSlideRouter()
    tourStore.currentIndex = 0
    expect(asideStore.isOpen).toBe(true)

    tourStore.currentIndex = 1
    await nextTick()

    expect(asideStore.isOpen).toBe(false)
  })

  it('does nothing while the current index has no loaded slide yet', async () => {
    const tourStore = useTourStore()
    const asideStore = useAsideStore()

    useSlideRouter()
    tourStore.currentIndex = 5
    await nextTick()

    expect(asideStore.isOpen).toBe(false)
    expect(asideStore.activeComponent).toBeNull()
  })

  it('opens the aside for a file slide with no explicit destination (real backend shape)', () => {
    const tourStore = useTourStore()
    const slidesStore = useSlidesStore()
    const asideStore = useAsideStore()
    seedSlides(slidesStore, [{ type: 'file:md', value: 'notes.md' }])

    useSlideRouter()
    tourStore.currentIndex = 0

    expect(asideStore.isOpen).toBe(true)
    expect(asideStore.activeComponent).toBe(SlideTextStream)
  })

  it('resolves a plain text slide to TextSlide without opening the aside', () => {
    const tourStore = useTourStore()
    const slidesStore = useSlidesStore()
    const asideStore = useAsideStore()
    seedSlides(slidesStore, [{ type: 'text', value: 'hello' }])

    useSlideRouter()
    tourStore.currentIndex = 0

    expect(asideStore.isOpen).toBe(false)
  })
})
