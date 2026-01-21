<script setup lang="ts">
import { ref, computed } from 'vue'
import { FastForward, ChevronRight, ChevronLeft, AlertTriangle, CheckCircle2 } from 'lucide-vue-next'
import type { WidgetCompletionState } from '@/types'

const props = withDefaults(defineProps<{
  trigger?: string
  currentThought?: string
  completionState?: WidgetCompletionState
}>(), {
  trigger: '',
  currentThought: ''
})

const emit = defineEmits<{
  complete: [{ success: boolean; responses: string[] }]
}>()

// Restore state from completionState if present
const savedResponses = (props.completionState?.result?.responses as string[]) ?? ['', '', '', '']

const currentStep = ref(props.completionState ? 4 : 0) // Go to completion screen if already completed
const responses = ref<string[]>(savedResponses.length === 4 ? savedResponses : ['', '', '', ''])
const isSubmitted = ref(!!props.completionState)

const steps = [
  {
    title: '1 Hour from Now',
    prompt: 'If I give in to this urge, what will I be feeling in one hour?',
    placeholder: 'Describe your likely emotional and physical state...'
  },
  {
    title: '1 Day from Now',
    prompt: 'What will my situation look like tomorrow?',
    placeholder: 'Think about your responsibilities, relationships, how you\'ll feel...'
  },
  {
    title: '1 Week from Now',
    prompt: 'How will this decision affect the next week of my life?',
    placeholder: 'Consider the ripple effects on your goals and recovery...'
  },
  {
    title: '1 Month from Now',
    prompt: 'What pattern am I reinforcing? Where does this path lead?',
    placeholder: 'Reflect on the long-term trajectory...'
  }
]

const canProceed = computed(() => responses.value[currentStep.value].trim().length >= 10)
const isComplete = computed(() => currentStep.value === steps.length)
const filledSteps = computed(() => responses.value.filter(r => r.trim().length >= 10).length)

const nextStep = () => {
  if (currentStep.value < steps.length) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const complete = () => {
  if (isSubmitted.value) return
  isSubmitted.value = true
  emit('complete', {
    success: true,
    responses: responses.value
  })
}
</script>

<template>
  <div class="widget-container p-4 my-3 max-w-md w-full">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
      <h3 class="text-amber-400 font-bold flex items-center gap-2">
        <FastForward :size="18" />
        Play the Tape Forward
      </h3>
      <div class="text-xs text-slate-400">
        {{ filledSteps }}/{{ steps.length }} steps
      </div>
    </div>

    <!-- Context -->
    <div v-if="trigger || currentThought" class="mb-4 p-3 bg-slate-800/50 rounded-lg">
      <p v-if="trigger" class="text-sm text-slate-300">
        <span class="text-slate-500">Trigger:</span> {{ trigger }}
      </p>
      <p v-if="currentThought" class="text-sm text-slate-300 mt-1">
        <span class="text-slate-500">Thought:</span> "{{ currentThought }}"
      </p>
    </div>

    <!-- Progress Dots -->
    <div class="flex justify-center gap-2 mb-4">
      <div
        v-for="(_step, idx) in steps"
        :key="idx"
        class="w-2 h-2 rounded-full transition-all"
        :class="
          idx === currentStep
            ? 'bg-amber-500 w-4'
            : idx < currentStep
              ? 'bg-amber-500/50'
              : 'bg-slate-600'
        "
      ></div>
      <div
        class="w-2 h-2 rounded-full transition-all"
        :class="isComplete ? 'bg-emerald-500' : 'bg-slate-600'"
      ></div>
    </div>

    <!-- Step Content -->
    <Transition
      mode="out-in"
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0 translate-x-4"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition-all duration-200"
      leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 -translate-x-4"
    >
      <div v-if="!isComplete" :key="currentStep">
        <div class="mb-3">
          <div class="text-sm text-amber-400 font-medium mb-1">
            {{ steps[currentStep].title }}
          </div>
          <p class="text-slate-200">{{ steps[currentStep].prompt }}</p>
        </div>

        <textarea
          v-model="responses[currentStep]"
          :placeholder="steps[currentStep].placeholder"
          class="w-full h-32 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 resize-none transition-colors"
        ></textarea>

        <div class="text-xs text-slate-500 mt-1">
          {{ responses[currentStep].trim().length < 10 ? `${10 - responses[currentStep].trim().length} more characters needed` : 'Ready to continue' }}
        </div>
      </div>

      <!-- Completion Screen -->
      <div v-else class="text-center py-4">
        <div class="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/20 rounded-full mb-3">
          <CheckCircle2 class="text-emerald-400" :size="24" />
        </div>
        <h4 class="text-emerald-400 font-medium mb-2">Tape Reviewed</h4>
        <p class="text-slate-400 text-sm mb-4">
          You've thought through the consequences. This urge will pass.
        </p>

        <!-- Summary -->
        <div class="text-left space-y-2 mb-4">
          <div
            v-for="(step, idx) in steps"
            :key="idx"
            class="p-2 bg-slate-800/50 rounded text-sm"
          >
            <div class="text-amber-400/70 text-xs">{{ step.title }}</div>
            <p class="text-slate-300 truncate">{{ responses[idx] }}</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Navigation -->
    <div class="flex justify-between items-center mt-4 pt-3 border-t border-slate-700">
      <button
        v-if="!isComplete"
        @click="prevStep"
        :disabled="currentStep === 0"
        class="flex items-center gap-1 text-sm px-3 py-1.5 rounded transition-colors"
        :class="currentStep === 0
          ? 'text-slate-600 cursor-not-allowed'
          : 'text-slate-300 hover:text-white hover:bg-slate-700'"
      >
        <ChevronLeft :size="16" />
        Back
      </button>
      <div v-else></div>

      <button
        v-if="!isComplete"
        @click="nextStep"
        :disabled="!canProceed"
        class="flex items-center gap-1 text-sm px-3 py-1.5 rounded transition-colors"
        :class="canProceed
          ? 'bg-amber-600 hover:bg-amber-500 text-white'
          : 'bg-slate-700 text-slate-500 cursor-not-allowed'"
      >
        {{ currentStep === steps.length - 1 ? 'Finish' : 'Next' }}
        <ChevronRight :size="16" />
      </button>

      <button
        v-else
        @click="complete"
        :disabled="isSubmitted"
        class="text-white text-sm px-4 py-1.5 rounded transition-colors"
        :class="isSubmitted
          ? 'bg-slate-600 cursor-not-allowed'
          : 'bg-emerald-600 hover:bg-emerald-500'"
      >
        {{ isSubmitted ? 'Logged' : 'Log This Exercise' }}
      </button>
    </div>

    <!-- Warning for incomplete -->
    <div
      v-if="!isComplete && responses[currentStep].trim().length > 0 && responses[currentStep].trim().length < 10"
      class="mt-3 flex items-center gap-2 text-amber-400 text-xs"
    >
      <AlertTriangle :size="14" />
      Take a moment to fully explore this thought
    </div>
  </div>
</template>
