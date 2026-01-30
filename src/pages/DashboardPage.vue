<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Phone,
  Mail,
  MessageCircle,
  Send
} from 'lucide-vue-next'
import { useVault } from '@/composables/useVault'
import { useCrisis } from '@/composables/useCrisis'
import { detectLeadingIndicators } from '@/services/orchestrator'
import { formatDate, type DailyMetric, type UserProfile, type SupportNetwork, type EmergencyContact, type DailyPracticeConfig, type JournalEntry, type SupportPerson } from '@/types'

const router = useRouter()
const { getProfile, getMetrics, getSupportNetwork, getEmergencyContact, getDailyPracticeConfig, getJournalEntries } = useVault()
const { assessMessage, shouldBlockFlow } = useCrisis()

// Real data from vault
const profile = ref<UserProfile | null>(null)
const recentMetrics = ref<DailyMetric[]>([])
const supportNetwork = ref<SupportNetwork | null>(null)
const emergencyContact = ref<EmergencyContact | null>(null)
const practiceConfig = ref<DailyPracticeConfig>({ items: [] })
const todayJournalEntries = ref<JournalEntry[]>([])
const isLoading = ref(true)

// Quick Capture state
const quickCapture = ref('')
const isSending = ref(false)

// ============================================
// System Status Indicator (HUD)
// ============================================

type SystemStatus = 'nominal' | 'drift' | 'critical'

const leadingIndicators = computed(() => {
  return detectLeadingIndicators(recentMetrics.value).map((text, id) => ({
    id,
    text,
    severity: text.includes('Sobriety') ? 'high' : 'medium'
  }))
})

const systemStatus = computed((): SystemStatus => {
  const indicators = leadingIndicators.value.length
  const recentSobrietyBreak = recentMetrics.value.slice(0, 7)
    .some(m => m.sobrietyMaintained === false)
  const avgMood = recentMetrics.value.length > 0
    ? recentMetrics.value.reduce((sum, m) => sum + m.moodScore, 0) / recentMetrics.value.length
    : 7

  if (indicators >= 3 || recentSobrietyBreak || avgMood < 4) return 'critical'
  if (indicators >= 1) return 'drift'
  return 'nominal'
})

// Helper to calculate streaks with consecutive calendar day checking
const calculateStreak = (getValue: (m: DailyMetric) => boolean | undefined): number => {
  if (recentMetrics.value.length === 0) return 0

  // Create a map of date -> metric for O(1) lookups
  const metricsMap = new Map(recentMetrics.value.map(m => [m.date, m]))

  let streak = 0
  const checkDate = new Date()
  checkDate.setHours(0, 0, 0, 0)

  while (true) {
    const dateStr = formatDate(checkDate)
    const metric = metricsMap.get(dateStr)

    // No record for this day OR value is not true = streak broken
    if (!metric || getValue(metric) !== true) break

    streak++
    checkDate.setDate(checkDate.getDate() - 1)
  }

  return streak
}

const sobrietyStreak = computed(() => {
  return calculateStreak(m => m.sobrietyMaintained)
})

const statusDotClass = computed(() => {
  switch (systemStatus.value) {
    case 'nominal': return 'bg-emerald-400'
    case 'drift': return 'bg-amber-400'
    case 'critical': return 'bg-red-400'
  }
})

const statusContainerClass = computed(() => {
  switch (systemStatus.value) {
    case 'nominal': return 'bg-emerald-900/20 border-emerald-600/30 animate-pulse-slow'
    case 'drift': return 'bg-amber-900/20 border-amber-600/30'
    case 'critical': return 'bg-red-900/20 border-red-600/30 animate-flash'
  }
})

const statusMessage = computed(() => {
  switch (systemStatus.value) {
    case 'nominal':
      return `System Nominal. ${sobrietyStreak.value} Day Streak.`
    case 'drift':
      return `Drift Detected. ${leadingIndicators.value.length} Leading Indicator${leadingIndicators.value.length > 1 ? 's' : ''} Active.`
    case 'critical':
      return 'Support Protocol Recommended.'
  }
})

