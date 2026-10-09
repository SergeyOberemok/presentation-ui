<script setup>
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import css from 'highlight.js/lib/languages/css'
import scss from 'highlight.js/lib/languages/scss'
import 'highlight.js/styles/github.css'

hljs.registerLanguage('json', json)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('css', css)
hljs.registerLanguage('scss', scss)

const EXTENSION_LANGUAGES = {
  json: 'json',
  js: 'javascript',
  ts: 'typescript',
  css: 'css',
  scss: 'scss',
}

const props = defineProps({
  text: { type: String, required: true },
  filename: { type: String, default: '' },
})

// markdown-it's `highlight` option is the documented connection point to
// highlight.js; we reuse it (and its escapeHtml fallback) directly instead
// of running the raw file text through a markdown fence, since the source
// content can itself contain a line of three backticks and would corrupt a
// fenced-block parse.
const md = new MarkdownIt({
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
      } catch {
        // fall through to escaped output below
      }
    }
    return md.utils.escapeHtml(str)
  },
})

const language = computed(() => {
  const ext = props.filename.split('.').pop()?.toLowerCase()
  return EXTENSION_LANGUAGES[ext] ?? ''
})

const highlightedHtml = computed(() => md.options.highlight(props.text, language.value, ''))

const safeHtml = computed(() =>
  DOMPurify.sanitize(`<pre class="hljs"><code>${highlightedHtml.value}</code></pre>`),
)
</script>

<template>
  <div
    class="code-content overflow-x-auto rounded-lg bg-slate-100 text-sm text-gray-800"
    v-html="safeHtml"
  />
</template>

<style scoped>
.code-content :deep(pre.hljs) {
  margin: 0;
  padding: 0.75em 1em;
  background-color: transparent;
  border-radius: 0.5em;
}

.code-content :deep(code) {
  font-family: ui-monospace, monospace;
}
</style>
