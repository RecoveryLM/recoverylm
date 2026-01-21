<script setup lang="ts">
import { computed } from 'vue'
import type { AgentLoopState } from '@/types/agent'

const props = defineProps<{
  state: AgentLoopState
  currentTool: string | null
}>()

/**
 * Maps tool names to user-friendly descriptions
 */
const toolDescriptions: Record<string, string> = {
  search_conversations: 'Searching conversations',
  get_metrics: 'Checking metrics',
  search_journal: 'Searching journal'
}

const displayMessage = computed(() => {
  switch (props.state) {
    case 'thinking':
    case 'continuing':
      return 'Thinking...'
    case 'tool_executing':
      if (props.currentTool && toolDescriptions[props.currentTool]) {
        return toolDescriptions[props.currentTool] + '...'
      }
      return 'Processing...'
    case 'streaming':
      return null // Don't show indicator while streaming text
    default:
      return 'Thinking...'
  }
})

const shouldShow = computed(() => {
  return props.state !== 'idle' &&
         props.state !== 'streaming' &&
         props.state !== 'complete'
})
</script>

<template>
  <div
    v-if="shouldShow && displayMessage"
    class="bg-slate-800 text-slate-400 px-4 py-3 rounded-2xl rounded-tl-sm border border-slate-700 shadow-md inline-flex items-center gap-2"
  >
    <span class="flex items-center gap-1">
      <span class="thinking-dot w-2 h-2 bg-emerald-400 rounded-full"></span>
      <span class="thinking-dot w-2 h-2 bg-emerald-400 rounded-full"></span>
      <span class="thinking-dot w-2 h-2 bg-emerald-400 rounded-full"></span>
    </span>
    <span class="text-sm">{{ displayMessage }}</span>
  </div>
</template>

<style scoped>
.thinking-dot {
  animation: thinking 1.4s ease-in-out infinite;
}

.thinking-dot:nth-child(1) {
  animation-delay: 0s;
}

.thinking-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.thinking-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes thinking {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
