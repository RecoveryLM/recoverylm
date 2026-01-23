<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Sparkles,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ShieldAlert,
  Scale,
  Columns2,
  FastForward,
  Waves,
  MessageCircle,
  X,
  ClipboardCheck,
  BookOpen,
  Star
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
import ThoughtLogWidget from '@/components/widgets/ThoughtLogWidget.vue'
import GratitudeWidget from '@/components/widgets/GratitudeWidget.vue'
import SelfAppreciationWidget from '@/components/widgets/SelfAppreciationWidget.vue'
import CrisisQuickAccess from '@/components/CrisisQuickAccess.vue'

const router = useRouter()
const route = useRoute()
const { getMetrics, getMetricForDate, saveMetric, getMetricsConfig, logActivity, getLastActivityTimes } = useVault()
const { setResult } = useActivityResult()

// Loading state
const isLoading = ref(true)
const enabledMetrics = ref<MetricDefinition[]>([])

// Activity usage tracking
const lastActivityTimes = ref<Record<string, number>>({})

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

// Count of completed metrics
const completedCount = computed(() => {
  return booleanMetrics.value.filter(m => isMetricComplete(m.id)).length
})

// Progress percentage for circular indicator
const progressPercent = computed(() => {
  if (booleanMetrics.value.length === 0) return 0
  return Math.round((completedCount.value / booleanMetrics.value.length) * 100)
})

// Motivational message based on progress
const progressMessage = computed(() => {
  const percent = progressPercent.value
  if (percent === 100) return 'All habits completed! Great work.'
  if (percent >= 75) return 'Almost there, keep going!'
  if (percent >= 50) return "Halfway through today's habits"
  if (percent > 0) return 'Good start, keep building momentum'
  return 'Start tracking your day'
})

// SVG circle properties for progress ring
const circleRadius = 40
const circleCircumference = 2 * Math.PI * circleRadius
const progressOffset = computed(() => {
  return circleCircumference - (progressPercent.value / 100) * circleCircumference
})

// Format relative time for activity last used
const getLastUsedText = (activityId: string): string | null => {
  const timestamp = lastActivityTimes.value[activityId]
  if (!timestamp) return null

  const now = Date.now()
  const diff = now - timestamp
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Last: today'
  if (days === 1) return 'Last: yesterday'
  if (days < 7) return `Last: ${days} days ago`
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return `Last: ${weeks} week${weeks > 1 ? 's' : ''} ago`
  }
  return `Last: ${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`
}

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

// Format date for display with Today/Yesterday labels
const formatDisplayDate = (dateStr: string): string => {
  const todayStr = today()
  if (dateStr === todayStr) return 'Today'

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateStr === formatDate(yesterday)) return 'Yesterday'

  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// Check if currently viewing today
const isViewingToday = computed(() => selectedDate.value === today())

// Go to today
const goToToday = () => {
  selectedDate.value = today()
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

    // Load activity usage data
    lastActivityTimes.value = await getLastActivityTimes()

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

// Activity Library configuration
type ActivityCategory = 'crisis' | 'daily' | 'reflection'

interface ActivityCategoryInfo {
  id: ActivityCategory
  label: string
  colorClass: string
  iconColorClass: string
}

const categoryInfo: Record<ActivityCategory, ActivityCategoryInfo> = {
  crisis: { id: 'crisis', label: 'Crisis Intervention', colorClass: 'border-amber-500/30', iconColorClass: 'text-amber-400' },
  daily: { id: 'daily', label: 'Daily Practice', colorClass: 'border-emerald-500/30', iconColorClass: 'text-emerald-400' },
  reflection: { id: 'reflection', label: 'Reflection', colorClass: 'border-indigo-500/30', iconColorClass: 'text-indigo-400' }
}

type ModalSize = 'sm' | 'md' | 'lg'

interface Activity {
  id: WidgetId
  name: string
  description: string
  whenToUse: string
  category: ActivityCategory
  modalSize: ModalSize
  icon: Component
  component: Component
  defaultParams: Record<string, unknown>
}

const modalSizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl'
}

