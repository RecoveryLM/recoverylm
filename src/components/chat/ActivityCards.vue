<script setup lang="ts">
import {
  ClipboardCheck,
  ScrollText,
  ShieldAlert,
  Scale,
  Users,
  Columns2,
  FastForward,
  Waves
} from 'lucide-vue-next'
import type { Component } from 'vue'

const emit = defineEmits<{
  select: [activityKey: string, prompt: string]
}>()

interface Activity {
  key: string
  name: string
  description: string
  icon: Component
  color: string
  prompt: string
}

const activities: Activity[] = [
  {
    key: 'checkin',
    name: 'Daily Check-In',
    description: 'Track your mood, habits, and sobriety',
    icon: ClipboardCheck,
    color: 'emerald',
    prompt: "I'd like to do my daily check-in"
  },
  {
    key: 'commitment',
    name: 'Commitment Statement',
    description: 'Review why you chose recovery',
    icon: ScrollText,
    color: 'indigo',
    prompt: "I want to review my commitment statement"
  },
  {
    key: 'dents',
    name: 'DENTS Protocol',
    description: 'Manage an urge with this 10-min technique',
    icon: ShieldAlert,
    color: 'indigo',
    prompt: "I'm having an urge and need to use the DENTS protocol"
  },
  {
    key: 'evidence',
    name: 'Evidence Examination',
    description: 'Challenge a negative thought with CBT',
    icon: Scale,
    color: 'purple',
    prompt: "I have a thought I'd like to examine using the evidence technique"
  },
  {
    key: 'stoic',
    name: 'Dichotomy of Control',
    description: 'Sort what you can and cannot control',
    icon: Columns2,
    color: 'cyan',
    prompt: "I want to work through the dichotomy of control exercise"
  },
  {
    key: 'tape',
    name: 'Play the Tape Forward',
    description: 'Visualize consequences of giving in',
    icon: FastForward,
    color: 'amber',
    prompt: "I need to play the tape forward"
  },
  {
    key: 'urgesurf',
    name: 'Urge Surfing',
    description: 'Guided meditation to ride out an urge',
    icon: Waves,
    color: 'blue',
    prompt: "I'd like to do an urge surfing session"
  },
  {
    key: 'network',
    name: 'Support Network',
    description: 'View or reach out to your support people',
    icon: Users,
    color: 'pink',
    prompt: "Show me my support network"
  }
]

const handleSelect = (activity: Activity) => {
  emit('select', activity.key, activity.prompt)
}

const getColorClasses = (color: string) => {
  const colorMap: Record<string, { bg: string; border: string; text: string; hover: string }> = {
    emerald: {
      bg: 'bg-emerald-900/20',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      hover: 'hover:border-emerald-500/50 hover:bg-emerald-900/30'
    },
    indigo: {
      bg: 'bg-indigo-900/20',
      border: 'border-indigo-500/30',
      text: 'text-indigo-400',
      hover: 'hover:border-indigo-500/50 hover:bg-indigo-900/30'
    },
    purple: {
      bg: 'bg-purple-900/20',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
      hover: 'hover:border-purple-500/50 hover:bg-purple-900/30'
    },
    cyan: {
      bg: 'bg-cyan-900/20',
      border: 'border-cyan-500/30',
      text: 'text-cyan-400',
      hover: 'hover:border-cyan-500/50 hover:bg-cyan-900/30'
    },
    amber: {
      bg: 'bg-amber-900/20',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      hover: 'hover:border-amber-500/50 hover:bg-amber-900/30'
    },
    blue: {
      bg: 'bg-blue-900/20',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      hover: 'hover:border-blue-500/50 hover:bg-blue-900/30'
    },
    pink: {
      bg: 'bg-pink-900/20',
      border: 'border-pink-500/30',
      text: 'text-pink-400',
      hover: 'hover:border-pink-500/50 hover:bg-pink-900/30'
    }
  }
  return colorMap[color] || colorMap.indigo
}
</script>

<template>
  <div class="w-full max-w-lg">
    <p class="text-slate-400 text-sm text-center mb-4">
      Or choose an activity to get started:
    </p>
    <div class="grid grid-cols-2 gap-3">
      <button
        v-for="activity in activities"
        :key="activity.key"
        @click="handleSelect(activity)"
        class="p-3 rounded-lg border transition-all text-left"
        :class="[
          getColorClasses(activity.color).bg,
          getColorClasses(activity.color).border,
          getColorClasses(activity.color).hover
        ]"
      >
        <div class="flex items-start gap-3">
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            :class="getColorClasses(activity.color).bg"
          >
            <component
              :is="activity.icon"
              :size="18"
              :class="getColorClasses(activity.color).text"
            />
          </div>
          <div class="min-w-0">
            <div
              class="font-medium text-sm"
              :class="getColorClasses(activity.color).text"
            >
              {{ activity.name }}
            </div>
            <p class="text-slate-500 text-xs mt-0.5 line-clamp-2">
              {{ activity.description }}
            </p>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>
