// Defaults to a relative path so dev requests go through the Vite proxy
// (see vite.config.js) and avoid CORS, since the backend doesn't send
// Access-Control-Allow-Origin. Override with an absolute URL in
// environments without that proxy (e.g. production, behind a configured gateway).
const BASE_URL = import.meta.env.VITE_SLIDE_RESOURCES_API_BASE_URL ?? ''

// delayMs lets the caller slow the server's per-line pacing (0/omitted =
// backend sends lines as fast as it reads them) so the stream is visibly
// incremental instead of arriving all at once for small files.
//
// chunk selects which chunk of the file to stream (0-based). Omitted/0 matches
// the backend's own default, so it's left off the URL just like delayMs.
export function buildSlideStreamUrl(filename, { delayMs, chunk } = {}) {
  const base = `${BASE_URL}/slide-resources/stream/${encodeURIComponent(filename)}`
  const params = new URLSearchParams()
  if (delayMs) params.set('delay_ms', delayMs)
  if (chunk) params.set('chunk', chunk)

  const query = params.toString()
  return query ? `${base}?${query}` : base
}
