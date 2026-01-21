<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Sparkles,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Save,
  ShieldAlert,
  Scale,
  Columns2,
  FastForward,
  Waves,
  MessageCircle,
  X,
  ClipboardCheck
} from 'lucide-vue-next'
import type { Component } from 'vue'
import type { WidgetId, DailyMetric, MetricDefinition } from '@/types'
import { useVault } from '@/composables/useVault'
import { useActivityResult } from '@/composables/useActivityResult'
import { today, formatDate, DEFAULT_METRICS } from '@/types'

// Widget components
import DentsWidget from '@/components/widgets/DentsWidget.vue'
import TapeWidget from '@/components/widgets/TapeWidget.vue'
import StoicWidget from '@/components/widgets/StoicWidget.vue'
import EvidenceWidget from '@/components/widgets/EvidenceWidget.vue'
import UrgeSurfWidget from '@/components/widgets/UrgeSurfWidget.vue'
import CheckinWidget from '@/components/widgets/CheckinWidget.vue'

const router = useRouter()
const route = useRoute()
const { getMetrics, getMetricForDate, saveMetric, getMetricsConfig } = useVault()
const { setResult } = useActivityResult()

// Loading and save states
const isLoading = ref(true)
const isSaving = ref(false)
const saveSuccess = ref(false)
const enabledMetrics = ref<MetricDefinition[]>([])

// Default metric IDs that map to DailyMetric properties
const defaultMetricIds = ['sobrietyMaintained', 'exercise', 'meditation', 'study', 'healthyEating', 'connectionTime', 'cbtPractice']

// Selected date
const selectedDate = ref(today())

// Current date's metrics
const currentMetrics = ref<DailyMetric>({
  date: today(),
  sobrietyMaintained: true,
  exercise: false,
  meditation: false,
  study: false,
  healthyEating: false,
  connectionTime: false,
  cbtPractice: false,
  moodScore: 5,
  customMetrics: {}
})

// Historical metrics for streaks
const historicalMetrics = ref<DailyMetric[]>([])

// Get enabled boolean metrics for the checklist
const booleanMetrics = computed(() => {
  return enabledMetrics.value.filter(m => m.type === 'boolean')
})

// Sort metrics: incomplete first, then completed
const sortedBooleanMetrics = computed(() => {
  return [...booleanMetrics.value].sort((a, b) => {
    const aComplete = isMetricComplete(a.id)
    const bComplete = isMetricComplete(b.id)
    if (aComplete === bComplete) return 0
    return aComplete ? 1 : -1
  })
})

// Calculate streak for each metric
const getStreakForMetric = (metricId: string): number => {
  let streak = 0
  const sortedMetrics = [...historicalMetrics.value].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  for (const metric of sortedMetrics) {
    const value = defaultMetricIds.includes(metricId)
      ? metric[metricId as keyof DailyMetric]
      : metric.customMetrics?.[metricId]

    if (value === true) {
      streak++
    } else {
      break
    }
  }
  return streak
}

// Get value for a metric (handles both default and custom)
const getMetricValue = (metricId: string): boolean | number => {
  if (defaultMetricIds.includes(metricId)) {
    return currentMetrics.value[metricId as keyof DailyMetric] as boolean | number
  }
  return currentMetrics.value.customMetrics?.[metricId] ?? false
}

// Set value for a metric (handles both default and custom)
const setMetricValue = (metricId: string, value: boolean | number) => {
  if (defaultMetricIds.includes(metricId)) {
    (currentMetrics.value as Record<string, unknown>)[metricId] = value
  } else {
    if (!currentMetrics.value.customMetrics) {
      currentMetrics.value.customMetrics = {}
    }
    currentMetrics.value.customMetrics[metricId] = value
  }
}

// Format date for display
const formatDisplayDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// Date navigation
const canGoForward = computed(() => selectedDate.value < today())

const navigateDate = (direction: -1 | 1) => {
  const current = new Date(selectedDate.value + 'T12:00:00')
  current.setDate(current.getDate() + direction)
  const newDate = formatDate(current)

  if (direction === 1 && newDate > today()) return
  selectedDate.value = newDate
}

// Load metrics for selected date
const loadMetricsForDate = async (date: string) => {
  const existing = await getMetricForDate(date)
  if (existing) {
    currentMetrics.value = existing
  } else {
    currentMetrics.value = {
      date,
      sobrietyMaintained: true,
      exercise: false,
      meditation: false,
      study: false,
      healthyEating: false,
      connectionTime: false,
      cbtPractice: false,
      moodScore: 5,
      customMetrics: {}
    }
  }
}

