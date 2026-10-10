import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { fetchSlidesPage } from '@/api/slides'
import { singleFlight } from '@/utils/singleFlight'

export const useSlidesStore = defineStore('slides', () => {
  const slides = ref([])
  const minPage = ref(null)
  const maxPage = ref(null)
  const totalPages = ref(null)
  const isLoadingNext = ref(false)
  const isLoadingPrev = ref(false)
  const nextError = ref(null)
  const prevError = ref(null)

  const hasNext = computed(() => totalPages.value === null || maxPage.value < totalPages.value)
  const hasPrev = computed(() => minPage.value !== null && minPage.value > 1)

  // Data-driven equivalents of the tour store's DOM-based slideEls/known*Index:
  // some slides (e.g. destination: "chat") never get a DOM element registered,
  // so "how much data is loaded" has to be answerable without touching the DOM.
  const slidesByIndex = computed(() => new Map(slides.value.map((slide) => [slide.index, slide])))
  const minLoadedIndex = computed(() => slides.value[0]?.index ?? null)
  const maxLoadedIndex = computed(() => slides.value.at(-1)?.index ?? null)

  function withGlobalIndex(page, pageSize, pageItems) {
    return pageItems.map((slide, i) => ({
      ...slide,
      index: (page - 1) * pageSize + i,
    }))
  }

  async function bootstrap() {
    const data = await fetchSlidesPage(1)

    slides.value = withGlobalIndex(data.page, data.page_size, data.items)
    minPage.value = data.page
    maxPage.value = data.page
    totalPages.value = data.total_pages
  }

  // Single-flight: a call made while a load is already in flight joins that
  // request - see singleFlight() for why returning early would freeze callers
  // that loop until data shows up (ensureLoaded, InfiniteSlideFeed's sentinels).
  const loadNext = singleFlight(async () => {
    if (!hasNext.value) return
    isLoadingNext.value = true

    try {
      if (minPage.value === null) {
        await bootstrap()
      } else {
        const page = maxPage.value + 1
        const data = await fetchSlidesPage(page)
        slides.value.push(...withGlobalIndex(data.page, data.page_size, data.items))
        maxPage.value = data.page
        totalPages.value = data.total_pages
      }
      nextError.value = null
    } catch (err) {
      console.error('Failed to load next page of slides', err)
      nextError.value = err
    } finally {
      isLoadingNext.value = false
    }
  })

  const loadPrev = singleFlight(async () => {
    if (!hasPrev.value) return
    isLoadingPrev.value = true

    try {
      const page = minPage.value - 1
      const data = await fetchSlidesPage(page)
      slides.value.unshift(...withGlobalIndex(data.page, data.page_size, data.items))
      minPage.value = data.page
      prevError.value = null
    } catch (err) {
      console.error('Failed to load previous page of slides', err)
      prevError.value = err
    } finally {
      isLoadingPrev.value = false
    }
  })

  // Loads pages toward `index` until its data is present, or that direction
  // runs out (no more pages, or a load failed). Waits for the slide's *data*,
  // not a DOM element - "chat" slides are never rendered inline. Resolves to
  // the index to land on: `index` itself, otherwise the nearest loaded index
  // in that direction (null if nothing could be loaded at all).
  async function ensureLoaded(index) {
    const forward = maxLoadedIndex.value === null || index > maxLoadedIndex.value

    while (!slidesByIndex.value.has(index)) {
      if (!(forward ? hasNext.value : hasPrev.value)) break
      await (forward ? loadNext() : loadPrev())
      if (forward ? nextError.value : prevError.value) break
    }

    if (slidesByIndex.value.has(index)) return index
    return forward ? maxLoadedIndex.value : minLoadedIndex.value
  }

  return {
    slides,
    minPage,
    maxPage,
    totalPages,
    isLoadingNext,
    isLoadingPrev,
    nextError,
    prevError,
    hasNext,
    hasPrev,
    slidesByIndex,
    minLoadedIndex,
    maxLoadedIndex,
    loadNext,
    loadPrev,
    ensureLoaded,
  }
})