// ============================================
// Metric Cards (kept from original)
// ============================================

const calculateTrend = (
  getValue: (m: DailyMetric) => boolean | number | undefined,
  isBooleanMetric: boolean
): 'up' | 'down' | 'stable' => {
  const total = recentMetrics.value.length
  if (total < 4) return 'stable'

  const midpoint = Math.floor(total / 2)
  const currentPeriod = recentMetrics.value.slice(0, midpoint)
  const previousPeriod = recentMetrics.value.slice(midpoint)

  if (currentPeriod.length === 0 || previousPeriod.length === 0) return 'stable'

  const currentAvg = isBooleanMetric
    ? currentPeriod.filter(m => getValue(m) === true).length / currentPeriod.length
    : currentPeriod.reduce((sum, m) => sum + (Number(getValue(m)) || 0), 0) / currentPeriod.length

  const previousAvg = isBooleanMetric
    ? previousPeriod.filter(m => getValue(m) === true).length / previousPeriod.length
    : previousPeriod.reduce((sum, m) => sum + (Number(getValue(m)) || 0), 0) / previousPeriod.length

  const diff = currentAvg - previousAvg
  const threshold = isBooleanMetric ? 0.1 : 0.5
  if (Math.abs(diff) < threshold) return 'stable'
  return diff > 0 ? 'up' : 'down'
}

const metricCards = computed(() => {
  if (recentMetrics.value.length === 0) {
    return [
      { label: 'Sobriety', status: 'success', streak: 0, unit: 'days', trend: 'stable' as const },
      { label: 'Exercise', status: 'warning', streak: 0, unit: 'days', trend: 'stable' as const },
      { label: 'Meditation', status: 'warning', streak: 0, unit: 'days', trend: 'stable' as const },
      { label: 'Mood Avg', status: 'success', streak: 0, unit: '/10', trend: 'stable' as const },
    ]
  }

  // Use calculateStreak which checks consecutive calendar days
  const sobrietyStreakCount = calculateStreak(m => m.sobrietyMaintained)
  const exerciseStreak = calculateStreak(m => m.exercise)
  const meditationStreak = calculateStreak(m => m.meditation)

  const avgMood = recentMetrics.value.length > 0
    ? Math.round(recentMetrics.value.reduce((sum, m) => sum + m.moodScore, 0) / recentMetrics.value.length * 10) / 10
    : 0

  return [
    {
      label: 'Sobriety',
      status: sobrietyStreakCount > 0 ? 'success' : 'warning',
      streak: sobrietyStreakCount,
      unit: 'days',
      trend: calculateTrend(m => m.sobrietyMaintained, true)
    },
    {
      label: 'Exercise',
      status: exerciseStreak > 0 ? 'success' : 'warning',
      streak: exerciseStreak,
      unit: 'days',
      trend: calculateTrend(m => m.exercise, true)
    },
    {
      label: 'Meditation',
      status: meditationStreak > 0 ? 'success' : 'warning',
      streak: meditationStreak,
      unit: 'days',
      trend: calculateTrend(m => m.meditation, true)
    },
    {
      label: 'Mood Avg',
      status: avgMood >= 6 ? 'success' : 'warning',
      streak: avgMood,
      unit: '/10',
      trend: calculateTrend(m => m.moodScore, false)
    },
  ]
})

// ============================================
// Focus Card (The "Next Right Thing")
// ============================================

const isJournalCompletedToday = (templateId: string): boolean => {
  const today = formatDate(new Date())
  return todayJournalEntries.value.some(entry => {
    const entryDate = formatDate(new Date(entry.timestamp))
    if (entryDate !== today) return false

    if (templateId === 'cbt-analysis' && entry.tags.includes('distortion-caught')) return true
    if (templateId === 'evening-review' && entry.tags.includes('gratitude') && entry.tags.includes('victory')) return true
    if (templateId === 'morning-stoic' && entry.tags.includes('gratitude') && !entry.tags.includes('victory')) return true
    if (templateId === 'freeform' && entry.tags.length === 0) return true

    return false
  })
}

