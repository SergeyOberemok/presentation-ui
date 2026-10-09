import PlainTextRenderer from './PlainTextRenderer.vue'
import MarkdownRenderer from './MarkdownRenderer.vue'
import CodeRenderer from './CodeRenderer.vue'

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
