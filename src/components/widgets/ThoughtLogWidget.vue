<script setup lang="ts">
import { ref, computed } from 'vue'
import { BookOpen, ChevronLeft, ChevronRight, Plus, X, CheckCircle2 } from 'lucide-vue-next'
import type { WidgetCompletionState } from '@/types'

const props = withDefaults(defineProps<{
  situation?: string
  completionState?: WidgetCompletionState
}>(), {
  situation: ''
})

const emit = defineEmits<{
  complete: [{
    success: boolean
    activatingEvent: string
    belief: string
    consequences: { emotions: { name: string; intensity: number }[]; behaviors: string }
    dispute: string
    newEffect: string
  }]
}>()

// Step definitions
const steps = ['Event', 'Belief', 'Consequences', 'Dispute', 'New Effect'] as const

// Common emotions for picker
const commonEmotions = [
  'Anxious', 'Angry', 'Sad', 'Frustrated', 'Guilty',
  'Ashamed', 'Hopeless', 'Overwhelmed', 'Scared', 'Lonely'
]

// Restore state from completionState if present
const savedEvent = (props.completionState?.result?.activatingEvent as string) ?? props.situation
const savedBelief = (props.completionState?.result?.belief as string) ?? ''
const savedConsequences = (props.completionState?.result?.consequences as { emotions: { name: string; intensity: number }[]; behaviors: string }) ?? { emotions: [], behaviors: '' }
const savedDispute = (props.completionState?.result?.dispute as string) ?? ''
const savedNewEffect = (props.completionState?.result?.newEffect as string) ?? ''

// Form state
const currentStepIndex = ref(props.completionState ? 4 : 0)
const activatingEvent = ref(savedEvent)
const belief = ref(savedBelief)
const emotions = ref<{ name: string; intensity: number }[]>(savedConsequences.emotions)
const behaviors = ref(savedConsequences.behaviors)
const dispute = ref(savedDispute)
const newEffect = ref(savedNewEffect)
const showSummary = ref(!!props.completionState)
const isSubmitted = ref(!!props.completionState)

// Emotion picker state
const newEmotionName = ref('')
const newEmotionIntensity = ref(5)

const currentStep = computed(() => steps[currentStepIndex.value])

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 'Event': return activatingEvent.value.trim().length >= 10
    case 'Belief': return belief.value.trim().length >= 10
    case 'Consequences': return emotions.value.length > 0
    case 'Dispute': return dispute.value.trim().length >= 20
    case 'New Effect': return newEffect.value.trim().length >= 10
    default: return false
  }
})

const progress = computed(() => ((currentStepIndex.value + 1) / steps.length) * 100)

const addEmotion = (name?: string) => {
  const emotionName = name ?? newEmotionName.value.trim()
  if (emotionName && !emotions.value.some(e => e.name.toLowerCase() === emotionName.toLowerCase())) {
    emotions.value.push({ name: emotionName, intensity: newEmotionIntensity.value })
    newEmotionName.value = ''
    newEmotionIntensity.value = 5
  }
}

const removeEmotion = (idx: number) => {
  emotions.value.splice(idx, 1)
}

const updateEmotionIntensity = (idx: number, intensity: number) => {
  emotions.value[idx].intensity = intensity
}

const nextStep = () => {
  if (currentStepIndex.value < steps.length - 1) {
    currentStepIndex.value++
  }
}

const prevStep = () => {
  if (currentStepIndex.value > 0) {
    currentStepIndex.value--
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
    activatingEvent: activatingEvent.value,
    belief: belief.value,
    consequences: { emotions: emotions.value, behaviors: behaviors.value },
    dispute: dispute.value,
    newEffect: newEffect.value
  })
}

// Dispute prompts to guide the user
const disputePrompts = [
  'What evidence supports this thought?',
  'What evidence contradicts this thought?',
  'Am I catastrophizing or mind-reading?',
  'What would I tell a friend who had this thought?',
  'Is this thought helpful or harmful to my recovery?'
]
</script>

