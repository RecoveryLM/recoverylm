<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { Waves, Play, Pause, RotateCcw, CheckCircle2, Volume2, VolumeX, Mic, MicOff } from 'lucide-vue-next'
import { useAudioCues } from '@/composables/useAudioCues'

type WidgetState = 'briefing' | 'meditating' | 'complete'

interface Phase {
  title: string
  briefingText: string
  meditationPrompt: string
  speechCue: string
  duration: number // proportion of total time (0-1)
}

const props = withDefaults(defineProps<{
  duration?: number
}>(), {
  duration: 300 // 5 minutes default
})

const emit = defineEmits<{
  complete: [{ success: boolean; durationCompleted: number }]
}>()

// Audio system
const { playChime, speak, isSupported, setSpeechEnabled, setAudioEnabled } = useAudioCues()

// Widget state
const widgetState = ref<WidgetState>('briefing')
const timeLeft = ref(props.duration)
const isRunning = ref(false)
const isSubmitted = ref(false)
const currentPhase = ref(0)

// Audio preferences
const soundEnabled = ref(true)
const voiceEnabled = ref(false)

// Animation state
const waveOffset = ref(0)
const smoothProgress = ref(0)
let animationFrame: number | null = null
let timerInterval: ReturnType<typeof setInterval> | null = null

// Phase definitions with separate briefing and meditation text
const phases: Phase[] = [
  {
    title: 'Notice',
    briefingText: 'Feel where the urge lives in your body. Locate the physical sensation.',
    meditationPrompt: 'Feel the urge in your body',
    speechCue: 'Notice where you feel the urge',
    duration: 0.2
  },
  {
    title: 'Breathe',
    briefingText: 'Take slow, deep breaths. Inhale for 4, hold for 4, exhale for 4.',
    meditationPrompt: 'Breathe slowly and deeply',
    speechCue: 'Breathe deeply',
    duration: 0.3
  },
  {
    title: 'Observe',
    briefingText: 'Watch the urge like a wave. It rises, peaks, and will naturally fall.',
    meditationPrompt: 'Watch the wave rise and fall',
    speechCue: 'Observe the wave',
    duration: 0.3
  },
  {
    title: 'Accept',
    briefingText: 'You don\'t have to act on this feeling. Let it pass through you.',
    meditationPrompt: 'Let the feeling pass through',
    speechCue: 'Accept and release',
    duration: 0.2
  }
]

// Computed values
const progress = computed(() => ((props.duration - timeLeft.value) / props.duration) * 100)

const activePhase = computed(() => {
  const elapsed = props.duration - timeLeft.value
  const totalDuration = props.duration
  let accumulated = 0

  for (let i = 0; i < phases.length; i++) {
    accumulated += phases[i].duration * totalDuration
    if (elapsed < accumulated) {
      return i
    }
  }
  return phases.length - 1
})

// Time formatting
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

// Animation loop using requestAnimationFrame
const animate = (time: number) => {
  // Smooth wave animation
  waveOffset.value = (time * 0.001) % (Math.PI * 2)

  // Smooth progress interpolation (easing toward target)
  const targetProgress = progress.value
  smoothProgress.value += (targetProgress - smoothProgress.value) * 0.08

  if (widgetState.value === 'meditating') {
    animationFrame = requestAnimationFrame(animate)
  }
}

const startAnimation = () => {
  if (animationFrame === null) {
    animationFrame = requestAnimationFrame(animate)
  }
}

const stopAnimation = () => {
  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
}

// Timer controls
const startTimer = () => {
  if (timerInterval) return
  isRunning.value = true
  timerInterval = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
      currentPhase.value = activePhase.value
    } else {
      finish()
    }
  }, 1000)
}

