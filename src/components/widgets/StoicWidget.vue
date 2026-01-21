<script setup lang="ts">
import { ref, computed } from 'vue'
import { Columns2, Plus, X, CheckCircle2 } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  situation?: string
}>(), {
  situation: ''
})

const emit = defineEmits<{
  complete: [{ success: boolean; canControl: string[]; cannotControl: string[] }]
}>()

const situationInput = ref(props.situation)
const canControl = ref<string[]>([])
const cannotControl = ref<string[]>([])
const newCanControl = ref('')
const newCannotControl = ref('')
const showSummary = ref(false)
const isSubmitted = ref(false)

const hasEntries = computed(() => canControl.value.length > 0 || cannotControl.value.length > 0)

const addToCanControl = () => {
  const item = newCanControl.value.trim()
  if (item && !canControl.value.includes(item)) {
    canControl.value.push(item)
    newCanControl.value = ''
  }
}

const addToCannotControl = () => {
  const item = newCannotControl.value.trim()
  if (item && !cannotControl.value.includes(item)) {
    cannotControl.value.push(item)
    newCannotControl.value = ''
  }
}

const removeFromCanControl = (idx: number) => {
  canControl.value.splice(idx, 1)
}

const removeFromCannotControl = (idx: number) => {
  cannotControl.value.splice(idx, 1)
}

const finish = () => {
  showSummary.value = true
}

const complete = () => {
  if (isSubmitted.value) return
  isSubmitted.value = true
  emit('complete', {
    success: true,
    canControl: canControl.value,
    cannotControl: cannotControl.value
  })
}
</script>

<template>
  <div class="widget-container p-4 my-3 max-w-lg w-full">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
      <h3 class="text-cyan-400 font-bold flex items-center gap-2">
        <Columns2 :size="18" />
        Dichotomy of Control
      </h3>
    </div>

    <!-- Situation Input -->
    <div class="mb-4">
      <label class="text-xs text-slate-400 block mb-1">What situation is troubling you?</label>
      <input
        v-model="situationInput"
        type="text"
        placeholder="Describe the situation..."
        class="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
      />
    </div>

    <!-- Summary View -->
    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
    >
      <div v-if="showSummary" class="text-center py-4">
        <div class="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/20 rounded-full mb-3">
          <CheckCircle2 class="text-emerald-400" :size="24" />
        </div>
        <h4 class="text-emerald-400 font-medium mb-2">Exercise Complete</h4>
        <p class="text-slate-400 text-sm mb-4">
          Focus your energy on what you can control. Accept what you cannot.
        </p>

        <div class="grid grid-cols-2 gap-3 text-left">
          <div class="p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
            <div class="text-emerald-400 text-xs font-medium mb-2">Focus On ({{ canControl.length }})</div>
            <ul class="text-sm text-slate-300 space-y-1">
              <li v-for="(item, idx) in canControl" :key="idx" class="truncate">{{ item }}</li>
            </ul>
          </div>
          <div class="p-3 bg-slate-800/50 border border-slate-600 rounded-lg">
            <div class="text-slate-400 text-xs font-medium mb-2">Let Go ({{ cannotControl.length }})</div>
            <ul class="text-sm text-slate-400 space-y-1">
              <li v-for="(item, idx) in cannotControl" :key="idx" class="truncate line-through">{{ item }}</li>
            </ul>
          </div>
        </div>

        <button
          @click="complete"
          :disabled="isSubmitted"
          class="mt-4 text-white text-sm px-4 py-2 rounded transition-colors"
          :class="isSubmitted
            ? 'bg-slate-600 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-500'"
        >
          {{ isSubmitted ? 'Logged' : 'Log This Exercise' }}
        </button>
      </div>
    </Transition>

    <!-- Two Columns -->
    <div v-if="!showSummary" class="grid grid-cols-2 gap-3">
      <!-- Can Control Column -->
      <div class="p-3 bg-emerald-900/10 border border-emerald-500/20 rounded-lg">
        <h4 class="text-emerald-400 text-sm font-medium mb-2">What I CAN Control</h4>

        <!-- Input -->
        <div class="flex gap-1 mb-2">
          <input
            v-model="newCanControl"
            type="text"
            placeholder="Add item..."
            @keyup.enter="addToCanControl"
            class="flex-1 bg-slate-800 border border-emerald-500/30 rounded px-2 py-1 text-sm text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
          />
          <button
            @click="addToCanControl"
            :disabled="!newCanControl.trim()"
            class="p-1 rounded transition-colors"
            :class="newCanControl.trim()
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-slate-700 text-slate-500'"
          >
            <Plus :size="16" />
          </button>
        </div>

        <!-- List -->
        <ul class="space-y-1 max-h-40 overflow-y-auto">
          <li
            v-for="(item, idx) in canControl"
            :key="idx"
            class="flex items-center justify-between gap-2 text-sm text-slate-200 bg-emerald-900/20 px-2 py-1 rounded"
          >
            <span class="truncate">{{ item }}</span>
            <button
              @click="removeFromCanControl(idx)"
              class="text-slate-500 hover:text-red-400 transition-colors shrink-0"
            >
              <X :size="14" />
            </button>
          </li>
        </ul>
        <p v-if="canControl.length === 0" class="text-slate-500 text-xs italic">
          My thoughts, actions, responses...
        </p>
      </div>

      <!-- Cannot Control Column -->
      <div class="p-3 bg-slate-800/50 border border-slate-600 rounded-lg">
        <h4 class="text-slate-400 text-sm font-medium mb-2">What I CANNOT Control</h4>

        <!-- Input -->
        <div class="flex gap-1 mb-2">
          <input
            v-model="newCannotControl"
            type="text"
            placeholder="Add item..."
            @keyup.enter="addToCannotControl"
            class="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 placeholder:text-slate-500 focus:border-slate-500 focus:ring-1 focus:ring-slate-500/50 transition-colors"
          />
          <button
            @click="addToCannotControl"
            :disabled="!newCannotControl.trim()"
            class="p-1 rounded transition-colors"
            :class="newCannotControl.trim()
              ? 'bg-slate-600 hover:bg-slate-500 text-white'
              : 'bg-slate-700 text-slate-500'"
          >
            <Plus :size="16" />
          </button>
        </div>

        <!-- List -->
        <ul class="space-y-1 max-h-40 overflow-y-auto">
          <li
            v-for="(item, idx) in cannotControl"
            :key="idx"
            class="flex items-center justify-between gap-2 text-sm text-slate-400 bg-slate-700/50 px-2 py-1 rounded"
          >
            <span class="truncate line-through">{{ item }}</span>
            <button
              @click="removeFromCannotControl(idx)"
              class="text-slate-500 hover:text-red-400 transition-colors shrink-0"
            >
              <X :size="14" />
            </button>
          </li>
        </ul>
        <p v-if="cannotControl.length === 0" class="text-slate-500 text-xs italic">
          Others' actions, past events, outcomes...
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div v-if="!showSummary" class="mt-4 pt-3 border-t border-slate-700 flex justify-between items-center">
      <div class="text-xs text-slate-400">
        {{ canControl.length + cannotControl.length }} items sorted
      </div>
      <button
        @click="finish"
        :disabled="!hasEntries"
        class="text-sm px-3 py-1.5 rounded transition-colors"
        :class="hasEntries
          ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
          : 'bg-slate-700 text-slate-500 cursor-not-allowed'"
      >
        Complete Exercise
      </button>
    </div>
  </div>
</template>
