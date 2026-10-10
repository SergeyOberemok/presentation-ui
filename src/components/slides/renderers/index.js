import PlainTextRenderer from './PlainTextRenderer.vue'
import MarkdownRenderer from './MarkdownRenderer.vue'
import CodeRenderer from './CodeRenderer.vue'

// Renderer contract. Every renderer takes `{ text, filename }`. A renderer can
// also define tour stops inside its content:
// - it emits `steps` (a count) whenever its content changes;
// - it takes `activeStep` (a stop index or null), highlights that stop, and
//   scrolls it into view.
// SlideTextStream walks those stops with the arrow keys before fetching the
// next chunk. A renderer that never emits `steps` has no stops (CodeRenderer,
// PlainTextRenderer). Each renderer decides what a stop is. For markdown, it's
// a block containing ==highlight== (see markdownTourSteps.js).
const RENDERERS = {
  md: MarkdownRenderer,
  json: CodeRenderer,
  js: CodeRenderer,
  ts: CodeRenderer,
  css: CodeRenderer,
  scss: CodeRenderer,
}

export function resolveSlideRenderer(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase()
  return RENDERERS[ext] ?? PlainTextRenderer
}
