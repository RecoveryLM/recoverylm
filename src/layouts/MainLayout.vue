<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useMediaQuery } from '@/composables/useMediaQuery'
import DesktopSidebar from '@/components/navigation/DesktopSidebar.vue'
import MobileHeader from '@/components/navigation/MobileHeader.vue'
import MobileBottomNav from '@/components/navigation/MobileBottomNav.vue'
import TopBar from '@/components/navigation/TopBar.vue'
import CrisisModal from '@/components/crisis/CrisisModal.vue'
import { useCrisis } from '@/composables/useCrisis'

const isMobile = useMediaQuery('(max-width: 768px)')
const { showCrisisModal } = useCrisis()
</script>

<template>
  <div class="flex h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
    <!-- Desktop Sidebar -->
    <DesktopSidebar v-if="!isMobile" />

    <!-- Main Content -->
    <main class="flex-1 flex flex-col h-full overflow-hidden relative">
      <!-- Mobile Header -->
      <MobileHeader v-if="isMobile" />

      <!-- Top Bar with SOS -->
      <TopBar />

      <!-- Route Content -->
      <div class="flex-1 overflow-hidden bg-slate-950 relative">
        <RouterView />
      </div>

      <!-- Mobile Bottom Nav -->
      <MobileBottomNav v-if="isMobile" />
    </main>

    <!-- Crisis Modal (always available) -->
    <Teleport to="body">
      <CrisisModal v-if="showCrisisModal" />
    </Teleport>
  </div>
</template>
