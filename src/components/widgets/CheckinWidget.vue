<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ClipboardCheck, Smile, Moon, Brain, Heart, CheckCircle2 } from 'lucide-vue-next'
import type { DailyMetric, MetricDefinition } from '@/types'
import { today, DEFAULT_METRICS } from '@/types'
import { useVault } from '@/composables/useVault'

const props = withDefaults(defineProps<{
  date?: string
}>(), {
  date: today()
})

const emit = defineEmits<{
  complete: [{ success: boolean; metric: DailyMetric }]
}>()

const { getMetricsConfig, saveMetric } = useVault()

const isLoading = ref(true)
const isComplete = ref(false)
const isSaving = ref(false)
const isSaved = ref(false)
const saveError = ref<string | null>(null)
const enabledMetrics = ref<MetricDefinition[]>([])

const metric = ref<DailyMetric>({
  date: props.date,
  sobrietyMaintained: true,
  exercise: false,
  meditation: false,
  study: false,
  healthyEating: false,
  connectionTime: false,
  cbtPractice: false,
  moodScore: 5,
  sleepQuality: undefined,
  anxietyLevel: undefined,
  cravingIntensity: undefined,
  notes: '',
  customMetrics: {}
})

// Default metric IDs that map to DailyMetric properties
const defaultMetricIds = ['sobrietyMaintained', 'exercise', 'meditation', 'study', 'healthyEating', 'connectionTime', 'cbtPractice']

// Load metrics config on mount
onMounted(async () => {
  try {
    const config = await getMetricsConfig()
    if (config.metrics.length > 0) {
      enabledMetrics.value = config.metrics.filter(m => m.enabled)
    } else {
      enabledMetrics.value = DEFAULT_METRICS.filter(m => m.enabled)
    }
  } catch (error) {
    console.error('Failed to load metrics config:', error)
    enabledMetrics.value = DEFAULT_METRICS.filter(m => m.enabled)
  } finally {
    isLoading.value = false
  }
})

// Filter to get habit metrics (non-sobriety boolean metrics)
const habitMetrics = computed(() => {
  return enabledMetrics.value.filter(m => m.id !== 'sobrietyMaintained' && m.type === 'boolean')
})

// Filter to get scale metrics
const scaleMetrics = computed(() => {
  return enabledMetrics.value.filter(m => m.type === 'scale')
})

// Check if sobriety metric is enabled
const showSobriety = computed(() => {
  return enabledMetrics.value.some(m => m.id === 'sobrietyMaintained')
})

const habitCount = computed(() => {
  return habitMetrics.value.filter(m => getMetricValue(m.id)).length
})

// Get value for a metric (handles both default and custom)
const getMetricValue = (metricId: string): boolean | number => {
  if (defaultMetricIds.includes(metricId)) {
    return metric.value[metricId as keyof DailyMetric] as boolean | number
  }
  return metric.value.customMetrics?.[metricId] ?? false
}

// Set value for a metric (handles both default and custom)
const setMetricValue = (metricId: string, value: boolean | number) => {
  if (defaultMetricIds.includes(metricId)) {
    (metric.value as Record<string, unknown>)[metricId] = value
  } else {
    if (!metric.value.customMetrics) {
      metric.value.customMetrics = {}
    }
    metric.value.customMetrics[metricId] = value
  }
}

const toggleHabit = (metricId: string) => {
  const currentValue = getMetricValue(metricId)
  if (typeof currentValue === 'boolean') {
    setMetricValue(metricId, !currentValue)
  }
}

const updateScaleMetric = (metricId: string, value: number) => {
  setMetricValue(metricId, value)
}

const finish = () => {
  isComplete.value = true
}

const complete = async () => {
  if (isSaving.value || isSaved.value) return
  isSaving.value = true
  saveError.value = null

  try {
    // Save the metric to the database
    await saveMetric(metric.value)

    // Mark as saved and emit the complete event
    isSaving.value = false
    isSaved.value = true
    emit('complete', {
      success: true,
      metric: metric.value
    })
  } catch (error) {
    console.error('Failed to save check-in:', error)
    saveError.value = 'Failed to save. Please try again.'
    isSaving.value = false
  }
}
</script>

