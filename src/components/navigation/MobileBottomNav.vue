<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { LayoutDashboard, MessageSquare, Sparkles, Activity, BookOpen, Users } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const navItems = [
  { name: 'dashboard', icon: LayoutDashboard },
  { name: 'chat', icon: MessageSquare },
  { name: 'activities', icon: Sparkles },
  { name: 'metrics', icon: Activity },
  { name: 'journal', icon: BookOpen },
  { name: 'network', icon: Users },
]

const isActive = (name: string) => route.name === name

const navigate = (name: string) => {
  router.push({ name })
}
</script>

<template>
  <div class="bg-slate-900 border-t border-slate-800 flex justify-around p-3 pb-5 safe-area-inset-bottom">
    <button
      v-for="item in navItems"
      :key="item.name"
      @click="navigate(item.name)"
      class="p-2 transition-colors"
      :class="isActive(item.name) ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'"
    >
      <component :is="item.icon" :size="24" />
    </button>
  </div>
</template>
