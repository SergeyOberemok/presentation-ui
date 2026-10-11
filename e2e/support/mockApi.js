// Browser-side mocks for presentation-api, so the suite needs no backend and
// runs the same against `vite` (proxied) and `vite preview` (no proxy):
// page.route intercepts the request before it ever leaves the browser.
// Register mocks before page.goto('/') - the slides store bootstraps page 1
// on mount.

import { Buffer } from 'node:buffer'

const PAGE_SIZE = 20

// Serves `slides` (an array of { type, value }) as the paginated /slides/
// endpoint. `failPages` answer 500, to exercise the feed's error state.
// Returns the list of requested page numbers, in request order.
export async function mockSlides(page, slides, { pageSize = PAGE_SIZE, failPages = [] } = {}) {
  const requestedPages = []
  const totalPages = Math.max(1, Math.ceil(slides.length / pageSize))

  await page.route(
    (url) => url.pathname === '/slides/',
    (route) => {
      const pageNumber = Number(new URL(route.request().url()).searchParams.get('page') ?? 1)
      requestedPages.push(pageNumber)

      if (failPages.includes(pageNumber)) {
        return route.fulfill({ status: 500, json: { detail: 'boom' } })
      }

      const start = (pageNumber - 1) * pageSize
      return route.fulfill({
        json: {
          page: pageNumber,
          page_size: pageSize,
          total_items: slides.length,
          total_pages: totalPages,
          items: slides.slice(start, start + pageSize),
        },
      })
    },
  )

  return requestedPages
}

// One SSE response body for a chunk: a `message` per line (id = line index
// within the chunk, as the backend sends it), then the terminal `done` event
// unless `withDone` is false - a body that ends without `done` is what a
// dropped connection looks like to the client.
export function sseBody(lines, { chunkIndex, totalChunks, withDone = true }) {
  const messages = lines.map((line, i) => `id: ${i}\ndata: ${line}\n\n`).join('')
  if (!withDone) return messages

  const done = {
    chunk_index: chunkIndex,
    total_chunks: totalChunks,
    has_more: chunkIndex < totalChunks - 1,
  }
  return `${messages}event: done\ndata: ${JSON.stringify(done)}\n\n`
}

// Serves `chunks` (an array of chunks, each an array of lines) as
// /slide-resources/stream/{filename}. The backend clamps `chunk` to the last
// chunk, and so does this mock.
// - failChunk: that chunk's first response drops the connection mid-chunk
//   (no `done`). Later requests for it succeed, so retries can be tested.
// - holdChunk: that chunk's response waits until `release()` is called, so
//   tests can observe the streaming state.
// Returns { requests, chunks(), release } - `requests` are the full URLs,
// `chunks()` the requested chunk numbers.
export async function mockSlideStream(page, filename, chunks, { failChunk, holdChunk } = {}) {
  const requests = []
  let failed = false
  let release
  const held = new Promise((resolve) => (release = resolve))

  await page.route(
    (url) => url.pathname === `/slide-resources/stream/${encodeURIComponent(filename)}`,
    async (route) => {
      const url = new URL(route.request().url())
      requests.push(url)

      const requested = Number(url.searchParams.get('chunk') ?? 0)
      const chunkIndex = Math.min(requested, chunks.length - 1)

      if (chunkIndex === holdChunk) await held

      const dropConnection = chunkIndex === failChunk && !failed
      if (dropConnection) failed = true

      return route.fulfill({
        headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
        body: sseBody(chunks[chunkIndex], {
          chunkIndex,
          totalChunks: chunks.length,
          withDone: !dropConnection,
        }),
      })
    },
  )

  return {
    requests,
    chunks: () => requests.map((url) => Number(url.searchParams.get('chunk') ?? 0)),
    release: () => release(),
  }
}

// `count` plain text slides, "Slide 0" .. "Slide <count-1>".
export function textSlides(count, offset = 0) {
  return Array.from({ length: count }, (_, i) => ({
    type: 'text',
    value: `Slide ${offset + i}`,
  }))
}

// A 1x1 transparent PNG.
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

// Serves every /slide-resources/files/{filename} (media slides) as a tiny PNG,
// or as a 404 for `missing` filenames. Returns the requested pathnames.
export async function mockSlideFiles(page, { missing = [] } = {}) {
  const requests = []

  await page.route(
    (url) => url.pathname.startsWith('/slide-resources/files/'),
    (route) => {
      const { pathname } = new URL(route.request().url())
      requests.push(pathname)

      const filename = decodeURIComponent(pathname.slice('/slide-resources/files/'.length))
      if (missing.includes(filename)) return route.fulfill({ status: 404 })

      return route.fulfill({ contentType: 'image/png', body: PIXEL_PNG })
    },
  )

  return requests
}
