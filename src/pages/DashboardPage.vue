<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Phone,
  Mail,
  MessageCircle
} from 'lucide-vue-next'
import { useVault } from '@/composables/useVault'
import { detectLeadingIndicators } from '@/services/orchestrator'
import type { DailyMetric, UserProfile, SupportNetwork, EmergencyContact, DailyPracticeConfig, JournalEntry } from '@/types'

const router = useRouter()
const { getProfile, getMetrics, getSupportNetwork, getEmergencyContact, getDailyPracticeConfig, getJournalEntries } = useVault()

// Real data from vault
const profile = ref<UserProfile | null>(null)
const recentMetrics = ref<DailyMetric[]>([])
const supportNetwork = ref<SupportNetwork | null>(null)
const emergencyContact = ref<EmergencyContact | null>(null)
const practiceConfig = ref<DailyPracticeConfig>({ items: [] })
const todayJournalEntries = ref<JournalEntry[]>([])
const isLoading = ref(true)

// Calculate trend from recent data (current period vs previous period)
// More lenient: works with as few as 4 days of data (2 current + 2 previous)
const calculateTrend = (
  getValue: (m: DailyMetric) => boolean | number | undefined,
  isBooleanMetric: boolean
): 'up' | 'down' | 'stable' => {
  const total = recentMetrics.value.length
  if (total < 4) return 'stable'

  // Split data in half for comparison
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
  // For boolean metrics, 10% change is significant. For scores, use 0.5 threshold
  const threshold = isBooleanMetric ? 0.1 : 0.5
  if (Math.abs(diff) < threshold) return 'stable'
  return diff > 0 ? 'up' : 'down'
}

