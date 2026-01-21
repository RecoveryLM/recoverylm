<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useAutoLock } from '@/composables/useAutoLock'

// Initialize auto-lock globally - it will only be active when vault is unlocked
useAutoLock()
</script>

<template>
  <RouterView />
</template>
