<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  ChevronRight
} from 'lucide-vue-next'
import { useVault } from '@/composables/useVault'
import { detectLeadingIndicators } from '@/services/orchestrator'
import type { DailyMetric, UserProfile, SupportNetwork, EmergencyContact } from '@/types'

const router = useRouter()
const { getProfile, getMetrics, getSupportNetwork, getEmergencyContact } = useVault()

// Real data from vault
const profile = ref<UserProfile | null>(null)
const recentMetrics = ref<DailyMetric[]>([])
const supportNetwork = ref<SupportNetwork | null>(null)
const emergencyContact = ref<EmergencyContact | null>(null)
const isLoading = ref(true)

// Computed metrics display
const metricCards = computed(() => {
  if (recentMetrics.value.length === 0) {
    return [
      { label: 'Sobriety', status: 'success', streak: 0, unit: 'days' },
      { label: 'Exercise', status: 'warning', streak: 0, unit: 'days' },
      { label: 'Meditation', status: 'warning', streak: 0, unit: 'days' },
      { label: 'Mood Avg', status: 'success', streak: 0, unit: '/10' },
    ]
  }

  // Calculate streaks
  let sobrietyStreak = 0
  let exerciseStreak = 0
  let meditationStreak = 0

  for (const metric of recentMetrics.value) {
    if (metric.sobrietyMaintained) sobrietyStreak++
    else break
  }

  for (const metric of recentMetrics.value) {
    if (metric.exercise) exerciseStreak++
    else break
  }

  for (const metric of recentMetrics.value) {
    if (metric.meditation) meditationStreak++
    else break
  }

  const avgMood = recentMetrics.value.length > 0
    ? Math.round(recentMetrics.value.reduce((sum, m) => sum + m.moodScore, 0) / recentMetrics.value.length * 10) / 10
    : 0

  return [
    { label: 'Sobriety', status: sobrietyStreak > 0 ? 'success' : 'warning', streak: sobrietyStreak, unit: 'days' },
    { label: 'Exercise', status: exerciseStreak > 0 ? 'success' : 'warning', streak: exerciseStreak, unit: 'days' },
    { label: 'Meditation', status: meditationStreak > 0 ? 'success' : 'warning', streak: meditationStreak, unit: 'days' },
    { label: 'Mood Avg', status: avgMood >= 6 ? 'success' : 'warning', streak: avgMood, unit: '/10' },
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

// Today's tasks - derived from metrics
const todaysTasks = computed(() => {
  const todayMetric = recentMetrics.value[0]
  return [
    {
      id: 1,
      label: 'Morning Reflection',
      description: 'Stoic Dichotomy of Control exercise',
      completed: todayMetric?.meditation ?? false,
      route: { name: 'activities', query: { activity: 'W_STOIC' } }
    },
    {
      id: 2,
      label: 'Daily Check-In',
      description: 'Track your sobriety, mood, and habits',
      completed: !!todayMetric,
      route: { name: 'activities' }
    },
    {
      id: 3,
      label: 'Evening CBT Review',
      description: 'Evidence examination exercise',
      completed: todayMetric?.cbtPractice ?? false,
      route: { name: 'activities', query: { activity: 'W_EVIDENCE' } }
    },
  ]
})

// Support network display
const supportPeople = computed(() => {
  const people: Array<{ id: string; initials: string; name: string; role: string; lastCheckin?: string; nextSession?: string }> = []

  if (emergencyContact.value) {
    people.push({
      id: emergencyContact.value.id,
      initials: emergencyContact.value.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      name: emergencyContact.value.name,
      role: 'Emergency',
      lastCheckin: 'Set up'
    })
  }

  if (supportNetwork.value) {
    for (const person of supportNetwork.value.tier1) {
      people.push({
        id: person.id,
        initials: person.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
        name: person.name,
        role: person.relationship,
        lastCheckin: 'Available'
      })
    }
  }

  return people.slice(0, 3) // Show max 3
})

// Load data on mount
onMounted(async () => {
  try {
    const [profileData, metricsData, networkData, contactData] = await Promise.all([
      getProfile(),
      getMetrics({ limit: 7 }),
      getSupportNetwork(),
      getEmergencyContact()
    ])

    profile.value = profileData
    recentMetrics.value = metricsData
    supportNetwork.value = networkData
    emergencyContact.value = contactData
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
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          v-for="metric in metricCards"
          :key="metric.label"
          class="bg-slate-800 p-4 rounded-lg border border-slate-700"
        >
          <div class="text-slate-400 text-xs uppercase tracking-wider mb-1">
            {{ metric.label }}
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
        class="bg-gradient-to-r from-indigo-900/50 to-slate-800 border border-indigo-500/30 p-6 rounded-lg cursor-pointer hover:border-indigo-500/50 transition-colors"
        @click="goToChat"
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
              class="flex items-center gap-3 p-3 hover:bg-slate-700/50 rounded-lg cursor-pointer group transition-colors"
            >
              <div
                class="w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0"
                :class="task.completed
                  ? 'bg-emerald-500 border-emerald-500'
                  : 'border-slate-600 group-hover:border-slate-400'"
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
              <button class="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded transition-colors">
                Contact
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