<template>
  <div class="widget-container p-4 my-3 max-w-md w-full">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
      <h3 class="text-emerald-400 font-bold flex items-center gap-2">
        <ClipboardCheck :size="18" />
        Daily Check-In
      </h3>
      <span class="text-slate-400 text-sm">{{ date }}</span>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-4 text-slate-400">
      Loading...
    </div>

    <!-- Completion View -->
    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
    >
      <div v-if="!isLoading && isComplete" class="text-center py-4">
        <div class="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/20 rounded-full mb-3">
          <CheckCircle2 class="text-emerald-400" :size="24" />
        </div>
        <h4 class="text-emerald-400 font-medium mb-2">Check-In Complete</h4>

        <div class="text-left space-y-2 p-3 bg-slate-800/50 rounded-lg mb-4">
          <div v-if="showSobriety" class="flex justify-between text-sm">
            <span class="text-slate-400">Sober:</span>
            <span :class="metric.sobrietyMaintained ? 'text-emerald-400' : 'text-red-400'">
              {{ metric.sobrietyMaintained ? 'Yes' : 'No' }}
            </span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">Mood:</span>
            <span class="text-slate-200">{{ metric.moodScore }}/10</span>
          </div>
          <div v-if="habitMetrics.length > 0" class="flex justify-between text-sm">
            <span class="text-slate-400">Habits:</span>
            <span class="text-slate-200">{{ habitCount }}/{{ habitMetrics.length }}</span>
          </div>
        </div>

        <p v-if="saveError" class="text-red-400 text-sm mb-2">{{ saveError }}</p>

        <button
          @click="complete"
          :disabled="isSaving || isSaved"
          class="text-white text-sm px-4 py-2 rounded transition-colors"
          :class="isSaving || isSaved
            ? 'bg-slate-600 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-500'"
        >
          {{ isSaved ? 'Saved' : isSaving ? 'Saving...' : 'Save Check-In' }}
        </button>
      </div>
    </Transition>

    <!-- Form -->
    <div v-if="!isLoading && !isComplete" class="space-y-4">
      <!-- Sobriety -->
      <div v-if="showSobriety">
        <label class="text-xs text-slate-400 block mb-2">Sober Today?</label>
        <div class="flex gap-2">
          <button
            @click="metric.sobrietyMaintained = true"
            class="flex-1 p-2 rounded-lg border transition-all text-sm"
            :class="metric.sobrietyMaintained
              ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400'
              : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'"
          >
            Yes
          </button>
          <button
            @click="metric.sobrietyMaintained = false"
            class="flex-1 p-2 rounded-lg border transition-all text-sm"
            :class="!metric.sobrietyMaintained
              ? 'bg-red-900/30 border-red-500/50 text-red-400'
              : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'"
          >
            No
          </button>
        </div>
      </div>

      <!-- Mood Score -->
      <div>
        <label class="text-xs text-slate-400 flex items-center gap-2 mb-2">
          <Smile :size="14" />
          Mood Score: {{ metric.moodScore }}/10
        </label>
        <input
          v-model.number="metric.moodScore"
          type="range"
          min="1"
          max="10"
          class="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
        <div class="flex justify-between text-xs text-slate-500 mt-1">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>

      <!-- Optional Built-in Metrics -->
      <div class="grid grid-cols-3 gap-2">
        <div>
          <label class="text-xs text-slate-400 flex items-center gap-1 mb-1">
            <Moon :size="12" />
            Sleep
          </label>
          <input
            v-model.number="metric.sleepQuality"
            type="number"
            min="1"
            max="10"
            placeholder="1-10"
            class="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 placeholder:text-slate-500"
          />
        </div>
        <div>
          <label class="text-xs text-slate-400 flex items-center gap-1 mb-1">
            <Brain :size="12" />
            Anxiety
          </label>
          <input
            v-model.number="metric.anxietyLevel"
            type="number"
            min="1"
            max="10"
            placeholder="1-10"
            class="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 placeholder:text-slate-500"
          />
        </div>
        <div>
          <label class="text-xs text-slate-400 flex items-center gap-1 mb-1">
            <Heart :size="12" />
            Cravings
          </label>
          <input
            v-model.number="metric.cravingIntensity"
            type="number"
            min="0"
            max="10"
            placeholder="0-10"
            class="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 placeholder:text-slate-500"
          />
        </div>
      </div>

      <!-- Custom Scale Metrics -->
      <div v-if="scaleMetrics.length > 0" class="grid grid-cols-2 gap-2">
        <div v-for="scaleMetric in scaleMetrics" :key="scaleMetric.id">
          <label class="text-xs text-slate-400 flex items-center gap-1 mb-1">
            <span>{{ scaleMetric.icon }}</span>
            {{ scaleMetric.label }}
          </label>
          <input
            :value="getMetricValue(scaleMetric.id) || undefined"
            @input="updateScaleMetric(scaleMetric.id, Number(($event.target as HTMLInputElement).value))"
            type="number"
            :min="scaleMetric.min ?? 1"
            :max="scaleMetric.max ?? 10"
            :placeholder="`${scaleMetric.min ?? 1}-${scaleMetric.max ?? 10}`"
            class="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 placeholder:text-slate-500"
          />
        </div>
      </div>

      <!-- Daily Habits (Dynamic) -->
      <div v-if="habitMetrics.length > 0">
        <label class="text-xs text-slate-400 block mb-2">Daily Habits</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="habit in habitMetrics"
            :key="habit.id"
            @click="toggleHabit(habit.id)"
            class="flex items-center gap-2 p-2 rounded-lg border transition-all text-sm"
            :class="getMetricValue(habit.id)
              ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400'
              : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'"
          >
            <span class="text-base">{{ habit.icon }}</span>
            {{ habit.label }}
          </button>
        </div>
      </div>

      <!-- Notes -->
      <div>
        <label class="text-xs text-slate-400 block mb-1">Notes (optional)</label>
        <textarea
          v-model="metric.notes"
          placeholder="How was your day?"
          class="w-full h-16 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 resize-none"
        ></textarea>
      </div>

      <!-- Footer -->
      <div class="pt-3 border-t border-slate-700 flex justify-between items-center">
        <div class="text-xs text-slate-400">
          <span v-if="habitMetrics.length > 0">{{ habitCount }}/{{ habitMetrics.length }} habits</span>
        </div>
        <button
          @click="finish"
          class="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-1.5 rounded transition-colors"
        >
          Complete Check-In
        </button>
      </div>
    </div>
  </div>
</template>
