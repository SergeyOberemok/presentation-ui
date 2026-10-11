// Same base as the stream endpoint (see slideStream.js): relative by default so
// dev requests go through the Vite proxy, overridable where there is no proxy.
const BASE_URL = import.meta.env.VITE_SLIDE_RESOURCES_API_BASE_URL ?? ''

// Where to fetch a media slide's file (e.g. an image). The backend sends a
// ready-made `url` (already URL-encoded, relative to its own root); the
// fallback builds the same path from `value` for slides that come without one.
export function resolveSlideResourceUrl(slide) {
  const path = slide.url ?? `/slide-resources/files/${encodeURIComponent(slide.value)}`
  return `${BASE_URL}${path}`
}
