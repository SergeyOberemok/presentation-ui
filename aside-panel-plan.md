# Aside Panel Plan

## Top-Level Overview

Add a right-side aside panel to `src/views/Main.vue`. The panel is driven by a
Pinia store + thin service layer so any component in the app can open, close, or
change the active panel content without prop-drilling. Inside the aside a
dynamic-component host renders whichever component was registered, starting with
a `NodeDetailPanel` placeholder. Tailwind CSS 4 utilities handle all layout and
animation. VueUse utilities are used wherever they map cleanly to the requirements
(`onKeyStroke` for keyboard-dismiss, `useMediaQuery` for breakpoint detection).

**Responsive behaviour**
- `lg+` screens: the aside pushes the main content (flexbox), width is `w-1/3`
  (one-third of the screen), transition on `translate`.
- Below `lg`: the aside overlays as a drawer with a backdrop (`w-1/3` minimum
  or full on very small screens), the main content does not shrink.

**Mount / unmount behaviour**
- The active component is **unmounted** when the aside closes. `close()` sets
  `isOpen` to `false` immediately; a `setTimeout` matching the transition
  duration (300 ms) clears `activeComponent` and `activeProps` after the
  slide-out animation completes so the panel does not blank before it finishes
  closing.

---

## Sub-Tasks

---

### Sub-Task 1 — Pinia aside store

**Intent**  
Create the single source of truth for panel open/close state and the currently
active dynamic component. Every other piece of code reads from or writes to this
store.

**Expected Outcomes**
- `src/stores/aside.js` exists and is importable.
- Store exposes: `isOpen` (ref bool), `activeComponent` (ref — shallowRef to
  avoid deep reactivity on component definitions), `activeProps` (ref obj).
- Store exposes actions: `open(component, props?)`, `close()`, `toggle()`.
- All state is returned from the setup-store function (Pinia DevTools
  visibility requirement).

**Todo List**
1. Create `src/stores/aside.js` as a Pinia **setup store** using
   `defineStore('aside', () => { … })`.
2. Declare `isOpen` as `ref(false)`.
3. Declare `activeComponent` as `shallowRef(null)` (avoids deep reactivity on
   component objects).
4. Declare `activeProps` as `ref({})`.
5. Implement `open(component, props = {})` — sets all three refs, sets
   `isOpen` to `true`.
6. Implement `close()` — sets `isOpen` to `false` immediately (triggers the
   slide-out animation), then after a `setTimeout(300)` clears
   `activeComponent` and `activeProps` so the component is unmounted only
   after the animation completes.
7. Implement `toggle()` — calls `close()` or `open()` based on `isOpen`.
8. Return all refs and actions.

**Relevant Context**
- Existing store pattern: `src/stores/tour.js` (setup store, returns all refs).
- Pinia skill reference: `pinia-setup-store-return-all-state.md` — all state
  must be returned for DevTools.
- Use `shallowRef` from Vue for `activeComponent` to avoid Vue warning about
  reactive component definitions.

**Status** `[x] done`

---

### Sub-Task 2 — Aside service (thin action façade)

**Intent**  
Provide a `useAsideService` composable that components import instead of
importing the store directly. This decouples callers from the store internals
and is the "service layer" mentioned in the requirements.

**Expected Outcomes**
- `src/composables/useAsideService.js` exists.
- Any component can call `asideService.open(SomeComponent, props)`,
  `asideService.close()`, or `asideService.toggle()` without knowing about
  the store.
- The composable is a thin wrapper — no extra logic, no second source of
  truth.

**Todo List**
1. Create `src/composables/useAsideService.js`.
2. Inside, instantiate `useAsideStore()` and destructure (using `storeToRefs`
   for reactive state, direct destructure for actions — avoid breaking
   reactivity).
3. Return `{ isOpen, activeComponent, activeProps, open, close, toggle }`.

**Relevant Context**
- Pinia skill: `pinia-store-destructuring-breaks-reactivity.md` — use
  `storeToRefs` for reactive properties, plain destructure for methods.
- Existing composable style: `src/composables/useGuidedTour.js`.

**Status** `[x] done`

---

### Sub-Task 3 — AsidePanel component

**Intent**  
Build the aside shell component: the sliding container with Tailwind transitions,
a close button, and the `<component :is="…">` dynamic slot. This component owns
all markup and animation; it does not contain business logic.

**Expected Outcomes**
- `src/components/aside/AsidePanel.vue` exists.
- The panel slides in/out using Tailwind `transition-transform duration-300
  ease-in-out` utilities (no custom CSS).
- On `lg+` the panel sits in the flex row with `w-1/3 shrink-0` and pushes the
  feed; it is always in the DOM but translated off-screen when closed.
- Below `lg` the panel is `fixed inset-y-0 right-0 w-1/3 z-40`, rendered only
  while `activeComponent` is non-null, with a `z-30` backdrop.
- The active component unmounts automatically once the store clears it after
  the 300 ms slide-out.
- Pressing `Escape` closes the panel (VueUse `onKeyStroke`).
- Clicking the backdrop (mobile) closes the panel.
- A close button is always visible inside the panel header.