const isWidgetCompletedToday = (widgetId: string): boolean => {
  const todayMetric = recentMetrics.value[0]
  if (!todayMetric) return false

  switch (widgetId) {
    case 'W_CHECKIN':
      return true
    case 'W_EVIDENCE':
      return todayMetric.cbtPractice ?? false
    case 'W_STOIC':
      return todayMetric.meditation ?? false
    case 'W_URGESURF':
    case 'W_DENTS':
    case 'W_TAPE':
      return todayMetric.cbtPractice ?? false
    default:
      return false
  }
}

// ============================================
// Time-Aware Task Scheduling
// ============================================

type TaskTimeStatus = 'current' | 'upcoming' | 'passed' | 'anytime'

function getTaskTimeStatus(
  startHour: number | undefined,
  endHour: number | undefined,
  currentHour: number
): TaskTimeStatus {
  if (startHour === undefined || endHour === undefined) return 'anytime'

  // Handle overnight windows (e.g., 22-6)
  if (startHour > endHour) {
    if (currentHour >= startHour || currentHour < endHour) return 'current'
    if (currentHour < startHour && currentHour >= endHour) return 'upcoming'
    return 'passed'
  }

  // Normal same-day window
  if (currentHour >= startHour && currentHour < endHour) return 'current'
  if (currentHour < startHour) return 'upcoming'
  return 'passed'
}

function formatHour(hour: number): string {
  if (hour === 0) return '12am'
  if (hour === 12) return '12pm'
  if (hour < 12) return `${hour}am`
  return `${hour - 12}pm`
}

const todaysTasks = computed(() => {
  const enabledItems = practiceConfig.value.items
    .filter(item => item.enabled)
    .sort((a, b) => a.order - b.order)

  const currentHour = new Date().getHours()

  return enabledItems.map((item, index) => {
    const isJournal = item.type === 'journal'
    const completed = isJournal
      ? isJournalCompletedToday(item.journalTemplateId ?? '')
      : isWidgetCompletedToday(item.widgetId ?? '')

    const route: { name: string; query?: Record<string, string> } = isJournal
      ? { name: 'journal', query: item.journalTemplateId ? { template: item.journalTemplateId } : undefined }
      : { name: 'activities', query: item.widgetId ? { activity: item.widgetId } : undefined }

    const timeStatus = getTaskTimeStatus(item.startHour, item.endHour, currentHour)
    const startsAtLabel = item.startHour !== undefined ? `Starts at ${formatHour(item.startHour)}` : null

    return {
      id: index + 1,
      label: item.label,
      description: item.description,
      completed,
      route,
      timeStatus,
      startsAtLabel,
      startHour: item.startHour
    }
  })
})

const focusTask = computed(() => {
  const incomplete = todaysTasks.value.filter(t => !t.completed)
  if (incomplete.length === 0) return null

  // Priority 1: Current window tasks (actionable now)
  const currentTasks = incomplete.filter(t => t.timeStatus === 'current')
  if (currentTasks.length > 0) {
    return { ...currentTasks[0], buttonLabel: 'Start Now', isPreview: false }
  }

  // Priority 2: Upcoming tasks (preview with start time)
  const upcomingTasks = incomplete
    .filter(t => t.timeStatus === 'upcoming')
    .sort((a, b) => (a.startHour ?? 24) - (b.startHour ?? 24))
  if (upcomingTasks.length > 0) {
    return { ...upcomingTasks[0], buttonLabel: upcomingTasks[0].startsAtLabel ?? 'Upcoming', isPreview: true }
  }

  // Priority 3: Anytime tasks
  const anytimeTasks = incomplete.filter(t => t.timeStatus === 'anytime')
  if (anytimeTasks.length > 0) {
    return { ...anytimeTasks[0], buttonLabel: 'Start Now', isPreview: false }
  }

  // Priority 4: Passed tasks (late night fallback - show as actionable)
  const passedTasks = incomplete.filter(t => t.timeStatus === 'passed')
  if (passedTasks.length > 0) {
    return { ...passedTasks[0], buttonLabel: 'Start Now', isPreview: false }
  }

  return null
})

