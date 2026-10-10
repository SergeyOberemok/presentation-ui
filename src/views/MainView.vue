<script setup>
import InfiniteSlideFeed from '@/components/feed/InfiniteSlideFeed.vue'
import AsidePanel from '@/components/aside/AsidePanel.vue'
</script>

<template>
  <div class="flex h-screen w-full overflow-hidden">
    <InfiniteSlideFeed class="flex-1 min-w-0" />
    <AsidePanel />
  </div>
</template>
