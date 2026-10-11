<script setup>
import { usePresenterControls } from '@/composables/usePresenterControls'

const { isBlank } = usePresenterControls()
</script>

<template>
  <!-- Above the aside drawer and its backdrop (z-30/40). -->
  <div v-if="isBlank" data-presenter-blank class="fixed inset-0 z-50 bg-black" aria-hidden="true" />
</template>
