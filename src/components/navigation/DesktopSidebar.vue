<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import {
  Brain,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Activity,
  BookOpen,
  Users,
  Settings
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const navItems = [
  { name: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { name: 'chat', label: 'Remi', icon: MessageSquare },
  { name: 'activities', label: 'Activities', icon: Sparkles },
  { name: 'metrics', label: 'Metrics', icon: Activity },
  { name: 'journal', label: 'Journal', icon: BookOpen },
  { name: 'network', label: 'Support', icon: Users },
]

const isActive = (name: string) => route.name === name

const navigate = (name: string) => {
  router.push({ name })
}
</script>

<template>
  <aside class="flex flex-col w-64 bg-slate-900 border-r border-slate-800">
    <!-- Logo Header -->
    <div class="p-6 border-b border-slate-800">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <Brain class="text-white" :size="20" />
        </div>
        <h1 class="font-bold text-xl tracking-tight">RecoveryLM</h1>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 p-4 space-y-2">
      <button
        v-for="item in navItems"
        :key="item.name"
        @click="navigate(item.name)"
        class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all"
        :class="isActive(item.name)
          ? 'bg-slate-800 text-white border border-slate-700'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'"
      >
        <component :is="item.icon" :size="18" />
        {{ item.label }}
      </button>
    </nav>

    <!-- Settings -->
    <div class="p-4 border-t border-slate-800">
      <button
        @click="navigate('settings')"
        class="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all"
        :class="isActive('settings')
          ? 'text-white'
          : 'text-slate-400 hover:text-white'"
      >
        <Settings :size="18" />
        Settings
      </button>
    </div>
  </aside>
</template>
