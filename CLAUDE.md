# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A presentation viewer: a Vue 3 + Vite SPA that pulls a paginated list of **nodes** (slide items) from
the `presentation-api` backend and lets the user step through them with the keyboard. Each node has a
`type` (e.g. `text`, `file:md`, `file:json`) and a `value`, and is rendered differently depending on
that type and its properties — inline in the main feed, or in the aside ("chat") panel, with file
nodes streamed line-by-line from the backend.

Stack: Pinia (setup-style stores), Vue Router, Tailwind CSS v4 (via `@tailwindcss/vite`, imported in
`src/styles.css`), `@vueuse/core`, `markdown-it` (+ `markdown-it-mark`) + `highlight.js` + `DOMPurify` for slide content.

## Commands

- `npm run dev` — start the Vite dev server. Expects `presentation-api` on `http://localhost:8000`.
- `npm run build` — production build.
- `npm run preview` — preview the production build.
- `npm run test:unit` — run Vitest unit tests (jsdom environment). Run a single file with `npm run test:unit -- src/composables/__tests__/useGuidedTour.spec.js`.
- `npm run test:e2e` — run Playwright e2e tests against `e2e/**`. First run `npx playwright install`. Run a single file with `npm run test:e2e -- e2e/vue.spec.js`; add `--project=chromium` to limit to one browser, `--debug` to debug. On CI, build first (`npm run build`) since Playwright's `webServer` uses `npm run preview` when `CI` is set, otherwise it reuses `npm run dev`.
- `npm run lint` — runs oxlint then eslint (both with `--fix`), via `npm-run-all2`. Run them individually as `npm run lint:oxlint` / `npm run lint:eslint`.
- `npm run format` — Prettier write over `src/`.

## Backend (presentation-api)

- Endpoints (verified against the OpenAPI schema):
  - `GET /nodes/?page=N` (1-indexed, 20 items/page) → `{ page, page_size, total_items, total_pages, items: [{ type, value }] }` (`src/api/nodes.js`). The schema's `Node` has only `type` (a discriminator string) and `value` — no `destination`, so the frontend derives it from `type` (the `node.destination ??` fallback in `nodeFactory.js` is forward-looking).
  - `GET /slides/{filename}?chunk=&delay_ms=` → Server-Sent Events stream of one chunk of a file in the backend's `slide_resources/` (`src/api/slides.js`). Chunks are split on standalone `---` lines (not inside fenced code, markdown tables, or leading YAML front matter); `chunk` is 0-based and clamped to the last chunk. `message` events carry one line each (event `id` = line index within the chunk); a terminal `done` event carries `{ chunk_index, total_chunks, has_more }` — stop requesting once `has_more` is false. The `Last-Event-ID` header is only for the browser's own reconnect; the client paginates via `chunk`.
  - Backend-allowed file extensions: `.md`, `.json`, `.js`, `.ts`. The renderer registry also maps `css`/`scss`, which the backend currently won't serve.
- In dev, `/nodes` and `/slides` are proxied to `localhost:8000` by `vite.config.js` (the backend sends no CORS headers). Override with `VITE_NODES_API_BASE_URL` / `VITE_SLIDES_API_BASE_URL` for environments without the proxy.
- `.mcp.json` registers a `presentation-api` MCP server that exposes the backend's OpenAPI schema (`http://localhost:8000/openapi.json`) — use it to check the API contract when the backend is running.

## Architecture

Single route `/` → `src/views/MainView.vue`: `InfiniteNodeFeed` (main column) + `AsidePanel` (right panel).

### Node type → rendering (the central extension point)

Two layers, both keyed by the **namespace** of `node.type` (the part before `:`):

- `src/factories/nodeDestination.js` — `resolveDestination(node)`: where a node is shown, `main` (inline
  feed) or `chat` (aside). Pure, with no component imports, so the tour, the router and the feed share one
  rule. `node.destination` wins when present; otherwise `text` → `main`, `file:json` → `main` (inline code
  slide), every other `file:*` → `chat`, unknown → `main`.
