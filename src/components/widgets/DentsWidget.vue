<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ShieldAlert, CheckCircle2, Circle, Pause, Play } from 'lucide-vue-next'
import type { WidgetCompletionState } from '@/types'

const props = withDefaults(defineProps<{
  trigger?: string
  intensity?: number
  completionState?: WidgetCompletionState
}>(), {
  trigger: 'unspecified',
  intensity: 5
})

const emit = defineEmits<{
  complete: [{ success: boolean; stepsCompleted: string[] }]
}>()

// Restore state from completionState if present
const completedSteps = (props.completionState?.result?.stepsCompleted as string[]) ?? []

const timeLeft = ref(600) // 10 minutes
const isActive = ref(true)
const isSubmitted = ref(!!props.completionState)
let interval: ReturnType<typeof setInterval> | null = null

const steps = ref([
  {
    id: 'delay',
    letter: 'D',
    label: 'Delay',
    description: 'I will not act for 10 minutes.',
    checked: completedSteps.includes('delay')
  },
  {
    id: 'escape',
    letter: 'E',
    label: 'Escape',
    description: 'Leave the immediate situation.',
    checked: completedSteps.includes('escape')
  },
  {
    id: 'neutralize',
    letter: 'N',
    label: 'Neutralize',
    description: '"This is just a thought, not a command."',
    checked: completedSteps.includes('neutralize')
  },
  {
    id: 'tasks',
    letter: 'T',
    label: 'Tasks',
    description: 'Do the dishes or walk around the block.',
    checked: completedSteps.includes('tasks')
  },
  {
    id: 'swap',
    letter: 'S',
    label: 'Swap',
    description: 'Change the feeling (music, cold water).',
    checked: completedSteps.includes('swap')
  },
])

const completedCount = computed(() => steps.value.filter(s => s.checked).length)
const allCompleted = computed(() => completedCount.value === steps.value.length)
const timerExpired = computed(() => timeLeft.value <= 0)
const progress = computed(() => ((600 - timeLeft.value) / 600) * 100)

onMounted(() => {
  if (!isSubmitted.value) {
    startTimer()
  }
})

onUnmounted(() => {
  stopTimer()
})

const startTimer = () => {
  if (interval) return
  isActive.value = true
  interval = setInterval(() => {
    if (isActive.value && timeLeft.value > 0) {
      timeLeft.value--
    }
  }, 1000)
}

const stopTimer = () => {
  if (interval) {
    clearInterval(interval)
    interval = null
  }
}

const toggleTimer = () => {
  isActive.value = !isActive.value
}

const toggleStep = (id: string) => {
  const step = steps.value.find(s => s.id === id)
  if (step) {
    step.checked = !step.checked
  }
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

const logOutcome = () => {
  if (isSubmitted.value) return
  isSubmitted.value = true
  emit('complete', {
    success: true,
    stepsCompleted: steps.value.filter(s => s.checked).map(s => s.id)
  })
}
</script>

<template>
  <div class="widget-container p-4 my-3 max-w-md w-full">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
      <h3 class="text-indigo-400 font-bold flex items-center gap-2">
        <ShieldAlert :size="18" />
        DENTS Protocol Active
      </h3>
      <div class="flex items-center gap-2">
        <button
          @click="toggleTimer"
          class="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          :aria-label="isActive ? 'Pause timer' : 'Resume timer'"
        >
          <Pause v-if="isActive" :size="14" />
          <Play v-else :size="14" />
        </button>
        <div
          class="font-mono text-xl font-bold tabular-nums"
          :class="timeLeft < 120 ? 'text-red-400' : 'text-slate-200'"
        >
          {{ formatTime(timeLeft) }}
        </div>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="h-1 bg-slate-700 rounded-full mb-4 overflow-hidden">
      <div
        class="h-full bg-indigo-500 transition-all duration-1000"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>

    <!-- Steps -->
    <div class="space-y-2">
      <div
        v-for="step in steps"
        :key="step.id"
        @click="toggleStep(step.id)"
        class="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all"
        :class="step.checked
          ? 'bg-emerald-900/20 border border-emerald-500/30'
          : 'bg-slate-700/30 hover:bg-slate-700/50 border border-transparent'"
      >
        <div
          class="mt-0.5 transition-colors"
          :class="step.checked ? 'text-emerald-500' : 'text-slate-500'"
        >
          <CheckCircle2 v-if="step.checked" :size="20" />
          <Circle v-else :size="20" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold"
              :class="step.checked
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-indigo-500/20 text-indigo-400'"
            >
              {{ step.letter }}
            </span>
            <span
              class="font-medium"
              :class="step.checked ? 'text-emerald-400' : 'text-slate-200'"
            >
              {{ step.label }}
            </span>
          </div>
          <p
            class="text-sm mt-1"
            :class="step.checked ? 'text-slate-500 line-through' : 'text-slate-400'"
          >
            {{ step.description }}
          </p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between">
      <div class="text-xs text-slate-400">
        <span>Intensity: {{ intensity }}/10</span>
        <span class="mx-2">|</span>
        <span>{{ completedCount }}/5 steps</span>
      </div>
      <button
        @click="logOutcome"
        :disabled="completedCount === 0 || isSubmitted"
        class="text-sm px-3 py-1.5 rounded transition-colors"
        :class="isSubmitted
          ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
          : completedCount > 0
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'"
      >
        {{ isSubmitted ? 'Logged' : (allCompleted || timerExpired ? 'Complete Protocol' : 'Log Progress') }}
      </button>
    </div>

    <!-- Success Message -->
    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
    >
      <div
        v-if="allCompleted"
        class="mt-4 p-3 bg-emerald-900/30 border border-emerald-500/30 rounded-lg text-center"
      >
        <p class="text-emerald-400 font-medium">All steps completed!</p>
        <p class="text-slate-400 text-sm mt-1">You surfed this urge. Well done.</p>
      </div>
    </Transition>
  </div>
</template>
