<script setup>
import { defineProps, ref, watch } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  title: { type: String, default: null },
})

const failed = ref(false)

// A new src gets a fresh attempt.
watch(
  () => props.src,
  () => (failed.value = false),
)
</script>

<template>
  <figure class="flex flex-col items-center gap-2">
    <!-- 85cqh: sized to the feed's visible area (the <li>'s size container),
         leaving room for the caption so the whole slide fits on one screen. -->
    <img
      v-if="!failed"
      :src="src"
      :alt="title ?? ''"
      loading="lazy"
      class="max-h-[85cqh] max-w-full rounded-lg object-contain"
      @error="failed = true"
    />
    <p v-else role="alert" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-500">
      Image failed to load.
    </p>
    <figcaption v-if="title" class="text-sm text-gray-500">{{ title }}</figcaption>
  </figure>
</template>