- `src/factories/nodeFactory.js` — `resolveNodeDescriptor(node)` returns `{ component, props, destination }`;
  unknown namespaces fall back to the `text` resolver.
  - `text` → `TextNode`.
  - `file` → `SlideTextStream` with `{ filename: node.value, index, autoStart }`. `autoStart` is true only
    for `main`: inline slides stream their first chunk when the tour reaches them, while aside slides open
    empty and the first ArrowRight starts the stream.

Within a file slide, the **extension** of `filename` picks the renderer via
`src/components/slides/renderers/index.js` (`resolveSlideRenderer`): `md` → `MarkdownRenderer`;
`json/js/ts/css/scss` → `CodeRenderer` (highlight.js); anything else → `PlainTextRenderer`. Renderers all
take `{ text, filename }`. Keep extension-specific decisions in the renderer registry, not in the node
factory.

To add a new node type: add a resolver to `TYPE_RESOLVERS` (and a component), plus an entry in
`DEFAULT_DESTINATIONS` if it shouldn't default to `main`. Code that only needs the destination calls
`resolveDestination`, not the factory. To support a new file
extension: register a renderer (and, for code, its highlight.js language in `CodeRenderer.vue`). Any HTML
produced from content must go through `DOMPurify.sanitize` before `v-html`.

### Data loading

- `src/stores/nodes.js` — bidirectional paginated store that bootstraps on page 1. Assigns each item a
  global `index` (`(page-1)*page_size + i`), tracks `minPage`/`maxPage`, exposes `itemsByIndex`,
  `min/maxLoadedIndex`. Nodes are never evicted.
  - `loadNext`/`loadPrev` are single-flight (`src/utils/singleFlight.js`): a concurrent call joins the
    in-flight request. Don't swap this for an early-return "already loading" guard. Callers that loop
    until data appears would spin on resolved promises and freeze the tab.
  - `ensureLoaded(index)` loads pages toward an index until its data exists. It resolves to the index to
    land on, clamped to the nearest loaded index at the data's edge or after an error, or `null` if
    nothing loaded. It is the only "load until" loop for navigation and knows nothing about the DOM.
- `InfiniteNodeFeed.vue` renders only `main` items and fills via top/bottom sentinels (VueUse
  `useIntersectionObserver` plus `isWithinRootBounds` polling, in a single guarded loop).
- `useScrollAnchoredPrepend(container, minLoadedIndex)` keeps content still when pages are prepended. It
  reacts to `minLoadedIndex` decreasing (snapshot before render, restore after), so it applies once per
  prepend whoever triggered it, and callers just call `loadPrev()`.

### Guided tour (keyboard navigation)

- `src/stores/tour.js` — `currentIndex`, a registry of rendered node elements (`nodeEls`), and
  `activeCapture`.
- `useGuidedTour` (mounted by the feed) — ArrowRight/ArrowLeft move `currentIndex` via
  `nodesStore.ensureLoaded`, which waits for data rather than a DOM element because `chat` nodes are never
  rendered inline. It then waits a tick and scrolls to the node only if its destination is `main`.
- `useTourMediator` — `v-tour-node` directive registering feed `<li>`s into `nodeEls`.
- `useNodeRouter` — watches the current node: opens `chat` nodes in the aside, closes the aside for `main`
  nodes.
- `useTourCapture` — lets a node component temporarily take over the arrow keys. Captures are
  token-based, so a stale release can't clobber a newer capture. If `onNext` returns exactly `false`
  (nothing left), the capture is released and the tour advances on the same keypress. ArrowLeft with no
  `onPrev`, or with `onPrev` returning falsy, hands control back to the tour.
  - Components should use `useCaptureWhile(source, handlers)` instead of calling `capture()`/`release()`
    by hand. It captures while `source` is truthy, re-captures when it changes to another truthy key, and
    releases when it turns falsy or the scope is disposed.

### Streamed file slides

- `useSlideTextStream(filename)` wraps `useEventSource` with auto-reconnect, immediate and autoConnect all
  off, so only `fetchNextChunk()` opens connections. The backend streams one chunk per request.
  `fetchNextChunk()` starts the stream, advances to the next chunk after a `done`, or retries a failed
  chunk; it returns `false` once the file is done. The stream resets when `filename` changes.
