<script setup>
defineProps({
  node: { type: Object, default: null },
})
</script>

<template>
  <div class="p-4">
    <h2 class="mb-4 text-lg font-semibold text-gray-800">Node Detail</h2>

    <div v-if="node" class="space-y-3">
      <div class="rounded-lg bg-slate-100 px-4 py-3">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Index</p>
        <p class="mt-1 font-mono text-sm text-gray-800">#{{ node.index }}</p>
      </div>
      <div class="rounded-lg bg-slate-100 px-4 py-3">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Value</p>
        <p class="mt-1 text-sm text-gray-800">{{ node.value }}</p>
      </div>
    </div>

    <p v-else class="text-sm text-gray-400">No node selected.</p>
  </div>
</template>