const pauseTimer = () => {
  isRunning.value = false
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

const toggleTimer = () => {
  if (isRunning.value) {
    pauseTimer()
  } else {
    startTimer()
  }
}

const reset = () => {
  pauseTimer()
  timeLeft.value = props.duration
  currentPhase.value = 0
  smoothProgress.value = 0
  widgetState.value = 'briefing'
}

const finish = () => {
  pauseTimer()
  stopAnimation()
  widgetState.value = 'complete'
  if (soundEnabled.value) {
    playChime() // Final chime on completion
  }
}

// Meditation flow controls
const beginMeditation = () => {
  widgetState.value = 'meditating'
  setAudioEnabled(soundEnabled.value)
  setSpeechEnabled(voiceEnabled.value)

  // Initial phase announcement
  if (soundEnabled.value) {
    playChime()
  }
  if (voiceEnabled.value) {
    speak(phases[0].speechCue)
  }

  startAnimation()
  startTimer()
}

const complete = () => {
  if (isSubmitted.value) return
  isSubmitted.value = true
  emit('complete', {
    success: true,
    durationCompleted: props.duration - timeLeft.value
  })
}

// Toggle audio settings
const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value
  setAudioEnabled(soundEnabled.value)
}

const toggleVoice = () => {
  voiceEnabled.value = !voiceEnabled.value
  setSpeechEnabled(voiceEnabled.value)
}

// Watch for phase transitions to play audio cues
watch(currentPhase, (newPhase, oldPhase) => {
  if (newPhase !== oldPhase && widgetState.value === 'meditating') {
    if (soundEnabled.value) {
      playChime()
    }
    if (voiceEnabled.value) {
      speak(phases[newPhase].speechCue)
    }
  }
})

// Sync audio settings
watch(soundEnabled, (enabled) => {
  setAudioEnabled(enabled)
})

watch(voiceEnabled, (enabled) => {
  setSpeechEnabled(enabled)
})

onUnmounted(() => {
  pauseTimer()
  stopAnimation()
})
</script>

