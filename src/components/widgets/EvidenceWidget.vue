<script setup lang="ts">
import { ref, computed } from 'vue'
import { Scale, Plus, X, CheckCircle2 } from 'lucide-vue-next'
import type { WidgetCompletionState } from '@/types'

const props = withDefaults(defineProps<{
  thought?: string
  distortion?: string
  completionState?: WidgetCompletionState
}>(), {
  thought: '',
  distortion: ''
})

const emit = defineEmits<{
  complete: [{ success: boolean; thought: string; evidenceFor: string[]; evidenceAgainst: string[]; balancedThought: string }]
}>()

// Restore state from completionState if present
const savedThought = (props.completionState?.result?.thought as string) ?? props.thought
const savedEvidenceFor = (props.completionState?.result?.evidenceFor as string[]) ?? []
const savedEvidenceAgainst = (props.completionState?.result?.evidenceAgainst as string[]) ?? []
const savedBalancedThought = (props.completionState?.result?.balancedThought as string) ?? ''

const thoughtInput = ref(savedThought)
const evidenceFor = ref<string[]>(savedEvidenceFor)
const evidenceAgainst = ref<string[]>(savedEvidenceAgainst)
const newEvidenceFor = ref('')
const newEvidenceAgainst = ref('')
const balancedThought = ref(savedBalancedThought)
const showSummary = ref(!!props.completionState)
const isSubmitted = ref(!!props.completionState)

const hasEvidence = computed(() => evidenceFor.value.length > 0 || evidenceAgainst.value.length > 0)
const canComplete = computed(() => hasEvidence.value && balancedThought.value.trim().length >= 10)

const addEvidenceFor = () => {
  const item = newEvidenceFor.value.trim()
  if (item && !evidenceFor.value.includes(item)) {
    evidenceFor.value.push(item)
    newEvidenceFor.value = ''
  }
}

const addEvidenceAgainst = () => {
  const item = newEvidenceAgainst.value.trim()
  if (item && !evidenceAgainst.value.includes(item)) {
    evidenceAgainst.value.push(item)
    newEvidenceAgainst.value = ''
  }
}

const removeEvidenceFor = (idx: number) => {
  evidenceFor.value.splice(idx, 1)
}

const removeEvidenceAgainst = (idx: number) => {
  evidenceAgainst.value.splice(idx, 1)
}

const finish = () => {
  showSummary.value = true
}

const complete = () => {
  if (isSubmitted.value) return
  isSubmitted.value = true
  emit('complete', {
    success: true,
    thought: thoughtInput.value,
    evidenceFor: evidenceFor.value,
    evidenceAgainst: evidenceAgainst.value,
    balancedThought: balancedThought.value
  })
}
</script>