// Computed metrics display
const metricCards = computed(() => {
  if (recentMetrics.value.length === 0) {
    return [
      { label: 'Sobriety', status: 'success', streak: 0, unit: 'days', trend: 'stable' as const },
      { label: 'Exercise', status: 'warning', streak: 0, unit: 'days', trend: 'stable' as const },
      { label: 'Meditation', status: 'warning', streak: 0, unit: 'days', trend: 'stable' as const },
      { label: 'Mood Avg', status: 'success', streak: 0, unit: '/10', trend: 'stable' as const },
    ]
  }

  // Calculate streaks from consecutive true values starting from most recent
  let sobrietyStreak = 0
  let exerciseStreak = 0
  let meditationStreak = 0

  for (const metric of recentMetrics.value) {
    if (metric.sobrietyMaintained === true) sobrietyStreak++
    else break
  }

  for (const metric of recentMetrics.value) {
    if (metric.exercise === true) exerciseStreak++
    else break
  }

  for (const metric of recentMetrics.value) {
    if (metric.meditation === true) meditationStreak++
    else break
  }

  const avgMood = recentMetrics.value.length > 0
    ? Math.round(recentMetrics.value.reduce((sum, m) => sum + m.moodScore, 0) / recentMetrics.value.length * 10) / 10
    : 0

  return [
    {
      label: 'Sobriety',
      status: sobrietyStreak > 0 ? 'success' : 'warning',
      streak: sobrietyStreak,
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

// Leading indicators from orchestrator
const leadingIndicators = computed(() => {
  return detectLeadingIndicators(recentMetrics.value).map((text, id) => ({
    id,
    text,
    severity: text.includes('Sobriety') ? 'high' : 'medium'
  }))
})

// Helper to check if a journal template was completed today
const isJournalCompletedToday = (templateId: string): boolean => {
  // Check if any journal entry from today matches the template
  // We infer template from tags (matching JournalPage logic)
  const today = new Date().toISOString().split('T')[0]
  return todayJournalEntries.value.some(entry => {
    const entryDate = new Date(entry.timestamp).toISOString().split('T')[0]
    if (entryDate !== today) return false

    // Match template by tags (same logic as getTemplateName in JournalPage)
    if (templateId === 'cbt-analysis' && entry.tags.includes('distortion-caught')) return true
    if (templateId === 'evening-review' && entry.tags.includes('gratitude') && entry.tags.includes('victory')) return true
    if (templateId === 'morning-stoic' && entry.tags.includes('gratitude') && !entry.tags.includes('victory')) return true
    if (templateId === 'freeform' && entry.tags.length === 0) return true

    return false
  })
}

// Helper to check if a widget was completed today
const isWidgetCompletedToday = (widgetId: string): boolean => {
  const todayMetric = recentMetrics.value[0]
  if (!todayMetric) return false

  // Map widget IDs to metric fields
  switch (widgetId) {
    case 'W_CHECKIN':
      return true // If todayMetric exists, check-in was done
    case 'W_EVIDENCE':
      return todayMetric.cbtPractice ?? false
    case 'W_STOIC':
      return todayMetric.meditation ?? false
    case 'W_URGESURF':
    case 'W_DENTS':
    case 'W_TAPE':
      // These don't have direct metric mappings, check cbtPractice as proxy
      return todayMetric.cbtPractice ?? false
    default:
      return false
  }
}

// Today's tasks - derived from practice config
const todaysTasks = computed(() => {
  const enabledItems = practiceConfig.value.items
    .filter(item => item.enabled)
    .sort((a, b) => a.order - b.order)

  return enabledItems.map((item, index) => {
    const isJournal = item.type === 'journal'
    const completed = isJournal
      ? isJournalCompletedToday(item.journalTemplateId ?? '')
      : isWidgetCompletedToday(item.widgetId ?? '')

    // Build route with properly typed query params
    const route: { name: string; query?: Record<string, string> } = isJournal
      ? { name: 'journal', query: item.journalTemplateId ? { template: item.journalTemplateId } : undefined }
      : { name: 'activities', query: item.widgetId ? { activity: item.widgetId } : undefined }

    return {
      id: index + 1,
      label: item.label,
      description: item.description,
      completed,
      route
    }
  })
})

// Support network display with contact info
interface SupportPersonDisplay {
  id: string
  initials: string
  name: string
  role: string
  lastCheckin?: string
  nextSession?: string
  contactMethod: 'phone' | 'email' | 'text'
  contactInfo: string
}

const supportPeople = computed((): SupportPersonDisplay[] => {
  const people: SupportPersonDisplay[] = []

  if (emergencyContact.value) {
    people.push({
      id: emergencyContact.value.id,
      initials: emergencyContact.value.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      name: emergencyContact.value.name,
      role: 'Emergency',
      lastCheckin: 'Set up',
      contactMethod: 'phone',
      contactInfo: emergencyContact.value.phone
    })
  }

  if (supportNetwork.value) {
    for (const person of supportNetwork.value.tier1) {
      people.push({
        id: person.id,
        initials: person.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
        name: person.name,
        role: person.relationship,
        lastCheckin: 'Available',
        contactMethod: person.contactMethod,
        contactInfo: person.contactInfo
      })
    }
  }

  return people.slice(0, 3) // Show max 3
})

const getContactHref = (person: SupportPersonDisplay): string => {
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

const getContactIcon = (method: 'phone' | 'email' | 'text') => {
  switch (method) {
    case 'phone': return Phone
    case 'text': return MessageCircle
    case 'email': return Mail
  }
}

// Load data on mount
onMounted(async () => {
  try {
    // Get today's date for journal query
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [profileData, metricsData, networkData, contactData, practiceData, journalData] = await Promise.all([
      getProfile(),
      getMetrics({ limit: 30 }), // Increased from 7 for better trend calculation
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

const goToChat = () => {
  router.push({ name: 'chat' })
}

const goToCommitment = () => {
  router.push({ name: 'chat', query: { showWidget: 'W_COMMITMENT', widgetMode: 'view' } })
}

const goToTask = (task: { route: { name: string; query?: Record<string, string> } }) => {
  router.push(task.route)
}

const currentDate = computed(() => {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
})

const greeting = computed(() => {
  if (profile.value?.displayName) {
    return `Welcome back, ${profile.value.displayName}`
  }
  return 'Welcome back'
})
</script>

<template>
  <div class="h-full overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center h-64">
      <div class="animate-pulse text-slate-400">Loading your data...</div>
    </div>

    <div v-else class="space-y-6 animate-fade-in">
      <!-- Greeting -->
      <div class="mb-2">
        <h1 class="text-xl font-semibold text-white">{{ greeting }}</h1>
        <p class="text-slate-400 text-sm">{{ currentDate }}</p>
      </div>

      <!-- Metric Cards -->
      <div
        v-if="recentMetrics.length === 0"
        class="bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center"
      >
        <p class="text-slate-400 mb-3">No metrics tracked yet. Start your daily check-in to see your progress.</p>
        <router-link
          to="/activities"
          class="inline-block text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Start Tracking
        </router-link>
      </div>
      <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      <!-- Leading Indicators Warning -->
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

      <!-- Quick Chat CTA -->
      <div
        class="bg-gradient-to-r from-indigo-900/50 to-slate-800 border border-indigo-500/30 p-6 rounded-lg cursor-pointer hover:border-indigo-500/50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        @click="goToChat"
        @keydown.enter="goToChat"
        @keydown.space.prevent="goToChat"
        role="button"
        tabindex="0"
        aria-label="Talk to Remi - your recovery companion"
      >
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold shadow-lg">
            R
          </div>
          <div class="flex-1">
            <h3 class="text-white font-semibold">Talk to Remi</h3>
            <p class="text-slate-400 text-sm">Need to process something? I'm here to help.</p>
          </div>
          <MessageSquare class="text-indigo-400" :size="24" />
        </div>
      </div>

      <!-- Two Column Section -->
      <div class="grid md:grid-cols-2 gap-6">
        <!-- Today's Practice -->
        <div class="bg-slate-800 rounded-lg p-5 border border-slate-700">
          <h3 class="text-slate-200 font-medium mb-4 flex items-center justify-between">
            Today's Practice
            <span class="text-xs text-slate-500">{{ currentDate }}</span>
          </h3>
          <div class="space-y-2">
            <div
              v-for="task in todaysTasks"
              :key="task.id"
              @click="goToTask(task)"
              @keydown.enter="goToTask(task)"
              @keydown.space.prevent="goToTask(task)"
              role="button"
              tabindex="0"
              :aria-label="`${task.label}: ${task.description}. ${task.completed ? 'Completed' : 'Not completed'}`"
              class="flex items-center gap-3 p-3 hover:bg-slate-700/50 rounded-lg cursor-pointer group transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800"
            >
              <div
                class="w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0"
                :class="task.completed
                  ? 'bg-emerald-500 border-emerald-500'
                  : 'border-slate-600 group-hover:border-slate-400'"
                aria-hidden="true"
              >
                <CheckCircle2 v-if="task.completed" :size="14" class="text-white" />
              </div>
              <div class="flex-1 min-w-0">
                <span :class="task.completed ? 'text-slate-500 line-through' : 'text-slate-300'">
                  {{ task.label }}
                </span>
                <p class="text-xs text-slate-500 mt-0.5">{{ task.description }}</p>
              </div>
              <ChevronRight
                :size="18"
                class="text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        <!-- Support Network Status -->
        <div class="bg-slate-800 rounded-lg p-5 border border-slate-700">
          <h3 class="text-slate-200 font-medium mb-4">Support Network Status</h3>
          <div v-if="supportPeople.length === 0" class="text-slate-500 text-sm">
            No support contacts added yet.
            <router-link to="/network" class="text-indigo-400 hover:text-indigo-300">Add contacts</router-link>
          </div>
          <div v-else class="space-y-4">
            <div
              v-for="person in supportPeople"
              :key="person.id"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-indigo-900 text-indigo-300 flex items-center justify-center font-bold text-xs">
                  {{ person.initials }}
                </div>
                <div>
                  <div class="text-sm text-slate-200">{{ person.name }} ({{ person.role }})</div>
                  <div class="text-xs text-slate-500">
                    {{ person.lastCheckin ? `Status: ${person.lastCheckin}` : `Session in ${person.nextSession}` }}
                  </div>
                </div>
              </div>
              <a
                :href="getContactHref(person)"
                class="inline-flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                :aria-label="`Contact ${person.name} via ${person.contactMethod}`"
              >
                <component :is="getContactIcon(person.contactMethod)" :size="12" aria-hidden="true" />
                Contact
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
