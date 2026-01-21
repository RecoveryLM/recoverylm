<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown, ChevronUp, ShieldAlert, Waves, FastForward } from 'lucide-vue-next'
import type { WidgetId } from '@/types'

const emit = defineEmits<{
  (e: 'open-activity', activityId: WidgetId): void
}>()

const isExpanded = ref(false)

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

interface QuickAccessActivity {
  id: WidgetId
  name: string
  description: string
  icon: typeof ShieldAlert
}

const crisisActivities: QuickAccessActivity[] = [
  {
    id: 'W_DENTS',
    name: 'DENTS Protocol',
    description: 'Quick urge management',
    icon: ShieldAlert
  },
  {
    id: 'W_URGESURF',
    name: 'Urge Surfing',
    description: 'Ride out the wave',
    icon: Waves
  },
  {
    id: 'W_TAPE',
    name: 'Play the Tape',
    description: 'See consequences',
    icon: FastForward
  }
]

const openActivity = (activityId: WidgetId) => {
  emit('open-activity', activityId)
}
</script>

<template>
  <section
    class="rounded-xl border overflow-hidden transition-all duration-300"
    :class="isExpanded
      ? 'bg-gradient-to-r from-red-900/30 to-amber-900/30 border-amber-500/40'
      : 'bg-slate-800/50 border-slate-700/50 hover:border-amber-500/30'"
  >
    <!-- Collapsed Header / Toggle -->
    <button
      @click="toggleExpanded"
      class="w-full flex items-center justify-between p-4 text-left transition-colors"
      :aria-expanded="isExpanded"
      aria-controls="crisis-quick-access-content"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-8 h-8 rounded-lg flex items-center justify-center"
          :class="isExpanded ? 'bg-amber-500/20' : 'bg-slate-700/50'"
        >
          <ShieldAlert :size="18" class="text-amber-400" />
        </div>
        <span class="font-medium" :class="isExpanded ? 'text-amber-100' : 'text-slate-300'">
          Struggling right now? Get help fast
        </span>
      </div>
      <component
        :is="isExpanded ? ChevronUp : ChevronDown"
        :size="20"
        class="text-slate-400 transition-transform"
      />
    </button>

    <!-- Expanded Content -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-48"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 max-h-48"
      leave-to-class="opacity-0 max-h-0"
    >
      <div
        v-show="isExpanded"
        id="crisis-quick-access-content"
        class="overflow-hidden"
      >
        <div class="px-4 pb-4 grid grid-cols-3 gap-3">
          <button
            v-for="activity in crisisActivities"
            :key="activity.id"
            @click="openActivity(activity.id)"
            class="p-3 rounded-lg bg-slate-900/50 border border-amber-500/20 hover:border-amber-500/50 hover:bg-slate-900/70 transition-all text-center"
          >
            <div class="w-10 h-10 mx-auto rounded-lg bg-amber-500/10 flex items-center justify-center mb-2">
              <component :is="activity.icon" :size="20" class="text-amber-400" />
            </div>
            <div class="text-sm font-medium text-white">{{ activity.name }}</div>
            <div class="text-xs text-slate-400 mt-0.5">{{ activity.description }}</div>
          </button>
        </div>
      </div>
    </Transition>
  </section>
</template>
