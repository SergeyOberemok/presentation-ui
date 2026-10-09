<script setup>
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const props = defineProps({
  text: { type: String, required: true },
  filename: { type: String, default: '' },
})

const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

const safeHtml = computed(() => DOMPurify.sanitize(md.render(props.text)))
</script>

<template>
  <div class="markdown-content rounded-lg bg-slate-100 px-4 py-3 text-sm text-gray-800" v-html="safeHtml" />
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
