<script setup>
import { useMediaQuery, onKeyStroke } from '@vueuse/core'
import { useAsideService } from '@/composables/useAsideService'

const isLg = useMediaQuery('(min-width: 1024px)')
const { isOpen, activeComponent, activeProps, close } = useAsideService()

// Finding #4: only close when the panel is actually open.
onKeyStroke('Escape', () => { if (isOpen.value) close() })
</script>

<template>
  <!-- Backdrop: mobile only, when panel is open -->
  <div
    v-if="!isLg && isOpen"
    class="fixed inset-0 bg-black/40 z-30"
    @click="close()"
  />

  <!-- lg aside: always in DOM, translate drives push-layout -->
  <!-- Finding #8: aria-hidden + inert keep closed panel out of focus/AT order -->
  <aside
    v-if="isLg"
    class="relative w-1/3 shrink-0 flex flex-col h-full border-l border-gray-200 bg-white transition-transform duration-300 ease-in-out"
    :class="isOpen ? 'translate-x-0' : 'translate-x-full'"
    :aria-hidden="!isOpen || undefined"
    :inert="!isOpen || undefined"
  >
    <!-- Finding #5: header is shrink-0 so body can flex-1 to fill the remainder -->
    <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3 shrink-0">
      <h2 class="text-sm font-semibold text-gray-700">Details</h2>
      <!-- Finding #7: aria-label for screen readers -->
      <button class="text-gray-500 hover:text-gray-700 text-lg leading-none" aria-label="Close panel" @click="close()">&times;</button>
    </div>
    <div class="flex-1 overflow-y-auto p-4">
      <component v-if="activeComponent" :is="activeComponent" v-bind="activeProps" />
    </div>
  </aside>

  <!-- Mobile aside: only mounted when activeComponent is set -->
  <aside
    v-if="!isLg && activeComponent"
    class="fixed inset-y-0 right-0 w-1/3 flex flex-col bg-white shadow-xl z-40 transition-transform duration-300 ease-in-out"
    :class="isOpen ? 'translate-x-0' : 'translate-x-full'"
  >
    <!-- Finding #5: same flex-column pattern for mobile -->
    <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3 shrink-0">
      <h2 class="text-sm font-semibold text-gray-700">Details</h2>
      <!-- Finding #7: aria-label for screen readers -->
      <button class="text-gray-500 hover:text-gray-700 text-lg leading-none" aria-label="Close panel" @click="close()">&times;</button>
    </div>
    <div class="flex-1 overflow-y-auto p-4">
      <!-- Finding #6: consistent v-if guard matches lg aside -->
      <component v-if="activeComponent" :is="activeComponent" v-bind="activeProps" />
    </div>
  </aside>
</template>
