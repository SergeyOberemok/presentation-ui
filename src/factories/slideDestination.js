// Where a slide is shown - "main" (inline in the feed) or "chat" (the aside
// panel). Kept apart from slideFactory.js, which maps slides to components, so
// navigation/routing logic (useGuidedTour, useSlideRouter) and the feed all
// agree on the same rule without importing any SFCs: if the tour and the feed
// ever disagreed, the tour would try to scroll to an element that was never
// rendered.

export const MAIN = 'main'
export const CHAT = 'chat'

// The part of `type` before ":", e.g. "file" in "file:md". A missing type is
// treated as plain text.
export function slideNamespace(slide) {
  return (slide.type ?? 'text').split(':')[0]
}

// Per-namespace default, used when the backend doesn't send `destination`
// (the current backend always sends one, defaulting to "main"; older data and
// test fixtures may not).
const DEFAULT_DESTINATIONS = {
  text: () => MAIN,
  image: () => MAIN,
  // `file:json` renders as an inline code slide in the main feed; every other
  // file type defaults to the aside panel the backend designed this
  // namespace around.
  file: (slide) => (slide.type === 'file:json' ? MAIN : CHAT),
}

// Unknown namespaces fall back to "main" rather than `undefined`, which would
// make the slide vanish from both the feed and the aside.
export function resolveDestination(slide) {
  return slide.destination ?? DEFAULT_DESTINATIONS[slideNamespace(slide)]?.(slide) ?? MAIN
}