const allTasksComplete = computed(() => todaysTasks.value.length > 0 && todaysTasks.value.every(t => t.completed))

// ============================================
// Pillar Health Cards
// ============================================

// Pillar 1: Program Status
const pillar1Status = computed(() => {
  const philosophy = profile.value?.philosophy || 'Recovery'
  const label = philosophy === 'SMART' ? 'SMART Study'
    : philosophy === '12Step' ? '12-Step Work'
    : philosophy === 'RecoveryDharma' ? 'Dharma Practice'
    : 'Recovery Study'

  // Find most recent day with study=true
  const lastStudyIndex = recentMetrics.value.findIndex(m => m.study)
  const daysAgo = lastStudyIndex === -1 ? null : lastStudyIndex

  return { label, daysAgo }
})

// Pillar 2: Network Accountability
const pillar2Status = computed(() => {
  // Find most recent connection day
  const lastConnectionIndex = recentMetrics.value.findIndex(m => m.connectionTime)
  const daysAgo = lastConnectionIndex === -1 ? null : lastConnectionIndex

  // Get primary partner
  const partnerId = supportNetwork.value?.primaryPartner
  const partner = partnerId
    ? supportNetwork.value?.tier1.find(p => p.id === partnerId)
    : supportNetwork.value?.tier1[0]

  return { daysAgo, partner }
})

const connectionStatusClass = computed(() => {
  if (pillar2Status.value.daysAgo === null) return 'text-slate-500'
  if (pillar2Status.value.daysAgo === 0) return 'text-emerald-400'
  return 'text-amber-400'
})

const connectionStatusText = computed(() => {
  if (pillar2Status.value.daysAgo === null) return 'Not tracked'
  if (pillar2Status.value.daysAgo === 0) return 'Today'
  return `${pillar2Status.value.daysAgo} day${pillar2Status.value.daysAgo > 1 ? 's' : ''} ago`
})

const getContactHref = (person: SupportPerson): string => {
  switch (person.contactMethod) {
    case 'phone':
      return `tel:${person.contactInfo}`
    case 'text':
      return `sms:${person.contactInfo}`
    case 'email':
      return `mailto:${person.contactInfo}`
    default:
      return '#'
  }
}

// ============================================
// Quick Capture
// ============================================

const sendQuickCapture = async () => {
  const content = quickCapture.value.trim()
  if (!content || isSending.value) return

  isSending.value = true

  try {
    // Crisis check before navigation
    const assessment = await assessMessage(content)

    if (shouldBlockFlow(assessment)) {
      // Crisis modal will be shown automatically by useCrisis
      isSending.value = false
      return
    }

    // Navigate to chat with message
    router.push({
      name: 'chat',
      query: { quickCapture: encodeURIComponent(content) }
    })
  } catch (error) {
    console.error('Quick capture error:', error)
    isSending.value = false
  }
}

// ============================================
// Data Loading
// ============================================

onMounted(async () => {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [profileData, metricsData, networkData, contactData, practiceData, journalData] = await Promise.all([
      getProfile(),
      getMetrics({ limit: 30 }),
      getSupportNetwork(),
      getEmergencyContact(),
      getDailyPracticeConfig(),
      getJournalEntries({ after: todayStart.getTime(), limit: 20 })
    ])

    profile.value = profileData
    recentMetrics.value = metricsData
    supportNetwork.value = networkData
    emergencyContact.value = contactData
    practiceConfig.value = practiceData
    todayJournalEntries.value = journalData
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  } finally {
    isLoading.value = false
  }
})

