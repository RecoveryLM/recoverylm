<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SosButton from '@/components/common/SosButton.vue'
import { useMediaQuery } from '@/composables/useMediaQuery'

const route = useRoute()
const isMobile = useMediaQuery('(max-width: 768px)')

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    chat: 'Remi / Chat',
    activities: 'Activities',
    metrics: 'Tools & Metrics',
    network: 'Support',
    settings: 'Settings',
  }
  return titles[route.name as string] || 'RecoveryLM'
})
</script>

<template>
  <div class="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center justify-between px-6 z-10">
    <div v-if="!isMobile">
      <h2 class="text-lg font-semibold text-white">{{ pageTitle }}</h2>
    </div>
    <div v-else class="flex-1"></div>

    <SosButton />
  </div>
</template>
