import TextSlide from '@/components/TextSlide.vue'
import ImageSlide from '@/components/slides/ImageSlide.vue'
import SlideTextStream from '@/components/slides/SlideTextStream.vue'
import { resolveSlideResourceUrl } from '@/api/slideResources'
import { MAIN, slideNamespace, resolveDestination } from '@/factories/slideDestination'

// Resolved per slide `type` namespace (the part before ":", e.g. "file" in
// "file:md"). Each resolver decides which component renders the slide and what
// props it needs - extension-specific choices (e.g. markdown vs plain text)
// are left to that component, not re-derived here. Where the slide is shown is
// decided separately by resolveDestination() (see slideDestination.js).
const TYPE_RESOLVERS = {
  text: (slide) => ({
    component: TextSlide,
    props: { value: slide.value },
  }),
  image: (slide) => ({
    component: ImageSlide,
    props: { src: resolveSlideResourceUrl(slide), title: slide.title ?? null },
  }),
  file: (slide, destination) => ({
    component: SlideTextStream,
    props: {
      filename: slide.value,
      index: slide.index,
      // An inline slide streams its first chunk as soon as the tour reaches
      // it; the aside opens empty and waits for ArrowRight to start.
      autoStart: destination === MAIN,
      // The aside reads like a chat and keeps the newest line in view; an
      // inline slide stays centered where the tour put it.
      followStream: destination !== MAIN,
    },
  }),
}

export function resolveSlideDescriptor(slide) {
  const resolve = TYPE_RESOLVERS[slideNamespace(slide)] ?? TYPE_RESOLVERS.text
  const destination = resolveDestination(slide)

  return { ...resolve(slide, destination), destination }
}
