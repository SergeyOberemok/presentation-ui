<script setup>
// Header + scrollable body of the aside, shared by the desktop (push) and
// mobile (overlay) shells in AsidePanel.vue.
defineProps({
  component: { type: [Object, Function], default: null },
  componentProps: { type: Object, default: () => ({}) },
  // Forces a fresh component instance per opened slide - see aside store.
  componentKey: { type: [Number, String], default: undefined },
})

const emit = defineEmits(['close'])
</script>

<template>
  <div class="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
    <h2 class="text-sm font-semibold text-gray-700">Details</h2>
    <button
      class="text-lg leading-none text-gray-500 hover:text-gray-700"
      aria-label="Close panel"
      @click="emit('close')"
    >
      &times;
    </button>
  </div>
  <div data-aside-body class="flex-1 overflow-y-auto p-4">
    <component :is="component" v-if="component" :key="componentKey" v-bind="componentProps" />
  </div>
</template>
