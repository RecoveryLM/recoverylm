<script setup lang="ts">
import { computed } from 'vue'
import type { AgentLoopState } from '@/agent'

const props = defineProps<{
  state: AgentLoopState
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
  switch (props.state.status) {
    case 'thinking':
    case 'continuing':
      return 'Thinking...'
    case 'tool_executing': {
      const toolName = props.state.toolName
      if (toolName && toolDescriptions[toolName]) {
        return toolDescriptions[toolName] + '...'
      }
      return 'Processing...'
    }
    case 'streaming':
      return null // Don't show indicator while streaming text
    default:
      return 'Thinking...'
  }
})

const shouldShow = computed(() => {
  return props.state.status !== 'idle' &&
         props.state.status !== 'streaming' &&
         props.state.status !== 'complete' &&
         props.state.status !== 'error'
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