<template>
  <div class="widget-container p-4 my-3 max-w-lg w-full">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
      <h3 class="text-indigo-400 font-bold flex items-center gap-2">
        <BookOpen :size="18" />
        Thought Log (ABCDE)
      </h3>
      <span class="text-xs text-slate-500">
        Step {{ currentStepIndex + 1 }} of {{ steps.length }}
      </span>
    </div>

    <!-- Progress Bar -->
    <div v-if="!showSummary" class="mb-4">
      <div class="flex justify-between mb-1">
        <span
          v-for="(step, idx) in steps"
          :key="step"
          class="text-xs transition-colors"
          :class="idx <= currentStepIndex ? 'text-indigo-400' : 'text-slate-600'"
        >
          {{ step.charAt(0) }}
        </span>
      </div>
      <div class="h-1 bg-slate-700 rounded-full overflow-hidden">
        <div
          class="h-full bg-indigo-500 transition-all duration-300"
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
    </div>

    <!-- Summary View -->
    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
    >
      <div v-if="showSummary" class="py-4">
        <div class="text-center mb-4">
          <div class="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/20 rounded-full mb-3">
            <CheckCircle2 class="text-emerald-400" :size="24" />
          </div>
          <h4 class="text-emerald-400 font-medium mb-2">Thought Reframed</h4>
        </div>

        <div class="space-y-3">
          <!-- A: Activating Event -->
          <div class="p-3 bg-slate-800/50 rounded-lg">
            <div class="text-indigo-400 text-xs font-medium mb-1">A: Activating Event</div>
            <p class="text-slate-300 text-sm">{{ activatingEvent }}</p>
          </div>

          <!-- B: Belief -->
          <div class="p-3 bg-red-900/10 border border-red-500/20 rounded-lg">
            <div class="text-red-400 text-xs font-medium mb-1">B: Belief (Original)</div>
            <p class="text-slate-400 text-sm line-through">{{ belief }}</p>
          </div>

          <!-- C: Consequences -->
          <div class="p-3 bg-amber-900/10 border border-amber-500/20 rounded-lg">
            <div class="text-amber-400 text-xs font-medium mb-1">C: Consequences</div>
            <div class="flex flex-wrap gap-1 mb-1">
              <span
                v-for="(emotion, idx) in emotions"
                :key="idx"
                class="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded"
              >
                {{ emotion.name }} ({{ emotion.intensity }}/10)
              </span>
            </div>
            <p v-if="behaviors" class="text-slate-400 text-xs mt-1">{{ behaviors }}</p>
          </div>

          <!-- D: Dispute -->
          <div class="p-3 bg-purple-900/10 border border-purple-500/20 rounded-lg">
            <div class="text-purple-400 text-xs font-medium mb-1">D: Dispute</div>
            <p class="text-slate-300 text-sm">{{ dispute }}</p>
          </div>

          <!-- E: New Effect -->
          <div class="p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
            <div class="text-emerald-400 text-xs font-medium mb-1">E: New Effect</div>
            <p class="text-slate-200 text-sm font-medium">{{ newEffect }}</p>
          </div>
        </div>

        <button
          @click="complete"
          :disabled="isSubmitted"
          class="w-full mt-4 text-white text-sm px-4 py-2 rounded transition-colors"
          :class="isSubmitted
            ? 'bg-slate-600 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-500'"
        >
          {{ isSubmitted ? 'Logged' : 'Log This Entry' }}
        </button>
      </div>
    </Transition>

    <!-- Step Forms -->
    <div v-if="!showSummary">
      <!-- Step 1: Activating Event -->
      <div v-if="currentStep === 'Event'" class="space-y-3">
        <div>
          <h4 id="event-label" class="text-slate-200 text-sm font-medium mb-1">What happened?</h4>
          <p id="event-description" class="text-slate-500 text-xs mb-2">
            Describe the situation or event that triggered your distress. Be specific and factual.
          </p>
          <textarea
            id="activating-event-input"
            v-model="activatingEvent"
            placeholder="e.g., My sponsor didn't respond to my text for 3 hours..."
            aria-labelledby="event-label"
            aria-describedby="event-description"
            class="w-full h-24 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 resize-none transition-colors"
          ></textarea>
          <div class="text-xs text-slate-500 mt-1">
            {{ activatingEvent.trim().length < 10 ? `${10 - activatingEvent.trim().length} more characters` : 'Ready' }}
          </div>
        </div>
      </div>

      <!-- Step 2: Belief -->
      <div v-if="currentStep === 'Belief'" class="space-y-3">
        <div>
          <h4 id="belief-label" class="text-slate-200 text-sm font-medium mb-1">What thought went through your mind?</h4>
          <p id="belief-description" class="text-slate-500 text-xs mb-2">
            Write the automatic thought or belief that arose. This is often negative or distorted.
          </p>
          <textarea
            id="belief-input"
            v-model="belief"
            placeholder="e.g., They're ignoring me because I'm a burden. Nobody really cares..."
            aria-labelledby="belief-label"
            aria-describedby="belief-description"
            class="w-full h-24 bg-slate-800 border border-red-500/30 rounded px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50 resize-none transition-colors"
          ></textarea>
          <div class="text-xs text-slate-500 mt-1">
            {{ belief.trim().length < 10 ? `${10 - belief.trim().length} more characters` : 'Ready' }}
          </div>
        </div>
      </div>

      <!-- Step 3: Consequences -->
      <div v-if="currentStep === 'Consequences'" class="space-y-3">
        <div>
          <h4 class="text-slate-200 text-sm font-medium mb-1">How did it make you feel?</h4>
          <p class="text-slate-500 text-xs mb-2">
            Select emotions and rate their intensity (1-10).
          </p>

          <!-- Quick emotion picker -->
          <div class="flex flex-wrap gap-1 mb-3" role="group" aria-label="Common emotions">
            <button
              v-for="emotion in commonEmotions"
              :key="emotion"
              @click="addEmotion(emotion)"
              :disabled="emotions.some(e => e.name.toLowerCase() === emotion.toLowerCase())"
              :aria-pressed="emotions.some(e => e.name.toLowerCase() === emotion.toLowerCase())"
              class="text-xs px-2 py-1 rounded transition-colors"
              :class="emotions.some(e => e.name.toLowerCase() === emotion.toLowerCase())
                ? 'bg-amber-500/30 text-amber-300'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'"
            >
              {{ emotion }}
            </button>
          </div>

          <!-- Custom emotion input -->
          <div class="flex gap-2 mb-3">
            <input
              id="custom-emotion-input"
              v-model="newEmotionName"
              type="text"
              placeholder="Custom emotion..."
              aria-label="Custom emotion name"
              @keyup.enter="addEmotion()"
              class="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-colors"
            />
            <button
              @click="addEmotion()"
              :disabled="!newEmotionName.trim()"
              aria-label="Add custom emotion"
              class="p-1.5 rounded transition-colors"
              :class="newEmotionName.trim()
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-slate-700 text-slate-500'"
            >
              <Plus :size="16" />
            </button>
          </div>

          <!-- Selected emotions with intensity sliders -->
          <div v-if="emotions.length > 0" class="space-y-2 mb-3">
            <div
              v-for="(emotion, idx) in emotions"
              :key="idx"
              class="flex items-center gap-2 p-2 bg-amber-900/20 border border-amber-500/20 rounded"
            >
              <span :id="`emotion-label-${idx}`" class="text-sm text-amber-300 min-w-[80px]">{{ emotion.name }}</span>
              <input
                type="range"
                min="1"
                max="10"
                :value="emotion.intensity"
                :aria-label="`${emotion.name} intensity`"
                :aria-valuenow="emotion.intensity"
                aria-valuemin="1"
                aria-valuemax="10"
                @input="updateEmotionIntensity(idx, parseInt(($event.target as HTMLInputElement).value))"
                class="flex-1 accent-amber-500"
              />
              <span class="text-xs text-amber-400 w-8 text-right">{{ emotion.intensity }}/10</span>
              <button
                @click="removeEmotion(idx)"
                :aria-label="`Remove ${emotion.name}`"
                class="text-slate-500 hover:text-red-400 transition-colors"
              >
                <X :size="14" />
              </button>
            </div>
          </div>

          <!-- Behaviors -->
          <div class="mt-4">
            <label for="behaviors-input" class="text-xs text-slate-400 block mb-1">What did you do (or want to do)?</label>
            <textarea
              id="behaviors-input"
              v-model="behaviors"
              placeholder="e.g., I felt like isolating, almost called my old dealer..."
              class="w-full h-16 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 resize-none transition-colors"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Step 4: Dispute -->
      <div v-if="currentStep === 'Dispute'" class="space-y-3">
        <div>
          <h4 id="dispute-label" class="text-slate-200 text-sm font-medium mb-1">Challenge the thought</h4>
          <p id="dispute-description" class="text-slate-500 text-xs mb-2">
            Use these questions to examine whether your belief is accurate:
          </p>

          <!-- Guiding questions -->
          <ul class="space-y-1 mb-3" aria-label="Guiding questions">
            <li
              v-for="prompt in disputePrompts"
              :key="prompt"
              class="text-xs text-purple-400 flex items-start gap-1.5"
            >
              <span class="text-purple-500 mt-0.5">•</span>
              {{ prompt }}
            </li>
          </ul>

          <textarea
            id="dispute-input"
            v-model="dispute"
            placeholder="Write your challenge to the original thought..."
            aria-labelledby="dispute-label"
            aria-describedby="dispute-description"
            class="w-full h-28 bg-slate-800 border border-purple-500/30 rounded px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 resize-none transition-colors"
          ></textarea>
          <div class="text-xs text-slate-500 mt-1">
            {{ dispute.trim().length < 20 ? `${20 - dispute.trim().length} more characters` : 'Ready' }}
          </div>
        </div>
      </div>

      <!-- Step 5: New Effect -->
      <div v-if="currentStep === 'New Effect'" class="space-y-3">
        <div>
          <h4 id="neweffect-label" class="text-slate-200 text-sm font-medium mb-1">What's a more balanced thought?</h4>
          <p id="neweffect-description" class="text-slate-500 text-xs mb-2">
            Based on your dispute, write a new, more realistic thought. How do you feel now?
          </p>

          <textarea
            id="neweffect-input"
            v-model="newEffect"
            placeholder="e.g., My sponsor is probably busy. They've always come through for me. I can reach out to someone else if I need support now."
            aria-labelledby="neweffect-label"
            aria-describedby="neweffect-description"
            class="w-full h-24 bg-slate-800 border border-emerald-500/30 rounded px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 resize-none transition-colors"
          ></textarea>
          <div class="text-xs text-slate-500 mt-1">
            {{ newEffect.trim().length < 10 ? `${10 - newEffect.trim().length} more characters` : 'Ready' }}
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="mt-4 pt-3 border-t border-slate-700 flex justify-between items-center">
        <button
          v-if="currentStepIndex > 0"
          @click="prevStep"
          class="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ChevronLeft :size="16" />
          Back
        </button>
        <div v-else></div>

        <button
          v-if="currentStepIndex < steps.length - 1"
          @click="nextStep"
          :disabled="!canProceed"
          class="flex items-center gap-1 text-sm px-3 py-1.5 rounded transition-colors"
          :class="canProceed
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'"
        >
          Next
          <ChevronRight :size="16" />
        </button>
        <button
          v-else
          @click="finish"
          :disabled="!canProceed"
          class="text-sm px-3 py-1.5 rounded transition-colors"
          :class="canProceed
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'"
        >
          Complete
        </button>
      </div>
    </div>
  </div>
</template>
