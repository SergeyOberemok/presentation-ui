# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vue 3 + Vite SPA scaffolded from `create-vue`, using Pinia for state and Vue Router for routing. Styling is Tailwind CSS v4 (via `@tailwindcss/vite`, imported in `src/styles.css`). The app is currently just the generated template (`src/App.vue`) — no custom pages/components exist yet.

## Commands

- `npm run dev` — start the Vite dev server.
- `npm run build` — production build.
- `npm run preview` — preview the production build.
- `npm run test:unit` — run Vitest unit tests (jsdom environment). Run a single file with `npm run test:unit -- src/__tests__/App.spec.js`.
- `npm run test:e2e` — run Playwright e2e tests against `e2e/**`. First run `npx playwright install`. Run a single file with `npm run test:e2e -- e2e/vue.spec.js`; add `--project=chromium` to limit to one browser, `--debug` to debug. On CI, build first (`npm run build`) since Playwright's `webServer` uses `npm run preview` when `CI` is set, otherwise it reuses `npm run dev`.
- `npm run lint` — runs oxlint then eslint (both with `--fix`), via `npm-run-all2`. Run them individually as `npm run lint:oxlint` / `npm run lint:eslint`.
- `npm run format` — Prettier write over `src/`.

## Structure and conventions

- Path alias `@` → `src/` (configured in both `vite.config.js` and `jsconfig.json`).
- Pinia stores live in `src/stores/` using the setup-function style (see `src/stores/counter.js`): `ref`/`computed` inside `defineStore(name, () => {...})`, returning the public state/actions.
- Router is defined in `src/router/index.js`; routes array is currently empty.
- Unit tests live alongside features in `__tests__/` directories (e.g. `src/__tests__/`) and use Vitest + `@vue/test-utils`. `vitest.config.js` merges `vite.config.js` and excludes `e2e/**`.
- E2E tests live in top-level `e2e/`.
- Linting is layered: `eslint-plugin-oxlint` disables ESLint rules that oxlint (`.oxlintrc.json`) already covers, so oxlint runs first in `npm run lint`.
- Formatting: no semicolons, single quotes, 100-char print width (`.prettierrc.json`); `eslint-config-prettier` disables stylistic ESLint rules that would conflict with Prettier.

## Excluded from analysis/versioning

`ica-claude.sh` is a personal launcher script unrelated to this project (already gitignored). Ignore it when analyzing this codebase.