const activities: Activity[] = [
  {
    id: 'W_CHECKIN',
    name: 'Daily Check-In',
    description: 'Track your mood, habits, and sobriety for today',
    whenToUse: 'Use daily to track progress',
    category: 'daily',
    modalSize: 'md',
    icon: ClipboardCheck,
    component: CheckinWidget,
    defaultParams: {}
  },
  {
    id: 'W_DENTS',
    name: 'DENTS Protocol',
    description: 'A 10-minute technique to manage urges',
    whenToUse: 'Use when you feel an urge building',
    category: 'crisis',
    modalSize: 'md',
    icon: ShieldAlert,
    component: DentsWidget,
    defaultParams: { trigger: 'current moment', intensity: 5 }
  },
  {
    id: 'W_TAPE',
    name: 'Play the Tape Forward',
    description: 'Visualize consequences before acting',
    whenToUse: 'Use before making impulsive decisions',
    category: 'crisis',
    modalSize: 'lg',
    icon: FastForward,
    component: TapeWidget,
    defaultParams: { trigger: '' }
  },
  {
    id: 'W_EVIDENCE',
    name: 'Evaluation of Evidence',
    description: 'Challenge negative thoughts with CBT techniques',
    whenToUse: 'Use when negative thoughts feel overwhelming',
    category: 'reflection',
    modalSize: 'md',
    icon: Scale,
    component: EvidenceWidget,
    defaultParams: { thought: '' }
  },
  {
    id: 'W_STOIC',
    name: 'Dichotomy of Control',
    description: 'Sort what you can and cannot control',
    whenToUse: 'Use when feeling anxious about outcomes',
    category: 'reflection',
    modalSize: 'md',
    icon: Columns2,
    component: StoicWidget,
    defaultParams: { situation: '' }
  },
  {
    id: 'W_URGESURF',
    name: 'Urge Surfing',
    description: 'Guided meditation to ride out urges',
    whenToUse: 'Use when craving intensity is high',
    category: 'crisis',
    modalSize: 'lg',
    icon: Waves,
    component: UrgeSurfWidget,
    defaultParams: { duration: 300 }
  },
  {
    id: 'W_THOUGHTLOG',
    name: 'Thought Log',
    description: 'Work through difficult thoughts using the ABC model',
    whenToUse: 'When a thought is bothering you or causing distress',
    category: 'reflection',
    modalSize: 'lg',
    icon: BookOpen,
    component: ThoughtLogWidget,
    defaultParams: {}
  },
  {
    id: 'W_GRATITUDE',
    name: 'Gratitude Journal',
    description: 'Record three good things from your day',
    whenToUse: 'Daily practice, ideally in the evening',
    category: 'daily',
    modalSize: 'md',
    icon: Sparkles,
    component: GratitudeWidget,
    defaultParams: {}
  },
  {
    id: 'W_SELFAPPRECIATION',
    name: 'Self Appreciation',
    description: 'Celebrate your wins and recognize your strengths',
    whenToUse: 'End of day or when you need a confidence boost',
    category: 'daily',
    modalSize: 'md',
    icon: Star,
    component: SelfAppreciationWidget,
    defaultParams: {}
  }
]

// Group activities by category
const activitiesByCategory = computed(() => {
  const grouped: Record<ActivityCategory, Activity[]> = {
    crisis: [],
    daily: [],
    reflection: []
  }
  activities.forEach(a => grouped[a.category].push(a))
  return grouped
})

// Category display order
const categoryOrder: ActivityCategory[] = ['crisis', 'daily', 'reflection']

// Modal state
const activeActivity = ref<Activity | null>(null)
const activityCompleted = ref(false)
const activityResult = ref<unknown>(null)

const openActivity = (activity: Activity) => {
  activeActivity.value = activity
  activityCompleted.value = false
  activityResult.value = null
}

const openActivityById = (activityId: WidgetId) => {
  const activity = activities.find(a => a.id === activityId)
  if (activity) {
    openActivity(activity)
  }
}

const closeActivity = () => {
  activeActivity.value = null
  activityCompleted.value = false
  activityResult.value = null
}

const handleActivityComplete = async (result: unknown) => {
  activityCompleted.value = true
  activityResult.value = result

  // Log the activity completion
  if (activeActivity.value) {
    try {
      await logActivity(activeActivity.value.id, undefined, result as Record<string, unknown> | undefined)
      // Refresh last activity times
      lastActivityTimes.value = await getLastActivityTimes()
    } catch (error) {
      console.error('Failed to log activity:', error)
    }
  }
}

