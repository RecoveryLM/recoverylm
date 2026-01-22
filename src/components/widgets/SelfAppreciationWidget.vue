<script setup lang="ts">
import { ref, computed } from 'vue'
import { Star, Plus, X, CheckCircle2 } from 'lucide-vue-next'
import type { WidgetCompletionState } from '@/types'

const props = withDefaults(defineProps<{
  completionState?: WidgetCompletionState
}>(), {})

const emit = defineEmits<{
  complete: [{
    success: boolean
    wins: string[]
    strengths: string[]
    reflection?: string
  }]
}>()

// Predefined character strengths (VIA classification inspired)
const predefinedStrengths = [
  'Courage',
  'Kindness',
  'Persistence',
  'Creativity',
  'Gratitude',
  'Honesty',
  'Humor',
  'Prudence',
  'Self-control',
  'Curiosity'
]

// Restore state from completionState if present
const savedWins = (props.completionState?.result?.wins as string[]) ?? []
const savedStrengths = (props.completionState?.result?.strengths as string[]) ?? []
const savedReflection = (props.completionState?.result?.reflection as string) ?? ''

const wins = ref<string[]>(savedWins)
const selectedStrengths = ref<string[]>(savedStrengths)
const reflection = ref(savedReflection)
const newWin = ref('')
const customStrength = ref('')
const showSummary = ref(!!props.completionState)
const isSubmitted = ref(!!props.completionState)

const canComplete = computed(() => wins.value.length > 0 || selectedStrengths.value.length > 0)

const addWin = () => {
  const win = newWin.value.trim()
  if (win && !wins.value.includes(win)) {
    wins.value.push(win)
    newWin.value = ''
  }
}

const removeWin = (idx: number) => {
  wins.value.splice(idx, 1)
}

const toggleStrength = (strength: string) => {
  const idx = selectedStrengths.value.indexOf(strength)
  if (idx >= 0) {
    selectedStrengths.value.splice(idx, 1)
  } else {
    selectedStrengths.value.push(strength)
  }
}

const addCustomStrength = () => {
  const strength = customStrength.value.trim()
  if (strength && !selectedStrengths.value.includes(strength) && !predefinedStrengths.includes(strength)) {
    selectedStrengths.value.push(strength)
    customStrength.value = ''
  }
}

const finish = () => {
  showSummary.value = true
}

const complete = () => {
  if (isSubmitted.value) return
  isSubmitted.value = true
  emit('complete', {
    success: true,
    wins: wins.value,
    strengths: selectedStrengths.value,
    reflection: reflection.value.trim() || undefined
  })
}
</script>

