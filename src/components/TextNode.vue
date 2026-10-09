<script setup>
const { value } = defineProps({
  value: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <div>{{ value }}</div>
</template>
