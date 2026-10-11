<script setup>
import MarkdownRenderer from '@/components/slides/renderers/MarkdownRenderer.vue'

// `value` is markdown. Plain strings render as a single paragraph. A text
// slide has no tour stops, so the renderer's `steps` event is ignored.
const { value } = defineProps({
  value: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <MarkdownRenderer :text="value" />
</template>
