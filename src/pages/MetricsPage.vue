<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Activity,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Filter,
  ClipboardCheck
} from 'lucide-vue-next'
import { useVault } from '@/composables/useVault'
import { formatDate, DEFAULT_METRICS } from '@/types'
import type { DailyMetric, MetricDefinition, JournalEntry } from '@/types'
import DayDetailModal from '@/components/DayDetailModal.vue'

const { getMetrics, getMetricsConfig, getJournalEntries } = useVault()

const isLoading = ref(true)
const enabledMetrics = ref<MetricDefinition[]>([])
const historicalMetrics = ref<DailyMetric[]>([])
const journalEntries = ref<JournalEntry[]>([])

// Date range selection
type DateRange = 'week' | 'month' | 'year'
const selectedRange = ref<DateRange>('month')

const rangeOptions: { value: DateRange; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' }
]

// Get days count based on range
const getDaysForRange = (range: DateRange): number => {
  switch (range) {
    case 'week': return 7
    case 'month': return 30
    case 'year': return 365
  }
}

// Date range label with actual dates
const dateRangeLabel = computed(() => {
  const days = getDaysForRange(selectedRange.value)
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - (days - 1))

  const fmt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${startDate.toLocaleDateString('en-US', fmt)} - ${endDate.toLocaleDateString('en-US', fmt)}`
})

// Default metric IDs
const defaultMetricIds = ['sobrietyMaintained', 'exercise', 'meditation', 'study', 'healthyEating', 'connectionTime', 'cbtPractice']

// Get enabled boolean metrics for heatmaps
const booleanMetrics = computed(() => {
  return enabledMetrics.value.filter(m => m.type === 'boolean')
})

// Generate heatmap data for a specific metric
const getHeatmapForMetric = (metricId: string) => {
  const days = getDaysForRange(selectedRange.value)
  const data: Array<{ date: string; success: boolean; hasData: boolean }> = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = formatDate(date)
    const metric = historicalMetrics.value.find(m => m.date === dateStr)

    let success = false
    let hasData = false

    if (metric) {
      hasData = true
      if (defaultMetricIds.includes(metricId)) {
        success = metric[metricId as keyof DailyMetric] === true
      } else {
        success = metric.customMetrics?.[metricId] === true
      }
    }

    data.push({ date: dateStr, success, hasData })
  }

  return data
}

// Calculate streak for a metric
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

// Calculate completion rate for a metric
const getCompletionRate = (metricId: string): number => {
  const heatmap = getHeatmapForMetric(metricId)
  const daysWithData = heatmap.filter(d => d.hasData)
  if (daysWithData.length === 0) return 0
  const successDays = daysWithData.filter(d => d.success).length
  return Math.round((successDays / daysWithData.length) * 100)
}

// Calculate trend for a metric (comparing last 7 days vs previous 7 days)
const getMetricTrend = (metricId: string): 'up' | 'down' | 'stable' => {
  const heatmap = getHeatmapForMetric(metricId)
  const daysWithData = heatmap.filter(d => d.hasData)
  if (daysWithData.length < 14) return 'stable'

  const recent = daysWithData.slice(-7)
  const previous = daysWithData.slice(-14, -7)
  const recentRate = recent.filter(d => d.success).length / recent.length
  const previousRate = previous.filter(d => d.success).length / previous.length

  const diff = recentRate - previousRate
  if (diff > 0.1) return 'up'
  if (diff < -0.1) return 'down'
  return 'stable'
}

// Mood data for chart
const moodData = computed(() => {
  const days = getDaysForRange(selectedRange.value)
  const data: Array<{ date: string; mood: number; sober: boolean }> = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = formatDate(date)
    const metric = historicalMetrics.value.find(m => m.date === dateStr)

    data.push({
      date: dateStr,
      mood: metric?.moodScore ?? 0,
      sober: metric?.sobrietyMaintained ?? false
    })
  }

  return data
})

// Average mood
const averageMood = computed(() => {
  const withMood = moodData.value.filter(d => d.mood > 0)
  if (withMood.length === 0) return 0
  const sum = withMood.reduce((acc, d) => acc + d.mood, 0)
  return (sum / withMood.length).toFixed(1)
})

// Format date for display
const formatDisplayDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Day detail modal state
const selectedDay = ref<{ date: string; metric: DailyMetric | null } | null>(null)
const showDayModal = ref(false)

const openDayDetail = (dateStr: string) => {
  const metric = historicalMetrics.value.find(m => m.date === dateStr) ?? null
  selectedDay.value = { date: dateStr, metric }
  showDayModal.value = true
}

const closeDayModal = () => {
  showDayModal.value = false
  selectedDay.value = null
}

// Mobile touch tooltip state
const touchedCell = ref<{ date: string; x: number; y: number; success: boolean; hasData: boolean } | null>(null)

const handleCellTouch = (e: TouchEvent, day: { date: string; success: boolean; hasData: boolean }) => {
  e.preventDefault()
  const touch = e.touches[0]
  // Clamp x position to keep tooltip on screen
  const clampedX = Math.min(touch.clientX, window.innerWidth - 150)
  touchedCell.value = { date: day.date, x: clampedX, y: touch.clientY, success: day.success, hasData: day.hasData }
  setTimeout(() => { touchedCell.value = null }, 2000)
}

// Get cell pattern style for accessibility
const getCellStyle = (day: { success: boolean; hasData: boolean }) => {
  if (!day.hasData) return {}
  if (day.success) {
    return { backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)`, backgroundSize: '4px 4px' }
  }
  return { backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)` }
}

// Log filter
const logFilter = ref<string>('all')
const logFilterOptions = ['all', 'user', 'assistant']

// Filtered journal entries for logs
const filteredEntries = computed(() => {
  if (logFilter.value === 'all') return journalEntries.value
  return journalEntries.value.filter(e => e.entryType === logFilter.value)
})

// Check if we have any tracking data
const hasTrackingData = computed(() => {
  return booleanMetrics.value.length > 0 && historicalMetrics.value.length > 0
})

// Load data
onMounted(async () => {
  try {
    // Load metrics config
    const config = await getMetricsConfig()
    if (config.metrics.length > 0) {
      enabledMetrics.value = config.metrics.filter(m => m.enabled)
    } else {
      enabledMetrics.value = DEFAULT_METRICS.filter(m => m.enabled)
    }

    // Load historical metrics (up to 365 days for year view)
    historicalMetrics.value = await getMetrics({ limit: 365 })

    // Load recent journal entries for logs
    journalEntries.value = await getJournalEntries({ limit: 50 })

  } catch (error) {
    console.error('Failed to load metrics:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="h-full overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center h-64">
      <div class="animate-pulse text-slate-400">Loading metrics...</div>
    </div>

    <div v-else class="space-y-8 animate-fade-in">
      <!-- Header Area -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-bold text-white flex items-center gap-2">
            <Activity :size="24" class="text-indigo-400" />
            Metrics
          </h1>
          <p class="text-slate-400 text-sm mt-1">Analyze your recovery patterns and progress</p>
        </div>

        <!-- Date Range Picker -->
        <div class="flex flex-col items-end gap-1">
          <div class="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
            <button
              v-for="option in rangeOptions"
              :key="option.value"
              @click="selectedRange = option.value"
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              :class="selectedRange === option.value
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'"
            >
              {{ option.label }}
            </button>
          </div>
          <span class="text-xs text-slate-500 font-mono">{{ dateRangeLabel }}</span>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!hasTrackingData" class="bg-slate-800 rounded-lg border border-slate-700 p-8 text-center">
        <div class="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <ClipboardCheck :size="32" class="text-slate-500" />
        </div>
        <h2 class="text-lg font-semibold text-white mb-2">No Tracking Data Yet</h2>
        <p class="text-slate-400 text-sm mb-6 max-w-md mx-auto">
          Start tracking your recovery progress by completing a daily check-in with Remi. Your habits, mood, and progress will appear here.
        </p>
        <router-link
          to="/chat"
          class="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors"
        >
          Start Your First Check-in
        </router-link>
      </div>

      <!-- Section 1: Streak Heatmaps -->
      <section v-if="hasTrackingData">
        <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Calendar :size="16" />
          Streak Heatmaps
        </h2>

        <div class="space-y-4">
          <div
            v-for="metric in booleanMetrics"
            :key="metric.id"
            class="bg-slate-800 rounded-lg border border-slate-700 p-4"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="text-lg">{{ metric.icon }}</span>
                <span class="font-medium text-white">{{ metric.label }}</span>
              </div>
              <div class="flex items-center gap-4 text-sm">
                <span class="text-slate-400">
                  <span class="text-emerald-400 font-mono font-bold">{{ getStreakForMetric(metric.id) }}</span> day streak
                </span>
                <span class="text-slate-400 flex items-center gap-1">
                  <span class="text-indigo-400 font-mono font-bold">{{ getCompletionRate(metric.id) }}%</span>
                  <!-- Trend indicator -->
                  <TrendingUp v-if="getMetricTrend(metric.id) === 'up'" :size="14" class="text-emerald-400" />
                  <TrendingDown v-else-if="getMetricTrend(metric.id) === 'down'" :size="14" class="text-red-400" />
                  <Minus v-else :size="14" class="text-slate-500" />
                </span>
              </div>
            </div>

            <!-- Heatmap Grid -->
            <div class="flex flex-wrap gap-1">
              <div
                v-for="(day, index) in getHeatmapForMetric(metric.id)"
                :key="index"
                :title="`${formatDisplayDate(day.date)}: ${day.success ? 'Completed' : day.hasData ? 'Missed' : 'No data'}`"
                class="w-4 h-4 rounded-sm transition-all cursor-pointer hover:ring-2 hover:ring-indigo-400/50"
                :class="{
                  'bg-emerald-500': day.success,
                  'bg-red-900': day.hasData && !day.success && metric.id === 'sobrietyMaintained',
                  'bg-slate-600': day.hasData && !day.success && metric.id !== 'sobrietyMaintained',
                  'bg-slate-700/50': !day.hasData
                }"
                :style="getCellStyle(day)"
                @click="openDayDetail(day.date)"
                @touchstart="handleCellTouch($event, day)"
              ></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 2: Insights Charts -->
      <section v-if="hasTrackingData">
        <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
          <TrendingUp :size="16" />
          Insights
        </h2>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Mood Trend -->
          <div class="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-medium text-white">Mood Trend</h3>
              <span class="text-sm text-slate-400">
                Avg: <span class="text-indigo-400 font-mono font-bold">{{ averageMood }}</span>/10
              </span>
            </div>

            <!-- Simple bar chart for mood -->
            <div class="flex items-end gap-px h-24">
              <div
                v-for="(day, index) in moodData"
                :key="index"
                class="flex-1 min-w-[2px] rounded-t transition-all cursor-pointer hover:opacity-80"
                :style="{ height: day.mood > 0 ? `${(day.mood / 10) * 100}%` : '2px' }"
                :class="{
                  'bg-emerald-500': day.mood >= 7 && day.sober,
                  'bg-amber-500': day.mood >= 5 && day.mood < 7,
                  'bg-red-500': day.mood > 0 && day.mood < 5,
                  'bg-slate-700': day.mood === 0
                }"
                :title="`${formatDisplayDate(day.date)}: Mood ${day.mood || 'N/A'}`"
                @click="openDayDetail(day.date)"
              ></div>
            </div>
            <div class="flex justify-between mt-2 text-xs text-slate-500 font-mono">
              <span>{{ dateRangeLabel.split(' - ')[0] }}</span>
              <span>Today</span>
            </div>
          </div>

          <!-- Sobriety vs Mood Correlation -->
          <div class="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h3 class="font-medium text-white mb-4">Sobriety Impact</h3>

            <div class="space-y-3">
              <!-- Sober days mood average -->
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-slate-400">Mood on sober days</span>
                  <span class="text-emerald-400 font-mono">
                    {{ (() => {
                      const soberDays = moodData.filter(d => d.sober && d.mood > 0)
                      if (soberDays.length === 0) return 'N/A'
                      return (soberDays.reduce((a, d) => a + d.mood, 0) / soberDays.length).toFixed(1)
                    })() }}
                  </span>
                </div>
                <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-emerald-500 rounded-full transition-all"
                    :style="{
                      width: (() => {
                        const soberDays = moodData.filter(d => d.sober && d.mood > 0)
                        if (soberDays.length === 0) return '0%'
                        const avg = soberDays.reduce((a, d) => a + d.mood, 0) / soberDays.length
                        return `${(avg / 10) * 100}%`
                      })()
                    }"
                  ></div>
                </div>
              </div>

              <!-- Non-sober days mood average -->
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-slate-400">Mood on non-sober days</span>
                  <span class="text-red-400 font-mono">
                    {{ (() => {
                      const nonSoberDays = moodData.filter(d => !d.sober && d.mood > 0)
                      if (nonSoberDays.length === 0) return 'N/A'
                      return (nonSoberDays.reduce((a, d) => a + d.mood, 0) / nonSoberDays.length).toFixed(1)
                    })() }}
                  </span>
                </div>
                <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-red-500 rounded-full transition-all"
                    :style="{
                      width: (() => {
                        const nonSoberDays = moodData.filter(d => !d.sober && d.mood > 0)
                        if (nonSoberDays.length === 0) return '0%'
                        const avg = nonSoberDays.reduce((a, d) => a + d.mood, 0) / nonSoberDays.length
                        return `${(avg / 10) * 100}%`
                      })()
                    }"
                  ></div>
                </div>
              </div>

              <!-- Sobriety rate -->
              <div class="pt-2 border-t border-slate-700">
                <div class="flex justify-between text-sm">
                  <span class="text-slate-400">Sobriety rate</span>
                  <span class="text-indigo-400 font-mono font-bold">
                    {{ (() => {
                      const daysWithData = moodData.filter(d => d.mood > 0)
                      if (daysWithData.length === 0) return '0%'
                      const soberDays = daysWithData.filter(d => d.sober).length
                      return Math.round((soberDays / daysWithData.length) * 100) + '%'
                    })() }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 3: Detailed Logs -->
      <section>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
            <FileText :size="16" />
            Journal Entries
          </h2>

          <!-- Filter -->
          <div class="flex items-center gap-2">
            <Filter :size="14" class="text-slate-500" />
            <select
              v-model="logFilter"
              class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option v-for="opt in logFilterOptions" :key="opt" :value="opt">
                {{ opt === 'all' ? 'All' : opt === 'user' ? 'My Messages' : 'Remi' }}
              </option>
            </select>
          </div>
        </div>

        <div class="bg-slate-800 rounded-lg border border-slate-700 divide-y divide-slate-700">
          <div
            v-if="filteredEntries.length === 0"
            class="p-8 text-center text-slate-500"
          >
            No journal entries yet
          </div>

          <div
            v-for="entry in filteredEntries.slice(0, 20)"
            :key="entry.id"
            class="p-4"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                :class="entry.entryType === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-300'"
              >
                {{ entry.entryType === 'user' ? 'You' : 'R' }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm font-medium text-white">
                    {{ entry.entryType === 'user' ? 'You' : 'Remi' }}
                  </span>
                  <span class="text-xs text-slate-500 font-mono">
                    {{ new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }}
                  </span>
                  <span
                    v-for="tag in entry.tags"
                    :key="tag"
                    class="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400"
                  >
                    {{ tag }}
                  </span>
                </div>
                <p class="text-sm text-slate-400 line-clamp-2">
                  {{ entry.content }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Day Detail Modal -->
    <DayDetailModal
      v-if="showDayModal && selectedDay"
      :date="selectedDay.date"
      :metric="selectedDay.metric"
      :enabled-metrics="enabledMetrics"
      @close="closeDayModal"
    />

    <!-- Mobile Touch Tooltip -->
    <Teleport to="body">
      <div
        v-if="touchedCell"
        class="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white shadow-lg pointer-events-none"
        :style="{
          left: `${touchedCell.x}px`,
          top: `${touchedCell.y - 50}px`,
          transform: 'translateX(-50%)'
        }"
      >
        <div class="font-medium">{{ formatDisplayDate(touchedCell.date) }}</div>
        <div :class="touchedCell.success ? 'text-emerald-400' : touchedCell.hasData ? 'text-red-400' : 'text-slate-400'">
          {{ touchedCell.success ? 'Completed' : touchedCell.hasData ? 'Missed' : 'No data' }}
        </div>
      </div>
    </Teleport>
  </div>
</template>
