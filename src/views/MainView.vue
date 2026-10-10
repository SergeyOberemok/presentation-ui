<script setup>
import InfiniteNodeFeed from '@/components/nodes/InfiniteNodeFeed.vue'
import AsidePanel from '@/components/aside/AsidePanel.vue'
</script>

<template>
  <div class="flex h-screen w-full overflow-hidden">
    <InfiniteNodeFeed class="flex-1 min-w-0" />
    <AsidePanel />
  </div>
</template>