// ============================================
// Navigation
// ============================================

const goToTask = (task: { route: { name: string; query?: Record<string, string> } }) => {
  router.push(task.route)
}

const goToCommitment = () => {
  router.push({ name: 'chat', query: { showWidget: 'W_COMMITMENT', widgetMode: 'view' } })
}
</script>

<template>
  <div class="h-full overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center h-64">
      <div class="animate-pulse text-slate-400">Loading your data...</div>
    </div>

    <div v-else class="space-y-6 animate-fade-in">
      <!-- System Status Indicator (HUD) -->
      <div
        v-if="recentMetrics.length > 0"
        class="p-4 rounded-lg border"
        :class="statusContainerClass"
        role="status"
        :aria-label="statusMessage"
      >
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 rounded-full" :class="statusDotClass"></div>
          <span class="font-mono text-sm text-slate-200">{{ statusMessage }}</span>
        </div>
      </div>

      <!-- Empty State for HUD when no metrics -->
      <div
        v-else
        class="p-4 rounded-lg border bg-slate-800/50 border-slate-700"
      >
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 rounded-full bg-slate-500"></div>
          <span class="font-mono text-sm text-slate-400">No metrics tracked yet. Complete your first check-in to see system status.</span>
        </div>
      </div>

      <!-- Metric Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          v-for="metric in metricCards"
          :key="metric.label"
          class="bg-slate-800 p-4 rounded-lg border border-slate-700"
          role="region"
          :aria-label="`${metric.label}: ${metric.streak} ${metric.unit}`"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-slate-400 text-xs uppercase tracking-wider">
              {{ metric.label }}
            </span>
            <component
              v-if="metric.trend !== 'stable'"
              :is="metric.trend === 'up' ? TrendingUp : TrendingDown"
              :size="14"
              :class="metric.trend === 'up' ? 'text-emerald-400' : 'text-amber-400'"
              :aria-label="metric.trend === 'up' ? 'Trending up' : 'Trending down'"
            />
            <Minus
              v-else
              :size="14"
              class="text-slate-500"
              aria-label="Stable trend"
            />
          </div>
          <div class="flex items-baseline gap-2">
            <span
              class="text-2xl font-bold"
              :class="metric.status === 'success' ? 'text-emerald-400' : 'text-amber-400'"
            >
              {{ metric.streak }}
            </span>
            <span class="text-slate-500 text-sm">{{ metric.unit }}</span>
          </div>
        </div>
      </div>

      <!-- Leading Indicators Warning (shows when drift/critical) -->
      <div
        v-if="leadingIndicators.length > 0"
        class="bg-amber-900/20 border border-amber-600/30 p-4 rounded-lg"
      >
        <h3 class="text-amber-500 font-semibold flex items-center gap-2 mb-2">
          <AlertTriangle :size="18" />
          Risk Analysis: Leading Indicators Detected
        </h3>
        <p class="text-slate-300 text-sm mb-3">
          Your metrics suggest a drift in discipline. The IRF identifies this as a high-risk window for rationalization.
        </p>
        <ul class="space-y-2">
          <li
            v-for="indicator in leadingIndicators"
            :key="indicator.id"
            class="flex items-center gap-2 text-sm text-slate-400 bg-black/20 p-2 rounded"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            {{ indicator.text }}
          </li>
        </ul>
        <button
          @click="goToCommitment"
          class="mt-3 text-xs bg-amber-700/30 hover:bg-amber-700/50 text-amber-200 px-3 py-1.5 rounded border border-amber-600/30 transition-colors"
        >
          Review Commitment Statement
        </button>
      </div>

      <!-- Two Column Section: Focus Card + Pillar Health -->
      <div class="grid md:grid-cols-2 gap-6">
        <!-- LEFT: Focus Card -->
        <div class="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 class="text-slate-400 text-xs uppercase tracking-wider mb-4">Next Action</h3>

          <template v-if="focusTask">
            <h4 class="text-white font-semibold text-lg mb-2">{{ focusTask.label }}</h4>
            <p class="text-slate-400 text-sm mb-4">{{ focusTask.description }}</p>
            <button
              @click="goToTask(focusTask)"
              :class="focusTask.isPreview
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'"
              class="px-4 py-2 rounded-lg transition-colors"
            >
              {{ focusTask.buttonLabel }}
            </button>
          </template>

          <template v-else-if="allTasksComplete">
            <div class="text-center py-4">
              <CheckCircle2 class="text-emerald-400 mx-auto mb-2" :size="32" />
              <h4 class="text-emerald-400 font-semibold">All Practice Complete</h4>
              <p class="text-slate-500 text-sm">Great work today!</p>
            </div>
          </template>

          <template v-else>
            <div class="text-center py-4">
              <p class="text-slate-500 text-sm">No practice items configured.</p>
              <router-link
                to="/settings"
                class="text-indigo-400 hover:text-indigo-300 text-sm"
              >
                Configure daily practice
              </router-link>
            </div>
          </template>
        </div>

        <!-- RIGHT: Pillar Health Cards -->
        <div class="space-y-4">
          <!-- Pillar 1: Program Status -->
          <div class="bg-slate-800 rounded-lg p-5 border border-slate-700">
            <h3 class="text-slate-400 text-xs uppercase tracking-wider mb-3">Pillar 1: Program</h3>
            <div class="flex items-center justify-between">
              <span class="text-slate-200">{{ pillar1Status.label }}</span>
              <span
                :class="pillar1Status.daysAgo === 0 ? 'text-emerald-400' : pillar1Status.daysAgo === null ? 'text-slate-500' : 'text-amber-400'"
                class="text-sm"
              >
                {{ pillar1Status.daysAgo === null ? 'Not tracked' :
                   pillar1Status.daysAgo === 0 ? 'Today' :
                   `${pillar1Status.daysAgo} day${pillar1Status.daysAgo > 1 ? 's' : ''} ago` }}
              </span>
            </div>
          </div>

          <!-- Pillar 2: Network Accountability -->
          <div class="bg-slate-800 rounded-lg p-5 border border-slate-700">
            <h3 class="text-slate-400 text-xs uppercase tracking-wider mb-3">Pillar 2: Network</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-slate-200">Connection Time</span>
                <span :class="connectionStatusClass" class="text-sm">
                  {{ connectionStatusText }}
                </span>
              </div>
              <div v-if="pillar2Status.partner" class="flex items-center justify-between">
                <span class="text-slate-400 text-sm">Primary: {{ pillar2Status.partner.name }}</span>
                <a
                  :href="getContactHref(pillar2Status.partner)"
                  class="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <component
                    :is="pillar2Status.partner.contactMethod === 'phone' ? Phone : pillar2Status.partner.contactMethod === 'email' ? Mail : MessageCircle"
                    :size="12"
                  />
                  Contact
                </a>
              </div>
              <div v-else class="text-slate-500 text-sm">
                <router-link to="/network" class="text-indigo-400 hover:text-indigo-300">
                  Add support contacts
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Capture Bar -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div class="flex gap-3">
          <input
            v-model="quickCapture"
            placeholder="Log a thought, urge, or win..."
            @keydown.enter="sendQuickCapture"
            :disabled="isSending"
            class="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2
                   text-slate-200 placeholder-slate-500 focus:outline-none
                   focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                   disabled:opacity-50"
          />
          <button
            @click="sendQuickCapture"
            :disabled="!quickCapture.trim() || isSending"
            class="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700
                   disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
            aria-label="Send quick capture"
          >
            <Send :size="18" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
