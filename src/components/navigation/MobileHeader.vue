<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Brain, Menu, X } from 'lucide-vue-next'

const router = useRouter()
const isMobileMenuOpen = ref(false)

const navItems = [
  { name: 'dashboard', label: 'Dashboard' },
  { name: 'chat', label: 'Chat' },
  { name: 'metrics', label: 'Metrics' },
  { name: 'network', label: 'Network' },
  { name: 'settings', label: 'Settings' },
]

const navigate = (name: string) => {
  router.push({ name })
  isMobileMenuOpen.value = false
}
</script>

<template>
  <header class="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
        <Brain class="text-white" :size="20" />
      </div>
      <span class="font-bold">RecoveryLM</span>
    </div>
    <button
      @click="isMobileMenuOpen = !isMobileMenuOpen"
      class="text-slate-300 p-2"
    >
      <X v-if="isMobileMenuOpen" :size="24" />
      <Menu v-else :size="24" />
    </button>
  </header>

  <!-- Mobile Menu Overlay -->
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div
      v-if="isMobileMenuOpen"
      class="absolute top-16 left-0 w-full bg-slate-900 border-b border-slate-800 z-50 p-4 shadow-xl"
    >
      <nav class="space-y-2">
        <button
          v-for="item in navItems"
          :key="item.name"
          @click="navigate(item.name)"
          class="block w-full text-left p-3 text-slate-300 capitalize bg-slate-800 rounded hover:bg-slate-700 transition-colors"
        >
          {{ item.label }}
        </button>
      </nav>
    </div>
  </Transition>
</template>
