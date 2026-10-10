<script setup>
defineProps({
  slide: { type: Object, default: null },
})
</script>

<template>
  <div class="p-4">
    <h2 class="mb-4 text-lg font-semibold text-gray-800">Slide Detail</h2>

    <div v-if="slide" class="space-y-3">
      <div class="rounded-lg bg-slate-100 px-4 py-3">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Index</p>
        <p class="mt-1 font-mono text-sm text-gray-800">#{{ slide.index }}</p>
      </div>
      <div class="rounded-lg bg-slate-100 px-4 py-3">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Value</p>
        <p class="mt-1 text-sm text-gray-800">{{ slide.value }}</p>
      </div>
    </div>

    <p v-else class="text-sm text-gray-400">No slide selected.</p>
  </div>
</template>
