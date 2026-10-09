<script setup>
defineProps({
  text: { type: String, required: true },
  filename: { type: String, default: '' },
})
</script>

<template>
  <div class="rounded-lg bg-slate-100 px-4 py-3">
    <pre class="whitespace-pre-wrap break-words font-mono text-sm text-gray-800">{{ text }}</pre>
  </div>
</template>