<template>
  <div class="widget-container p-4 my-3 max-w-md w-full">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
      <h3 class="text-blue-400 font-bold flex items-center gap-2">
        <Waves :size="18" />
        Urge Surfing
      </h3>
      <div class="text-slate-400 text-sm">
        {{ formatTime(props.duration) }} session
      </div>
    </div>

    <!-- Briefing Screen -->
    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="widgetState === 'briefing'" class="space-y-4">
        <p class="text-slate-300 text-sm">
          This guided meditation helps you ride out an urge without acting on it.
          Review the phases below, then close your eyes and follow the audio cues.
        </p>

        <!-- Phase Overview -->
        <div class="space-y-3">
          <div
            v-for="(phase, idx) in phases"
            :key="idx"
            class="flex gap-3 items-start"
          >
            <div class="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-medium">
              {{ idx + 1 }}
            </div>
            <div>
              <div class="text-blue-400 font-medium text-sm">{{ phase.title }}</div>
              <div class="text-slate-400 text-sm">{{ phase.briefingText }}</div>
            </div>
          </div>
        </div>

        <!-- Audio Options -->
        <div class="flex gap-4 py-2">
          <button
            @click="toggleSound"
            class="flex items-center gap-2 text-sm transition-colors"
            :class="soundEnabled ? 'text-blue-400' : 'text-slate-500'"
          >
            <Volume2 v-if="soundEnabled" :size="16" />
            <VolumeX v-else :size="16" />
            Sound cues
          </button>
          <button
            v-if="isSupported.speech"
            @click="toggleVoice"
            class="flex items-center gap-2 text-sm transition-colors"
            :class="voiceEnabled ? 'text-blue-400' : 'text-slate-500'"
          >
            <Mic v-if="voiceEnabled" :size="16" />
            <MicOff v-else :size="16" />
            Voice guidance
          </button>
        </div>

        <p class="text-slate-500 text-xs">
          A chime will sound at each phase transition. You can close your eyes during the meditation.
        </p>

        <!-- Begin Button -->
        <button
          @click="beginMeditation"
          class="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Play :size="18" />
          Begin Meditation
        </button>
      </div>
    </Transition>

    <!-- Completion View -->
    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
    >
      <div v-if="widgetState === 'complete'" class="text-center py-6">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-full mb-4">
          <CheckCircle2 class="text-emerald-400" :size="32" />
        </div>
        <h4 class="text-emerald-400 font-medium text-lg mb-2">Wave Surfed</h4>
        <p class="text-slate-400 text-sm mb-4">
          You rode this urge without giving in. It has passed.
        </p>
        <p class="text-slate-500 text-xs mb-4">
          Duration: {{ formatTime(duration - timeLeft) }}
        </p>
        <button
          @click="complete"
          :disabled="isSubmitted"
          class="text-white px-6 py-2 rounded transition-colors"
          :class="isSubmitted
            ? 'bg-slate-600 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-500'"
        >
          {{ isSubmitted ? 'Logged' : 'Log This Session' }}
        </button>
      </div>
    </Transition>

    <!-- Active Meditation Session -->
    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="widgetState === 'meditating'">
        <!-- Wave Animation -->
        <div class="relative h-24 mb-4 overflow-hidden rounded-lg bg-slate-800/50">
          <div
            class="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-blue-500/30 to-blue-600/20 will-change-transform"
            :style="{ transform: `translateX(${Math.sin(waveOffset) * 20}%)` }"
          ></div>

          <!-- Phase indicator with fixed height container -->
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="text-center h-16 flex flex-col justify-center">
              <Transition
                mode="out-in"
                enter-active-class="transition-opacity duration-300"
                enter-from-class="opacity-0"
                enter-to-class="opacity-100"
                leave-active-class="transition-opacity duration-150"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
              >
                <div :key="currentPhase">
                  <div class="text-blue-400 text-xs uppercase tracking-wide mb-1">
                    {{ phases[currentPhase].title }}
                  </div>
                  <div class="text-slate-200 text-sm max-w-xs px-4">
                    {{ phases[currentPhase].meditationPrompt }}
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>

        <!-- Timer Display -->
        <div class="text-center mb-4">
          <div
            class="font-mono text-4xl font-bold tabular-nums"
            :class="timeLeft < 60 ? 'text-emerald-400' : 'text-slate-200'"
          >
            {{ formatTime(timeLeft) }}
          </div>
          <div class="text-slate-500 text-xs mt-1">remaining</div>
        </div>

        <!-- Progress Bar (smooth interpolation, no CSS transition) -->
        <div class="h-2 bg-slate-700 rounded-full mb-4 overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-blue-600 to-blue-400"
            :style="{ width: `${smoothProgress}%` }"
          ></div>
        </div>

        <!-- Phase Dots -->
        <div class="flex justify-center gap-3 mb-4">
          <div
            v-for="(phase, idx) in phases"
            :key="idx"
            class="flex flex-col items-center"
          >
            <div
              class="w-3 h-3 rounded-full transition-all"
              :class="
                idx === currentPhase
                  ? 'bg-blue-500 ring-2 ring-blue-500/30'
                  : idx < currentPhase
                    ? 'bg-blue-500/50'
                    : 'bg-slate-600'
              "
            ></div>
            <span
              class="text-xs mt-1 transition-colors"
              :class="idx === currentPhase ? 'text-blue-400' : 'text-slate-500'"
            >
              {{ phase.title }}
            </span>
          </div>
        </div>

        <!-- Controls -->
        <div class="flex justify-center gap-3">
          <button
            @click="reset"
            class="p-3 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            aria-label="Reset"
          >
            <RotateCcw :size="20" />
          </button>
          <button
            @click="toggleTimer"
            class="p-4 rounded-full transition-colors"
            :class="isRunning
              ? 'bg-slate-600 hover:bg-slate-500 text-white'
              : 'bg-blue-600 hover:bg-blue-500 text-white'"
            :aria-label="isRunning ? 'Pause' : 'Play'"
          >
            <Pause v-if="isRunning" :size="24" />
            <Play v-else :size="24" />
          </button>
          <button
            @click="finish"
            class="p-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            aria-label="Finish early"
          >
            <CheckCircle2 :size="20" />
          </button>
        </div>

        <p class="text-center text-slate-500 text-xs mt-3">
          Tap the checkmark if the urge has passed
        </p>
      </div>
    </Transition>
  </div>
</template>
