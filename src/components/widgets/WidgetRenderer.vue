<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import type { WidgetCommand } from '@/types'

const props = defineProps<{
  widget: WidgetCommand
  messageId: string
}>()

const emit = defineEmits<{
  complete: [widgetId: string, result: unknown]
}>()

// Async component mapping for code splitting
const widgetComponents = {
  W_DENTS: defineAsyncComponent(() => import('./DentsWidget.vue')),
  W_TAPE: defineAsyncComponent(() => import('./TapeWidget.vue')),
  W_STOIC: defineAsyncComponent(() => import('./StoicWidget.vue')),
  W_EVIDENCE: defineAsyncComponent(() => import('./EvidenceWidget.vue')),
  W_URGESURF: defineAsyncComponent(() => import('./UrgeSurfWidget.vue')),
  W_CHECKIN: defineAsyncComponent(() => import('./CheckinWidget.vue')),
  W_COMMITMENT: defineAsyncComponent(() => import('./CommitmentWidget.vue')),
  W_NETWORK: defineAsyncComponent(() => import('./NetworkWidget.vue'))
}

const component = computed(() => {
  return widgetComponents[props.widget.id] ?? null
})

const handleComplete = (result: unknown) => {
  emit('complete', props.widget.id, result)
}
</script>

<template>
  <div v-if="component" class="widget-wrapper">
    <Suspense>
      <component
        :is="component"
        v-bind="widget.params"
        :completion-state="widget.completionState"
        @complete="handleComplete"
      />
      <template #fallback>
        <div class="widget-container p-4 my-3 max-w-md w-full animate-pulse">
          <div class="h-4 bg-slate-700 rounded w-1/3 mb-4"></div>
          <div class="h-20 bg-slate-700 rounded mb-2"></div>
          <div class="h-8 bg-slate-700 rounded w-1/4 ml-auto"></div>
        </div>
      </template>
    </Suspense>
  </div>
  <div v-else class="widget-container p-4 my-3 max-w-md w-full border-red-500/30">
    <p class="text-red-400 text-sm">Unknown widget: {{ widget.id }}</p>
  </div>
</template>