<template>
  <div class="widget-container p-4 my-3 max-w-lg w-full">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
      <h3 class="text-amber-400 font-bold flex items-center gap-2">
        <Star :size="18" />
        Self Appreciation
      </h3>
    </div>

    <!-- Summary View -->
    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
    >
      <div v-if="showSummary" class="py-4">
        <div class="text-center mb-4">
          <div class="inline-flex items-center justify-center w-12 h-12 bg-amber-500/20 rounded-full mb-3">
            <CheckCircle2 class="text-amber-400" :size="24" />
          </div>
          <h4 class="text-amber-400 font-medium mb-2">You Did Great Today</h4>
          <p class="text-slate-400 text-sm">
            Recognizing your wins builds self-efficacy for recovery.
          </p>
        </div>

        <div class="space-y-3">
          <!-- Wins Summary -->
          <div v-if="wins.length > 0" class="p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg">
            <div class="text-amber-400 text-xs font-medium mb-2">Today's Wins ({{ wins.length }})</div>
            <ul class="space-y-1">
              <li
                v-for="(win, idx) in wins"
                :key="idx"
                class="text-sm text-slate-200 flex items-start gap-2"
              >
                <span class="text-amber-500">*</span>
                {{ win }}
              </li>
            </ul>
          </div>

          <!-- Strengths Summary -->
          <div v-if="selectedStrengths.length > 0" class="p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
            <div class="text-purple-400 text-xs font-medium mb-2">Strengths Used ({{ selectedStrengths.length }})</div>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="strength in selectedStrengths"
                :key="strength"
                class="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded"
              >
                {{ strength }}
              </span>
            </div>
          </div>

          <!-- Reflection Summary -->
          <div v-if="reflection.trim()" class="p-3 bg-slate-800/50 rounded-lg">
            <div class="text-slate-400 text-xs font-medium mb-1">Reflection</div>
            <p class="text-slate-300 text-sm">{{ reflection }}</p>
          </div>
        </div>

        <button
          @click="complete"
          :disabled="isSubmitted"
          class="w-full mt-4 text-white text-sm px-4 py-2 rounded transition-colors"
          :class="isSubmitted
            ? 'bg-slate-600 cursor-not-allowed'
            : 'bg-amber-600 hover:bg-amber-500'"
        >
          {{ isSubmitted ? 'Logged' : 'Log This Entry' }}
        </button>
      </div>
    </Transition>

    <!-- Main Form -->
    <div v-if="!showSummary" class="space-y-5">
      <!-- Section 1: Today's Wins -->
      <div>
        <h4 class="text-amber-400 text-sm font-medium mb-2">Today's Wins</h4>
        <p class="text-slate-500 text-xs mb-3">
          What did you accomplish today? No win is too small.
        </p>

        <div class="flex gap-2 mb-3">
          <input
            id="new-win-input"
            v-model="newWin"
            type="text"
            placeholder="e.g., Got out of bed on time, called my sponsor..."
            aria-label="Add a win"
            @keyup.enter="addWin"
            class="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-colors"
          />
          <button
            @click="addWin"
            :disabled="!newWin.trim()"
            aria-label="Add win"
            class="p-2 rounded transition-colors"
            :class="newWin.trim()
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-slate-700 text-slate-500'"
          >
            <Plus :size="18" />
          </button>
        </div>

        <ul v-if="wins.length > 0" class="space-y-2">
          <li
            v-for="(win, idx) in wins"
            :key="idx"
            class="flex items-center justify-between gap-2 p-2 bg-amber-900/20 border border-amber-500/20 rounded"
          >
            <div class="flex items-center gap-2">
              <Star :size="14" class="text-amber-500" />
              <span class="text-sm text-slate-200">{{ win }}</span>
            </div>
            <button
              @click="removeWin(idx)"
              :aria-label="`Remove win: ${win}`"
              class="text-slate-500 hover:text-red-400 transition-colors"
            >
              <X :size="14" />
            </button>
          </li>
        </ul>
        <p v-else class="text-slate-500 text-xs italic">
          No wins added yet. Add your first one above!
        </p>
      </div>

      <!-- Section 2: Strengths Used -->
      <div>
        <h4 class="text-purple-400 text-sm font-medium mb-2">Strengths You Used</h4>
        <p class="text-slate-500 text-xs mb-3">
          Which character strengths did you demonstrate today?
        </p>

        <div class="flex flex-wrap gap-2 mb-3" role="group" aria-label="Character strengths">
          <button
            v-for="strength in predefinedStrengths"
            :key="strength"
            @click="toggleStrength(strength)"
            :aria-pressed="selectedStrengths.includes(strength)"
            class="text-xs px-3 py-1.5 rounded-full transition-colors border"
            :class="selectedStrengths.includes(strength)
              ? 'bg-purple-500/30 border-purple-500 text-purple-300'
              : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-purple-500/50'"
          >
            {{ strength }}
          </button>
        </div>

        <!-- Custom strength input -->
        <div class="flex gap-2">
          <input
            id="custom-strength-input"
            v-model="customStrength"
            type="text"
            placeholder="Add a custom strength..."
            aria-label="Custom strength name"
            @keyup.enter="addCustomStrength"
            class="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-colors"
          />
          <button
            @click="addCustomStrength"
            :disabled="!customStrength.trim()"
            aria-label="Add custom strength"
            class="p-1.5 rounded transition-colors"
            :class="customStrength.trim()
              ? 'bg-purple-600 hover:bg-purple-500 text-white'
              : 'bg-slate-700 text-slate-500'"
          >
            <Plus :size="16" />
          </button>
        </div>
      </div>

      <!-- Section 3: Optional Reflection -->
      <div>
        <label for="reflection-input" class="text-slate-400 text-xs block mb-1">
          Reflection (optional)
        </label>
        <textarea
          id="reflection-input"
          v-model="reflection"
          placeholder="Any thoughts on how you showed up for yourself today?"
          class="w-full h-16 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:border-slate-500 focus:ring-1 focus:ring-slate-500/50 resize-none transition-colors"
        ></textarea>
      </div>

      <!-- Footer -->
      <div class="pt-3 border-t border-slate-700 flex justify-between items-center">
        <div class="text-xs text-slate-500">
          {{ wins.length }} wins, {{ selectedStrengths.length }} strengths
        </div>
        <button
          @click="finish"
          :disabled="!canComplete"
          class="text-sm px-4 py-2 rounded transition-colors"
          :class="canComplete
            ? 'bg-amber-600 hover:bg-amber-500 text-white'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'"
        >
          Complete
        </button>
      </div>
    </div>
  </div>
</template>
