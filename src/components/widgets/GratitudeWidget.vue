<script setup lang="ts">
import { ref, computed } from 'vue'
import { Sparkles, CheckCircle2 } from 'lucide-vue-next'
import type { WidgetCompletionState } from '@/types'

const props = withDefaults(defineProps<{
  completionState?: WidgetCompletionState
}>(), {})

const emit = defineEmits<{
  complete: [{
    success: boolean
    entries: { thing: string; why: string }[]
  }]
}>()

// Rotating prompt hints
const promptHints = [
  ['Something that made you smile', 'A small kindness you received', 'A moment of peace today'],
  ['Someone who supports you', 'A skill or ability you used', 'Something beautiful you noticed'],
  ['Progress you made today', 'Something you learned', 'A challenge you overcame']
]

// Restore state from completionState if present
const savedEntries = (props.completionState?.result?.entries as { thing: string; why: string }[]) ?? [
  { thing: '', why: '' },
  { thing: '', why: '' },
  { thing: '', why: '' }
]

const entries = ref(savedEntries)
const showSummary = ref(!!props.completionState)
const isSubmitted = ref(!!props.completionState)

const completedEntries = computed(() =>
  entries.value.filter(e => e.thing.trim().length >= 3 && e.why.trim().length >= 3).length
)

const canComplete = computed(() => completedEntries.value >= 3)

const getPlaceholderThing = (idx: number) => {
  const hints = promptHints[idx] ?? promptHints[0]
  return hints[Math.floor(Date.now() / 86400000) % hints.length]
}

const finish = () => {
  showSummary.value = true
}

const complete = () => {
  if (isSubmitted.value) return
  isSubmitted.value = true
  emit('complete', {
    success: true,
    entries: entries.value.filter(e => e.thing.trim() && e.why.trim())
  })
}
</script>

<template>
  <div class="widget-container p-4 my-3 max-w-lg w-full">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
      <h3 class="text-emerald-400 font-bold flex items-center gap-2">
        <Sparkles :size="18" />
        Gratitude Journal
      </h3>
      <span class="text-xs text-slate-500">
        {{ completedEntries }}/3 entries
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
          <h4 class="text-emerald-400 font-medium mb-2">Three Good Things</h4>
          <p class="text-slate-400 text-sm">
            Reflecting on gratitude strengthens your recovery foundation.
          </p>
        </div>

        <div class="space-y-3">
          <div
            v-for="(entry, idx) in entries"
            :key="idx"
            class="p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-lg"
          >
            <div class="flex items-start gap-2">
              <span class="text-emerald-400 font-bold">{{ idx + 1 }}.</span>
              <div class="flex-1">
                <p class="text-slate-200 text-sm font-medium">{{ entry.thing }}</p>
                <p class="text-slate-400 text-xs mt-1">Because: {{ entry.why }}</p>
              </div>
            </div>
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

    <!-- Entry Form -->
    <div v-if="!showSummary" class="space-y-4">
      <p class="text-slate-400 text-sm">
        Write down three things you're grateful for today, and why.
      </p>

      <div
        v-for="(entry, idx) in entries"
        :key="idx"
        class="p-3 rounded-lg transition-colors"
        :class="entry.thing.trim() && entry.why.trim()
          ? 'bg-emerald-900/20 border border-emerald-500/30'
          : 'bg-slate-800/50 border border-slate-700'"
      >
        <div class="flex items-center gap-2 mb-2">
          <span
            class="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors"
            :class="entry.thing.trim() && entry.why.trim()
              ? 'bg-emerald-500/30 text-emerald-400'
              : 'bg-slate-700 text-slate-400'"
          >
            {{ idx + 1 }}
          </span>
          <span class="text-xs text-slate-500">
            {{ entry.thing.trim() && entry.why.trim() ? 'Complete' : 'Entry ' + (idx + 1) }}
          </span>
        </div>

        <div class="space-y-2">
          <div>
            <label :for="`gratitude-thing-${idx}`" class="text-xs text-slate-400 block mb-1">I'm grateful for...</label>
            <input
              :id="`gratitude-thing-${idx}`"
              v-model="entry.thing"
              type="text"
              :placeholder="getPlaceholderThing(idx)"
              class="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
            />
          </div>
          <div>
            <label :for="`gratitude-why-${idx}`" class="text-xs text-slate-400 block mb-1">Because...</label>
            <input
              :id="`gratitude-why-${idx}`"
              v-model="entry.why"
              type="text"
              placeholder="What makes this meaningful?"
              class="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
            />
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="pt-3 border-t border-slate-700 flex justify-end">
        <button
          @click="finish"
          :disabled="!canComplete"
          class="text-sm px-4 py-2 rounded transition-colors"
          :class="canComplete
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'"
        >
          Complete Journal
        </button>
      </div>
    </div>
  </div>
</template>
