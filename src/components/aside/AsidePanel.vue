<script setup>
import { useMediaQuery, onKeyStroke } from '@vueuse/core'
import { useAsideService } from '@/composables/useAsideService'
import { ASIDE_TRANSITION_MS } from '@/stores/aside'
import AsidePanelContent from '@/components/aside/AsidePanelContent.vue'

const isLg = useMediaQuery('(min-width: 1024px)')
const { isOpen, activeComponent, activeProps, activeKey, close } = useAsideService()

// Same duration the store waits before clearing the content on close().
const transitionStyle = { transitionDuration: `${ASIDE_TRANSITION_MS}ms` }

onKeyStroke('Escape', () => {
  if (isOpen.value) close()
})
</script>

<template>
  <!-- Backdrop: mobile only, when panel is open -->
  <div v-if="!isLg && isOpen" class="fixed inset-0 z-30 bg-black/40" @click="close()" />

  <!-- lg aside: always in DOM, its width drives push-layout (0 when closed, so
       the feed gets the full width). The inner box keeps a fixed width so the
       content doesn't reflow while the width animates. aria-hidden + inert keep
       the closed panel out of the focus/AT order. -->
  <aside
    v-if="isLg"
    class="relative h-full shrink-0 overflow-hidden bg-white transition-[width] ease-in-out"
    :class="isOpen ? 'w-1/3 border-l border-gray-200' : 'w-0'"
    :style="transitionStyle"
    :aria-hidden="!isOpen || undefined"
    :inert="!isOpen || undefined"
  >
    <div class="flex h-full w-[33.3334vw] flex-col">
      <AsidePanelContent
        :component="activeComponent"
        :component-props="activeProps"
        :component-key="activeKey"
        @close="close()"
      />
    </div>
  </aside>

  <!-- Mobile aside: only mounted when there is something to show -->
  <aside
    v-if="!isLg && activeComponent"
    class="fixed inset-y-0 right-0 z-40 flex w-1/3 flex-col bg-white shadow-xl transition-transform ease-in-out"
    :class="isOpen ? 'translate-x-0' : 'translate-x-full'"
    :style="transitionStyle"
  >
    <AsidePanelContent
      :component="activeComponent"
      :component-props="activeProps"
      :component-key="activeKey"
      @close="close()"
    />
  </aside>
</template>
