<script setup lang="ts">
import { ShieldAlert } from 'lucide-vue-next'
import { useCrisis } from '@/composables/useCrisis'

const { triggerCrisisProtocol } = useCrisis()

const handleSos = () => {
  triggerCrisisProtocol()
}
</script>

<template>
  <button
    @click="handleSos"
    class="bg-red-900/20 hover:bg-red-600 hover:text-white text-red-500 border border-red-900/50 px-4 py-2 rounded-md flex items-center gap-2 text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900"
    aria-label="Emergency SOS - Get crisis help"
  >
    <ShieldAlert :size="16" />
    <span class="hidden sm:inline">SOS / EMERGENCY</span>
    <span class="sm:hidden">SOS</span>
  </button>
</template>