// Watch for date changes
watch(selectedDate, async (newDate) => {
  await loadMetricsForDate(newDate)
})

// Load data on mount
onMounted(async () => {
  try {
    // Load metrics config
    const config = await getMetricsConfig()
    if (config.metrics.length > 0) {
      enabledMetrics.value = config.metrics.filter(m => m.enabled)
    } else {
      enabledMetrics.value = DEFAULT_METRICS.filter(m => m.enabled)
    }

    // Load current day's metrics
    await loadMetricsForDate(selectedDate.value)

    // Load last 30 days for streaks
    historicalMetrics.value = await getMetrics({ limit: 30 })

    // Handle deep link to specific activity
    const activityId = route.query.activity as string
    if (activityId) {
      const activity = activities.find(a => a.id === activityId)
      if (activity) {
        openActivity(activity)
      }
    }
  } catch (error) {
    console.error('Failed to load metrics:', error)
  } finally {
    isLoading.value = false
  }
})

// Watch for route changes to handle navigation to specific activities
watch(() => route.query.activity, (activityId) => {
  if (activityId && typeof activityId === 'string') {
    const activity = activities.find(a => a.id === activityId)
    if (activity) {
      openActivity(activity)
    }
  }
})

const toggleMetric = async (metricId: string) => {
  const currentValue = getMetricValue(metricId)
  if (typeof currentValue === 'boolean') {
    setMetricValue(metricId, !currentValue)
    // Auto-save on toggle for immediate sync
    await saveMetricsQuietly()
  }
}

const isMetricComplete = (metricId: string): boolean => {
  return getMetricValue(metricId) === true
}

const saveMetricsQuietly = async () => {
  try {
    await saveMetric(currentMetrics.value)
    historicalMetrics.value = await getMetrics({ limit: 30 })
  } catch (error) {
    console.error('Failed to save metrics:', error)
  }
}

const saveMetrics = async () => {
  isSaving.value = true
  saveSuccess.value = false

  try {
    await saveMetric(currentMetrics.value)
    historicalMetrics.value = await getMetrics({ limit: 30 })
    saveSuccess.value = true
    setTimeout(() => {
      saveSuccess.value = false
    }, 3000)
  } catch (error) {
    console.error('Failed to save metrics:', error)
  } finally {
    isSaving.value = false
  }
}

// Activity Library configuration
interface Activity {
  id: WidgetId
  name: string
  description: string
  icon: Component
  component: Component
  defaultParams: Record<string, unknown>
}

const activities: Activity[] = [
  {
    id: 'W_CHECKIN',
    name: 'Daily Check-In',
    description: 'Track your mood, habits, and sobriety for today',
    icon: ClipboardCheck,
    component: CheckinWidget,
    defaultParams: {}
  },
  {
    id: 'W_DENTS',
    name: 'DENTS Protocol',
    description: 'A 10-minute technique to manage urges',
    icon: ShieldAlert,
    component: DentsWidget,
    defaultParams: { trigger: 'current moment', intensity: 5 }
  },
  {
    id: 'W_TAPE',
    name: 'Play the Tape Forward',
    description: 'Visualize consequences before acting',
    icon: FastForward,
    component: TapeWidget,
    defaultParams: { trigger: '' }
  },
  {
    id: 'W_EVIDENCE',
    name: 'Evaluation of Evidence',
    description: 'Challenge negative thoughts with CBT techniques',
    icon: Scale,
    component: EvidenceWidget,
    defaultParams: { thought: '' }
  },
  {
    id: 'W_STOIC',
    name: 'Dichotomy of Control',
    description: 'Sort what you can and cannot control',
    icon: Columns2,
    component: StoicWidget,
    defaultParams: { situation: '' }
  },
  {
    id: 'W_URGESURF',
    name: 'Urge Surfing',
    description: 'Guided meditation to ride out urges',
    icon: Waves,
    component: UrgeSurfWidget,
    defaultParams: { duration: 300 }
  }
]

// Modal state
const activeActivity = ref<Activity | null>(null)
const activityCompleted = ref(false)
const activityResult = ref<unknown>(null)

const openActivity = (activity: Activity) => {
  activeActivity.value = activity
  activityCompleted.value = false
  activityResult.value = null
}

const closeActivity = () => {
  activeActivity.value = null
  activityCompleted.value = false
  activityResult.value = null
}

const handleActivityComplete = (result: unknown) => {
  activityCompleted.value = true
  activityResult.value = result
}

const discussWithRemi = () => {
  if (activeActivity.value && activityResult.value) {
    setResult(activeActivity.value.id, activeActivity.value.name, activityResult.value)
    router.push('/chat')
  }
}
</script>