- The stream's state is a single `phase` (`idle | streaming | chunk-done | failed | done`), driven by the
  pure `transition()` in `src/composables/slideStreamPhase.js`. `started`, `isStreaming`, `isDone` and
  `hasFailed` are derived from `phase`, not from `useEventSource`'s `status`, which already reads
  `CONNECTING` before anything is opened. New stream states or events go in the transition table and its
  spec.
- `SlideTextStream.vue` holds the arrow keys via `useCaptureWhile` while `index === currentIndex` and
  either the file isn't done or a tour stop is still unvisited. Main-feed nodes are mounted well before
  the tour reaches them, hence the `currentIndex` check.
- **Tour stops**: a renderer can define stops inside its content. It emits `steps` (a count) and takes
  `activeStep`, which it highlights and scrolls into view (the contract is in `renderers/index.js`).
  After a chunk has streamed, ArrowRight walks the stops not visited yet, then fetches the next chunk.
  ArrowLeft walks back, then hands control to the tour. The cursor is the pure
  `src/composables/slideSteps.js`. For markdown, a stop is a block (paragraph, list item, heading, table
  cell) containing `==…==` (markdown-it-mark), tagged by the `markdownTourSteps` markdown-it plugin;
  `**bold**` stays plain styling. The marker token type is one constant in `MarkdownRenderer.vue`.
  `<mark>` is unstyled unless its block is the active stop. The active stop is scrolled to the center
  (`block: 'center'`, which the browser clamps at the content's edges).
- While the current node streams, `SlideTextStream` keeps the newest line in view by scrolling a
  zero-height end marker with `block: 'nearest'`, at most once per frame.

### Aside panel

- `src/stores/aside.js` — `isOpen`, `activeComponent` (shallowRef), `activeProps`, `activeKey`;
  `open/close/toggle`.
  - `close()` clears the component after `ASIDE_TRANSITION_MS`, the same constant that drives the panel's
    CSS transition.
  - `open()` cancels any pending clear and bumps `activeKey`. `activeKey` is the rendered component's
    `:key`, so every opened node gets a fresh instance.
- Callers use the `useAsideService()` façade rather than the store directly.
- `AsidePanel.vue` — push layout (`w-1/3`) on `lg+`, overlay drawer with backdrop below `lg`; Escape
  closes. Both layouts render the shared `AsidePanelContent.vue` (header and body). Clicking a feed item opens `NodeDetailPanel`.

## Structure and conventions

- Path alias `@` → `src/` (configured in both `vite.config.js` and `jsconfig.json`).
- Plain JavaScript (no TypeScript), `<script setup>` SFCs, Composition API.
- Pinia stores in `src/stores/` use the setup-function style: `ref`/`computed` inside
  `defineStore(name, () => {...})`, returning the public state/actions. `counter.js` is leftover
  scaffolding.
- Reusable logic lives in `src/composables/`, API calls in `src/api/`, type-based resolution in
  `src/factories/`, and framework-free helpers in `src/utils/`.
- Comments explain _why_ (edge cases, race conditions, backend quirks) — keep that style when changing
  subtle logic.
- Unit tests live alongside features in `__tests__/` directories (e.g. `src/stores/__tests__/`,
  `src/composables/__tests__/`) and use Vitest + `@vue/test-utils`. `vitest.config.js` merges
  `vite.config.js` and excludes `e2e/**`.
- E2E tests live in top-level `e2e/`.
- Linting is layered: `eslint-plugin-oxlint` disables ESLint rules that oxlint (`.oxlintrc.json`) already
  covers, so oxlint runs first in `npm run lint`.
- Formatting: no semicolons, single quotes, 100-char print width (`.prettierrc.json`);
  `eslint-config-prettier` disables stylistic ESLint rules that would conflict with Prettier.
- `aside-panel-plan.md` is the original design plan for the aside panel (historical reference).
- `.claude/skills/` and `.agents/skills/` hold vendored agent skills (Vue, Pinia, router, testing, UI/UX) —
  not app code.

## Excluded from analysis/versioning

`ica-claude.sh` is a personal launcher script unrelated to this project (already gitignored). Ignore it when analyzing this codebase.