const discussWithRemi = () => {
  if (activeActivity.value && activityResult.value) {
    setResult(activeActivity.value.id, activeActivity.value.name, activityResult.value)
    router.push({ name: 'chat' })
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
            aria-label="Go to previous day"
            class="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft :size="20" />
          </button>
          <button
            @click="goToToday"
            :disabled="isViewingToday"
            :aria-label="isViewingToday ? 'Viewing today' : 'Click to go to today'"
            class="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg min-w-[180px] justify-center transition-colors"
            :class="isViewingToday ? 'cursor-default' : 'hover:border-indigo-500 cursor-pointer'"
          >
            <Calendar :size="16" class="text-indigo-400" />
            <span class="text-sm font-mono text-white">{{ formatDisplayDate(selectedDate) }}</span>
          </button>
          <button
            @click="navigateDate(1)"
            :disabled="!canGoForward"
            aria-label="Go to next day"
            class="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight :size="20" />
          </button>
        </div>
      </div>

      <!-- Crisis Quick Access -->
      <CrisisQuickAccess @open-activity="openActivityById" />

      <!-- Daily Progress Summary -->
      <section class="flex items-center gap-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <!-- Circular Progress -->
        <div class="relative flex-shrink-0">
          <svg width="100" height="100" class="transform -rotate-90">
            <!-- Background circle -->
            <circle
              :r="circleRadius"
              cx="50"
              cy="50"
              fill="transparent"
              stroke="currentColor"
              stroke-width="8"
              class="text-slate-700"
            />
            <!-- Progress circle -->
            <circle
              :r="circleRadius"
              cx="50"
              cy="50"
              fill="transparent"
              stroke="currentColor"
              stroke-width="8"
              stroke-linecap="round"
              :stroke-dasharray="circleCircumference"
              :stroke-dashoffset="progressOffset"
              class="text-emerald-500 transition-all duration-500"
            />
          </svg>
          <!-- Center text -->
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-2xl font-bold text-white">{{ completedCount }}</span>
            <span class="text-xs text-slate-400">/{{ booleanMetrics.length }}</span>
          </div>
        </div>
        <!-- Message -->
        <div class="flex-1 min-w-0">
          <p class="text-white font-medium">{{ progressMessage }}</p>
          <p class="text-sm text-slate-400 mt-1">{{ progressPercent }}% of daily habits</p>
        </div>
      </section>

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
              :aria-label="`${metric.label}: ${isMetricComplete(metric.id) ? 'completed' : 'not completed'}`"
              :aria-pressed="isMetricComplete(metric.id)"
              role="switch"
              class="w-16 h-10 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer"
              :class="isMetricComplete(metric.id)
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'bg-transparent border-slate-600 text-slate-600 hover:border-slate-500'"
            >
              <CheckCircle2 v-if="isMetricComplete(metric.id)" :size="24" />
            </button>
          </div>
        </div>

        <!-- Progress Footer -->
        <div class="mt-4 flex items-center justify-between px-4 py-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <span class="text-sm text-slate-400">
            Quick log: <span class="text-white font-medium">{{ completedCount }}/{{ booleanMetrics.length }}</span> completed
          </span>
          <button
            @click="openActivity(activities.find(a => a.id === 'W_CHECKIN')!)"
            class="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Full check-in →
          </button>
        </div>
      </section>

      <!-- Section 2: Activity Library -->
      <section class="space-y-6">
        <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wide">Activity Library</h2>

        <!-- Grouped by Category -->
        <div
          v-for="catId in categoryOrder"
          :key="catId"
          class="space-y-3"
        >
          <h3 class="text-xs font-medium text-slate-400 flex items-center gap-2">
            <span
              class="w-2 h-2 rounded-full"
              :class="{
                'bg-amber-400': catId === 'crisis',
                'bg-emerald-400': catId === 'daily',
                'bg-indigo-400': catId === 'reflection'
              }"
            ></span>
            {{ categoryInfo[catId].label }}
          </h3>
          <div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              v-for="activity in activitiesByCategory[catId]"
              :key="activity.id"
              @click="openActivity(activity)"
              class="p-4 rounded-lg bg-slate-800 border text-left transition-all hover:bg-slate-800/80"
              :class="[categoryInfo[catId].colorClass, `hover:${categoryInfo[catId].colorClass.replace('/30', '/60')}`]"
            >
              <div class="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center mb-3">
                <component :is="activity.icon" :size="20" :class="categoryInfo[catId].iconColorClass" />
              </div>
              <div class="font-semibold text-white text-sm">{{ activity.name }}</div>
              <p class="text-slate-400 text-xs mt-1 line-clamp-2">{{ activity.description }}</p>
              <p class="text-slate-500 text-xs mt-2 italic">{{ activity.whenToUse }}</p>
              <p v-if="getLastUsedText(activity.id)" class="text-slate-600 text-xs mt-1 font-mono">
                {{ getLastUsedText(activity.id) }}
              </p>
            </button>
          </div>
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
          <div
            class="bg-slate-900 rounded-xl border border-slate-700 w-full max-h-[90vh] overflow-y-auto"
            :class="modalSizeClasses[activeActivity.modalSize]"
          >
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