**Todo List**
1. Create `src/components/aside/AsidePanel.vue` with `<script setup>`.
2. Import and use `useAsideService` for state and actions.
3. Use VueUse `useMediaQuery('(min-width: 1024px)')` to detect lg breakpoint.
4. Template structure:
   - Outer wrapper `<aside>` with conditional Tailwind classes:
     - lg: `relative w-1/3 shrink-0 border-l bg-white` (in-flow, always in DOM).
     - <lg: `fixed inset-y-0 right-0 w-1/3 bg-white shadow-xl z-40`
       (rendered only when `activeComponent` is non-null via `v-if`).
   - Backdrop `<div>` (only <lg, only when open): `fixed inset-0 bg-black/40
     z-30` with click → `close()`.
   - Panel header with a close `<button>` calling `close()`.
   - Panel body: `<component :is="activeComponent" v-bind="activeProps" />`.
5. Apply Tailwind transition utilities for the slide animation:
   - Use `transition-transform duration-300 ease-in-out`.
   - Bind `translate-x-full` when `!isOpen`, `translate-x-0` when `isOpen`.
   - On lg: `<aside>` is always mounted; translate drives the push effect.
   - On <lg: `<aside>` is `v-if="activeComponent"` to avoid a permanent
     off-screen fixed element on mobile.
6. Wire `onKeyStroke('Escape', close)` from VueUse (`@vueuse/core`).
7. Ensure the component uses `<script setup>` (Composition API, no Options API).

**Relevant Context**
- Vue best-practices skill: `<Transition>` built-in can wrap the aside for
  enter/leave if translate-class approach is insufficient.
- VueUse `onKeyStroke`, `useMediaQuery` — already installed via `@vueuse/core`.
- Tailwind 4: no config file needed; utilities work out of the box via
  `@import "tailwindcss"` in `src/styles.css`.
- Width is fixed at `w-1/3` (one-third viewport width) on all sizes, not
  resizable.

**Status** `[x] done`

---

### Sub-Task 4 — NodeDetailPanel placeholder component

**Intent**  
Create a minimal placeholder component that demonstrates the dynamic slot working
end-to-end. It receives a `node` prop so it can eventually show real node detail.

**Expected Outcomes**
- `src/components/aside/NodeDetailPanel.vue` exists.
- Accepts optional `node` prop (object, default null).
- Renders a readable placeholder with the node data or a "No node selected"
  message.
- No store imports — pure presentational component.

**Todo List**
1. Create `src/components/aside/NodeDetailPanel.vue` with `<script setup>`.
2. Define prop `node` (type Object, default null) with `defineProps`.
3. Render a simple layout: heading "Node Detail", and either the node data
   or a fallback message.

**Relevant Context**
- Vue best-practices: pure presentational component, no store access.

**Status** `[x] done`

---

### Sub-Task 5 — Wire aside into Main.vue

**Intent**  
Add `AsidePanel` to `Main.vue` in a flex row alongside `InfiniteNodeFeed`, so the
aside actually appears in the layout and pushes content on large screens.

**Expected Outcomes**
- `Main.vue` wraps `InfiniteNodeFeed` and `AsidePanel` in a flex row.
- On large screens, opening the aside visually narrows the feed and the aside
  slides in from the right.
- On small screens, the aside overlays as a drawer without shrinking the feed.
- The view is still a thin composition surface (no feature logic lives here).

**Todo List**
1. Update `src/views/Main.vue`:
   - Import `AsidePanel` from `@/components/aside/AsidePanel.vue`.
   - Wrap everything in `<div class="flex h-screen w-full overflow-hidden">`.
   - Place `<InfiniteNodeFeed />` with `class="flex-1 min-w-0"` (takes
     remaining space).
   - Place `<AsidePanel />` after it.
2. Update `src/components/nodes/InfiniteNodeFeed.vue`: change root div class
   from `h-screen w-full overflow-y-auto` to `h-full w-full overflow-y-auto`
   so the scroll container fills its flex item rather than the full viewport.

**Relevant Context**
- `src/views/Main.vue` — currently only renders `InfiniteNodeFeed`.
- `src/components/nodes/InfiniteNodeFeed.vue` root div uses `h-screen`; this
  must become `h-full` once it is a flex child.

**Status** `[x] done`

---

### Sub-Task 6 — Demo: open the aside from an existing component

**Intent**
Prove the store → service wire-up works end-to-end by adding a small trigger
inside `InfiniteNodeFeed.vue` that opens the aside with `NodeDetailPanel` and
passes the node's data as props. This sub-task is optional for initial
delivery but validates the full chain.

**Expected Outcomes**
- Clicking a node `<li>` in the feed opens the aside panel showing
  `NodeDetailPanel` with that node's data.
- Any other component in the app could do the same using `useAsideService`.

**Todo List**
1. In `src/components/nodes/InfiniteNodeFeed.vue`, import `useAsideService`
   and `NodeDetailPanel`.
2. Call `const asideService = useAsideService()` in `<script setup>`.
3. Add `@click="() => asideService.open(NodeDetailPanel, { node: item })"` to
   each `<li>` element. Add `cursor-pointer` Tailwind class to signal
   clickability.
4. Keep the change minimal — one import, one composable call, one event binding.

**Relevant Context**
- `src/components/nodes/InfiniteNodeFeed.vue` — the `<li>` elements iterate
  `items`; `item` contains `index` and `value`.

**Status** `[x] done`