<template>
  <div class="h-full overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center h-64">
      <div class="animate-pulse text-slate-400">Loading...</div>
    </div>

    <div v-else class="space-y-8 animate-fade-in">
      <!-- Header Area -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles :size="24" class="text-indigo-400" />
            Activities
          </h1>
          <p class="text-slate-400 text-sm mt-1">Track habits and access recovery tools</p>
        </div>

        <!-- Date Picker -->
        <div class="flex items-center gap-2">
          <button
            @click="navigateDate(-1)"
            class="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft :size="20" />
          </button>
          <div class="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg min-w-[180px] justify-center">
            <Calendar :size="16" class="text-indigo-400" />
            <span class="text-sm font-mono text-white">{{ formatDisplayDate(selectedDate) }}</span>
          </div>
          <button
            @click="navigateDate(1)"
            :disabled="!canGoForward"
            class="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight :size="20" />
          </button>
        </div>
      </div>

      <!-- Section 1: The Register -->
      <section>
        <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">The Register</h2>
        <div class="bg-slate-800 rounded-lg border border-slate-700 divide-y divide-slate-700">
          <div
            v-for="metric in sortedBooleanMetrics"
            :key="metric.id"
            class="flex items-center justify-between p-4"
          >
            <!-- Left: Label + Streak -->
            <div class="flex items-center gap-3">
              <span class="text-xl">{{ metric.icon }}</span>
              <div>
                <div class="font-medium text-white">{{ metric.label }}</div>
                <div class="text-xs text-slate-500 font-mono">
                  {{ getStreakForMetric(metric.id) }} day streak
                </div>
              </div>
            </div>

            <!-- Right: Large Toggle -->
            <button
              @click="toggleMetric(metric.id)"
              class="w-16 h-10 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer"
              :class="isMetricComplete(metric.id)
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'bg-transparent border-slate-600 text-slate-600 hover:border-slate-500'"
            >
              <CheckCircle2 v-if="isMetricComplete(metric.id)" :size="24" />
            </button>
          </div>
        </div>

        <!-- Complete Check-in Button -->
        <button
          @click="saveMetrics"
          :disabled="isSaving"
          class="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors"
          :class="saveSuccess
            ? 'bg-emerald-600 text-white'
            : 'bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white'"
        >
          <Save v-if="!saveSuccess" :size="18" />
          <CheckCircle2 v-else :size="18" />
          {{ isSaving ? 'Saving...' : saveSuccess ? 'Check-in Complete!' : 'Complete Check-in' }}
        </button>
      </section>

      <!-- Section 2: Activity Library -->
      <section>
        <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Activity Library</h2>
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            v-for="activity in activities"
            :key="activity.id"
            @click="openActivity(activity)"
            class="p-4 rounded-lg bg-slate-800 border border-slate-700 text-left transition-all hover:border-indigo-500 hover:bg-slate-800/80"
          >
            <div class="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center mb-3">
              <component :is="activity.icon" :size="20" class="text-indigo-400" />
            </div>
            <div class="font-semibold text-white text-sm">{{ activity.name }}</div>
            <p class="text-slate-400 text-xs mt-1 line-clamp-2">{{ activity.description }}</p>
            <div class="text-indigo-400 text-xs font-medium mt-3">Launch →</div>
          </button>
        </div>
      </section>
    </div>

    <!-- Activity Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="activeActivity"
          class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          @click.self="closeActivity"
        >
          <div class="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <!-- Modal Header -->
            <div class="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 class="text-lg font-semibold text-white flex items-center gap-2">
                <component :is="activeActivity.icon" :size="20" class="text-indigo-400" />
                {{ activeActivity.name }}
              </h2>
              <button
                @click="closeActivity"
                class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X :size="20" />
              </button>
            </div>

            <!-- Widget Container -->
            <div class="p-4">
              <component
                :is="activeActivity.component"
                v-bind="activeActivity.defaultParams"
                @complete="handleActivityComplete"
              />
            </div>

            <!-- Post-completion Actions -->
            <Transition
              enter-active-class="transition-all duration-300"
              enter-from-class="opacity-0 translate-y-4"
              enter-to-class="opacity-100 translate-y-0"
            >
              <div
                v-if="activityCompleted"
                class="p-4 border-t border-slate-700 bg-slate-800/50"
              >
                <p class="text-slate-300 text-sm mb-3">
                  Great work completing this activity!
                </p>
                <div class="flex gap-3">
                  <button
                    @click="closeActivity"
                    class="flex-1 py-2 px-4 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    Done
                  </button>
                  <button
                    @click="discussWithRemi"
                    class="flex-1 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle :size="18" />
                    Discuss with Remi
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
