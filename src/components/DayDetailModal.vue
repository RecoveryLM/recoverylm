<script setup lang="ts">
import { computed } from 'vue'
import { X, Calendar, Smile, Moon, Brain, Heart, CheckCircle2, XCircle } from 'lucide-vue-next'
import type { DailyMetric, MetricDefinition } from '@/types'

const props = defineProps<{
  date: string
  metric: DailyMetric | null
  enabledMetrics: MetricDefinition[]
}>()

const emit = defineEmits<{
  close: []
}>()

// Format date for display
const formattedDate = computed(() => {
  const date = new Date(props.date + 'T12:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
})

// Get mood emoji based on score
const moodEmoji = computed(() => {
  if (!props.metric?.moodScore) return null
  const score = props.metric.moodScore
  if (score >= 9) return '😄'
  if (score >= 7) return '🙂'
  if (score >= 5) return '😐'
  if (score >= 3) return '😔'
  return '😢'
})

// Boolean metrics with their values
const booleanMetricValues = computed(() => {
  if (!props.metric) return []

  const defaultMetricIds = ['sobrietyMaintained', 'exercise', 'meditation', 'study', 'healthyEating', 'connectionTime', 'cbtPractice']

  return props.enabledMetrics
    .filter(m => m.type === 'boolean')
    .map(m => {
      let value = false
      if (defaultMetricIds.includes(m.id)) {
        value = props.metric?.[m.id as keyof DailyMetric] === true
      } else {
        value = props.metric?.customMetrics?.[m.id] === true
      }
      return { ...m, value }
    })
})

// Scale metrics (sleep, anxiety, craving)
const scaleMetrics = computed(() => {
  if (!props.metric) return []

  const scales: Array<{ id: string; label: string; icon: typeof Moon; value: number | undefined; max: number }> = [
    { id: 'sleepQuality', label: 'Sleep Quality', icon: Moon, value: props.metric.sleepQuality, max: 10 },
    { id: 'anxietyLevel', label: 'Anxiety Level', icon: Brain, value: props.metric.anxietyLevel, max: 10 },
    { id: 'cravingIntensity', label: 'Craving Intensity', icon: Heart, value: props.metric.cravingIntensity, max: 10 }
  ]

  return scales.filter(s => s.value !== undefined)
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/70 backdrop-blur-sm"
        @click="emit('close')"
      ></div>

      <!-- Modal -->
      <div class="relative bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in">
        <!-- Header -->
        <div class="sticky top-0 bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Calendar :size="18" class="text-indigo-400" />
            <h2 class="font-semibold text-white">{{ formattedDate }}</h2>
          </div>
          <button
            @click="emit('close')"
            class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X :size="20" />
          </button>
        </div>

        <!-- Content -->
        <div class="p-4">
          <!-- Empty state -->
          <div v-if="!metric" class="py-8 text-center">
            <div class="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar :size="24" class="text-slate-500" />
            </div>
            <p class="text-slate-400 text-sm">No data recorded for this day</p>
          </div>

          <!-- Has data -->
          <div v-else class="space-y-5">
            <!-- Mood Score -->
            <div v-if="metric.moodScore" class="bg-slate-700/50 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Smile :size="18" class="text-amber-400" />
                  <span class="text-sm font-medium text-slate-300">Mood Score</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-2xl">{{ moodEmoji }}</span>
                  <span class="text-xl font-bold text-white">{{ metric.moodScore }}/10</span>
                </div>
              </div>
            </div>

            <!-- Boolean Metrics Grid -->
            <div v-if="booleanMetricValues.length > 0">
              <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily Habits</h3>
              <div class="grid grid-cols-2 gap-2">
                <div
                  v-for="m in booleanMetricValues"
                  :key="m.id"
                  class="flex items-center gap-2 p-2 rounded-lg"
                  :class="m.value ? 'bg-emerald-900/30' : 'bg-slate-700/30'"
                >
                  <span class="text-lg">{{ m.icon }}</span>
                  <span class="text-sm text-slate-300 flex-1 truncate">{{ m.label }}</span>
                  <CheckCircle2 v-if="m.value" :size="16" class="text-emerald-400 flex-shrink-0" />
                  <XCircle v-else :size="16" class="text-slate-500 flex-shrink-0" />
                </div>
              </div>
            </div>

            <!-- Scale Metrics -->
            <div v-if="scaleMetrics.length > 0">
              <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Scales</h3>
              <div class="space-y-3">
                <div
                  v-for="s in scaleMetrics"
                  :key="s.id"
                  class="bg-slate-700/30 rounded-lg p-3"
                >
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <component :is="s.icon" :size="16" class="text-slate-400" />
                      <span class="text-sm text-slate-300">{{ s.label }}</span>
                    </div>
                    <span class="text-sm font-mono font-bold text-white">{{ s.value }}/{{ s.max }}</span>
                  </div>
                  <div class="h-2 bg-slate-600 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all"
                      :class="{
                        'bg-emerald-500': s.id === 'sleepQuality' && (s.value ?? 0) >= 7,
                        'bg-amber-500': s.id === 'sleepQuality' && (s.value ?? 0) >= 5 && (s.value ?? 0) < 7,
                        'bg-red-500': s.id === 'sleepQuality' && (s.value ?? 0) < 5,
                        'bg-indigo-500': s.id !== 'sleepQuality'
                      }"
                      :style="{ width: `${((s.value ?? 0) / s.max) * 100}%` }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div v-if="metric.notes">
              <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Notes</h3>
              <div class="bg-slate-700/30 rounded-lg p-3">
                <p class="text-sm text-slate-300 whitespace-pre-wrap">{{ metric.notes }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
