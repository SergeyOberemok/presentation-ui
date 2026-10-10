<script setup>
import { computed, useTemplateRef, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import markdownItMark from 'markdown-it-mark'
import DOMPurify from 'dompurify'
import { TOUR_STEP_ATTR, markdownTourSteps } from './markdownTourSteps'

// Token type that marks a tour stop: ==text==, parsed by markdown-it-mark
// into <mark>. A dedicated marker keeps **bold** free for plain styling.
const TOUR_STEP_MARKER = 'mark_open'

const props = defineProps({
  text: { type: String, required: true },
  filename: { type: String, default: '' },
  // Index of the highlighted tour stop, or null for none. See the renderer contract in ./index.js.
  activeStep: { type: Number, default: null },
})

const emit = defineEmits(['steps'])

// markdown-it-mark goes first, so its inline rule has produced mark_open
// tokens by the time the tour-steps core rule runs.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true })
  .use(markdownItMark)
  .use(markdownTourSteps, { marker: TOUR_STEP_MARKER })

// One parse gives both the HTML and the stop count. The plugin writes the
// count into env.
const rendered = computed(() => {
  const env = { activeStep: props.activeStep }
  const html = DOMPurify.sanitize(md.render(props.text, env))
  return { html, stepCount: env.stepCount ?? 0 }
})

watch(
  () => rendered.value.stepCount,
  (count) => emit('steps', count),
  { immediate: true },
)

const root = useTemplateRef('root')

// Centers the active stop in its scroll container (the feed or the aside
// body), the same way the tour brings a slide into view. The browser clamps
// 'center' to the scroll range, so a stop near the top or bottom of the
// content just gets highlighted without being forced to the middle.
// flush: 'post' so the new active class is already in the DOM.
watch(
  () => props.activeStep,
  (step) => {
    if (step == null) return
    root.value
      ?.querySelector(`[${TOUR_STEP_ATTR}="${step}"]`)
      ?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  },
  { flush: 'post' },
)
</script>

<template>
  <div
    ref="root"
    class="markdown-content rounded-lg bg-slate-100 px-4 py-3 text-sm text-gray-800"
    v-html="rendered.html"
  />
</template>

<style scoped>
.markdown-content :deep(h1) {
  margin: 0.6em 0 0.4em;
  font-size: 1.4em;
  font-weight: 600;
}

.markdown-content :deep(h2) {
  margin: 0.6em 0 0.4em;
  font-size: 1.2em;
  font-weight: 600;
}

.markdown-content :deep(h3) {
  margin: 0.6em 0 0.4em;
  font-size: 1.1em;
  font-weight: 600;
}

.markdown-content :deep(p) {
  margin: 0.5em 0;
  line-height: 1.6;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.markdown-content :deep(li) {
  margin: 0.2em 0;
  line-height: 1.6;
}

.markdown-content :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}

.markdown-content :deep(code) {
  font-family: ui-monospace, monospace;
  background-color: rgb(226 232 240);
  border-radius: 0.25em;
  padding: 0.15em 0.35em;
  font-size: 0.9em;
}

.markdown-content :deep(pre) {
  background-color: rgb(226 232 240);
  border-radius: 0.5em;
  padding: 0.75em 1em;
  overflow-x: auto;
  margin: 0.5em 0;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.markdown-content :deep(blockquote) {
  margin: 0.5em 0;
  padding-left: 1em;
  border-left: 3px solid rgb(148 163 184);
  color: rgb(71 85 105);
}

.markdown-content :deep([data-tour-step]) {
  border-radius: 0.25em;
  transition:
    background-color 150ms ease,
    box-shadow 150ms ease;
}

.markdown-content :deep(.tour-step-active) {
  background-color: rgb(254 243 199);
  box-shadow: 0 0 0 0.25em rgb(254 243 199);
}

/* ==marks== read as plain text until the tour reaches their block. */
.markdown-content :deep(mark) {
  background-color: transparent;
  color: inherit;
  border-radius: 0.2em;
  transition: background-color 150ms ease;
}

.markdown-content :deep(.tour-step-active mark) {
  background-color: rgb(253 230 138);
}

.markdown-content :deep(table) {
  border-collapse: collapse;
  margin: 0.5em 0;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid rgb(203 213 225);
  padding: 0.4em 0.6em;
}
</style>