<template>
  <div class="widget-container p-4 my-3 max-w-lg w-full">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
      <h3 class="text-purple-400 font-bold flex items-center gap-2">
        <Scale :size="18" />
        Evidence Examination
      </h3>
      <span v-if="distortion" class="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
        {{ distortion }}
      </span>
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
          <h4 class="text-emerald-400 font-medium mb-2">Thought Examined</h4>
        </div>

        <div class="space-y-3">
          <div class="p-3 bg-slate-800/50 rounded-lg">
            <div class="text-slate-500 text-xs mb-1">Original Thought</div>
            <p class="text-slate-300 text-sm line-through">{{ thoughtInput }}</p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="p-2 bg-red-900/10 border border-red-500/20 rounded">
              <div class="text-red-400 text-xs mb-1">Evidence For ({{ evidenceFor.length }})</div>
              <ul class="text-xs text-slate-400 space-y-0.5">
                <li v-for="(item, idx) in evidenceFor" :key="idx" class="truncate">{{ item }}</li>
              </ul>
            </div>
            <div class="p-2 bg-emerald-900/10 border border-emerald-500/20 rounded">
              <div class="text-emerald-400 text-xs mb-1">Evidence Against ({{ evidenceAgainst.length }})</div>
              <ul class="text-xs text-slate-400 space-y-0.5">
                <li v-for="(item, idx) in evidenceAgainst" :key="idx" class="truncate">{{ item }}</li>
              </ul>
            </div>
          </div>

          <div class="p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
            <div class="text-purple-400 text-xs mb-1">Balanced Thought</div>
            <p class="text-slate-200 text-sm">{{ balancedThought }}</p>
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
          {{ isSubmitted ? 'Logged' : 'Log This Exercise' }}
        </button>
      </div>
    </Transition>

    <!-- Main Form -->
    <div v-if="!showSummary">
      <!-- Thought Input -->
      <div class="mb-4">
        <label class="text-xs text-slate-400 block mb-1">The thought you want to examine:</label>
        <input
          v-model="thoughtInput"
          type="text"
          placeholder="e.g., 'I'll never be able to stay sober'"
          class="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-colors"
        />
      </div>

      <!-- Evidence Grid -->
      <div class="grid grid-cols-2 gap-3 mb-4">
        <!-- Evidence FOR the thought -->
        <div class="p-3 bg-red-900/10 border border-red-500/20 rounded-lg">
          <h4 class="text-red-400 text-sm font-medium mb-2">Evidence FOR</h4>
          <p class="text-slate-500 text-xs mb-2">Facts supporting this thought</p>

          <div class="flex gap-1 mb-2">
            <input
              v-model="newEvidenceFor"
              type="text"
              placeholder="Add evidence..."
              @keyup.enter="addEvidenceFor"
              class="flex-1 bg-slate-800 border border-red-500/30 rounded px-2 py-1 text-sm text-slate-200 placeholder:text-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-colors"
            />
            <button
              @click="addEvidenceFor"
              :disabled="!newEvidenceFor.trim()"
              class="p-1 rounded transition-colors"
              :class="newEvidenceFor.trim()
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-slate-700 text-slate-500'"
            >
              <Plus :size="16" />
            </button>
          </div>

          <ul class="space-y-1 max-h-32 overflow-y-auto">
            <li
              v-for="(item, idx) in evidenceFor"
              :key="idx"
              class="flex items-center justify-between gap-2 text-sm text-slate-300 bg-red-900/20 px-2 py-1 rounded"
            >
              <span class="truncate">{{ item }}</span>
              <button
                @click="removeEvidenceFor(idx)"
                class="text-slate-500 hover:text-red-400 transition-colors shrink-0"
              >
                <X :size="14" />
              </button>
            </li>
          </ul>
        </div>

        <!-- Evidence AGAINST the thought -->
        <div class="p-3 bg-emerald-900/10 border border-emerald-500/20 rounded-lg">
          <h4 class="text-emerald-400 text-sm font-medium mb-2">Evidence AGAINST</h4>
          <p class="text-slate-500 text-xs mb-2">Facts contradicting this thought</p>

          <div class="flex gap-1 mb-2">
            <input
              v-model="newEvidenceAgainst"
              type="text"
              placeholder="Add evidence..."
              @keyup.enter="addEvidenceAgainst"
              class="flex-1 bg-slate-800 border border-emerald-500/30 rounded px-2 py-1 text-sm text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
            />
            <button
              @click="addEvidenceAgainst"
              :disabled="!newEvidenceAgainst.trim()"
              class="p-1 rounded transition-colors"
              :class="newEvidenceAgainst.trim()
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-700 text-slate-500'"
            >
              <Plus :size="16" />
            </button>
          </div>

          <ul class="space-y-1 max-h-32 overflow-y-auto">
            <li
              v-for="(item, idx) in evidenceAgainst"
              :key="idx"
              class="flex items-center justify-between gap-2 text-sm text-slate-300 bg-emerald-900/20 px-2 py-1 rounded"
            >
              <span class="truncate">{{ item }}</span>
              <button
                @click="removeEvidenceAgainst(idx)"
                class="text-slate-500 hover:text-red-400 transition-colors shrink-0"
              >
                <X :size="14" />
              </button>
            </li>
          </ul>
        </div>
      </div>

      <!-- Balanced Thought -->
      <div class="mb-4">
        <label class="text-xs text-slate-400 block mb-1">
          Balanced thought (considering all evidence):
        </label>
        <textarea
          v-model="balancedThought"
          placeholder="Write a more balanced, realistic thought..."
          class="w-full h-20 bg-slate-800 border border-purple-500/30 rounded px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 resize-none transition-colors"
        ></textarea>
        <div class="text-xs text-slate-500 mt-1">
          {{ balancedThought.trim().length < 10 ? `${10 - balancedThought.trim().length} more characters` : 'Ready' }}
        </div>
      </div>

      <!-- Footer -->
      <div class="pt-3 border-t border-slate-700 flex justify-between items-center">
        <div class="text-xs text-slate-400">
          {{ evidenceFor.length }} for | {{ evidenceAgainst.length }} against
        </div>
        <button
          @click="finish"
          :disabled="!canComplete"
          class="text-sm px-3 py-1.5 rounded transition-colors"
          :class="canComplete
            ? 'bg-purple-600 hover:bg-purple-500 text-white'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'"
        >
          Complete Exercise
        </button>
      </div>
    </div>
  </div>
</template>
