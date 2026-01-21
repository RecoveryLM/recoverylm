<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from 'vue'
import { Send } from 'lucide-vue-next'
import { marked } from 'marked'
import { useRouter, useRoute } from 'vue-router'
import { useChat } from '@/composables/useChat'
import { useCrisis } from '@/composables/useCrisis'
import { useActivityResult } from '@/composables/useActivityResult'
import { useVault } from '@/composables/useVault'
import type { WidgetId, WidgetCommand } from '@/types'
import { Sparkles } from 'lucide-vue-next'
import WidgetRenderer from '@/components/widgets/WidgetRenderer.vue'
import TypingIndicator from '@/components/chat/TypingIndicator.vue'
import ThinkingIndicator from '@/components/chat/ThinkingIndicator.vue'
import CrisisModal from '@/components/crisis/CrisisModal.vue'

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true
})

const router = useRouter()
const route = useRoute()

// Use the real chat composable
const { messages, isLoading, isStreaming, isGeneratingGreeting, error, agentState, sendMessage: chatSendMessage, startNewSession, loadTodaySession, generateGreeting, showWidget } = useChat()
const { showCrisisModal } = useCrisis()
const { consumeResult } = useActivityResult()
const { userProfile } = useVault()

const goToActivities = () => {
  router.push('/activities')
}

// Render markdown content
const renderMarkdown = (content: string): string => {
  return marked.parse(content) as string
}

const inputText = ref('')
const messagesContainer = ref<HTMLElement>()
const inputElement = ref<HTMLTextAreaElement>()

// Auto-scroll on new messages
watch(messages, async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}, { deep: true })

// Re-focus input when loading finishes
watch(isLoading, (loading, wasLoading) => {
  if (wasLoading && !loading) {
    // Loading just finished, refocus the input
    setTimeout(() => {
      inputElement.value?.focus()
    }, 50)
  }
})

// Scroll to bottom helper
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// Build context message for journal entry analysis
function buildJournalContextMessage(template: string, content: string): string {
  return `I just wrote a journal entry using the "${template}" template. Here's what I wrote:\n\n---\n${content}\n---\n\nCan you help me reflect on this and provide some insights?`
}

// Check for pending activity results, journal entries, and initialize chat
onMounted(async () => {
  // Check for showWidget query param (e.g., from Dashboard "Review Commitment" button)
  const showWidgetParam = route.query.showWidget as string | undefined
  const widgetModeParam = route.query.widgetMode as string | undefined

  if (showWidgetParam === 'W_COMMITMENT') {
    const widget: WidgetCommand = {
      id: 'W_COMMITMENT',
      params: { mode: widgetModeParam || 'view' }
    }
    showWidget("Here's your commitment statement:", widget)
    router.replace({ name: 'chat' }) // Clear query params
    return
  }

  // Check for journal entry from query params
  const journalContent = route.query.content as string | undefined
  const journalTemplate = route.query.template as string | undefined

  if (journalContent && journalTemplate) {
    // Clear the query params from URL without navigation
    router.replace({ name: 'chat', query: {} })

    // Start a new session for the journal analysis
    startNewSession()

    // Send the journal content to Remi
    const contextMessage = buildJournalContextMessage(journalTemplate, journalContent)
    await chatSendMessage(contextMessage)
    return
  }

  const activityResult = consumeResult()
  if (activityResult) {
    // Build a context message about the completed activity
    const contextMessage = buildActivityContextMessage(activityResult.widgetId, activityResult.widgetName, activityResult.result)
    await chatSendMessage(contextMessage)
  } else {
    // Try to load today's existing session first
    const hasExistingMessages = await loadTodaySession()

    if (!hasExistingMessages) {
      // Generate personalized greeting when no messages exist
      await generateGreeting()
    } else {
      // Scroll to bottom if there are existing messages
      await nextTick()
      scrollToBottom()
    }
  }
})

// Build a user message that gives Remi context about the completed activity
function buildActivityContextMessage(widgetId: WidgetId, widgetName: string, result: unknown): string {
  const r = result as Record<string, unknown>

  switch (widgetId) {
    case 'W_DENTS': {
      const steps = (r.stepsCompleted as string[]) || []
      return `I just completed the DENTS protocol. I finished ${steps.length}/5 steps: ${steps.join(', ')}. Can we talk about how it went?`
    }
    case 'W_TAPE': {
      // TapeWidget emits { success, responses: string[] } - 4 responses to prompts
      const responses = (r.responses as string[]) || []
      if (responses.length > 0 && responses.some(r => r.trim())) {
        return `I just played the tape forward. Here's what I realized:\n\n${responses.filter(r => r.trim()).join('\n\n')}\n\nWhat do you think?`
      }
      return `I just played the tape forward. I'd like to discuss what I realized.`
    }
    case 'W_STOIC': {
      // StoicWidget emits { success, canControl: string[], cannotControl: string[] }
      const canControl = (r.canControl as string[]) || []
      const cannotControl = (r.cannotControl as string[]) || []
      let msg = `I did the Dichotomy of Control exercise.\n\n`
      if (canControl.length > 0) {
        msg += `Things I CAN control: ${canControl.join('; ')}\n`
      }
      if (cannotControl.length > 0) {
        msg += `Things I CANNOT control: ${cannotControl.join('; ')}\n`
      }
      msg += `\nCan we talk through this?`
      return msg
    }
    case 'W_EVIDENCE': {
      const thought = r.thought || 'a negative thought'
      const evidenceFor = (r.evidenceFor as string[]) || []
      const evidenceAgainst = (r.evidenceAgainst as string[]) || []
      const balancedThought = r.balancedThought || ''
      let msg = `I examined the thought: "${thought}"\n\n`
      msg += `Evidence FOR (${evidenceFor.length}): ${evidenceFor.join('; ') || 'none'}\n`
      msg += `Evidence AGAINST (${evidenceAgainst.length}): ${evidenceAgainst.join('; ') || 'none'}\n\n`
      if (balancedThought) {
        msg += `My balanced thought: "${balancedThought}"\n\n`
      }
      msg += `What's your take on this?`
      return msg
    }
    case 'W_URGESURF': {
      // UrgeSurfWidget emits { success, durationCompleted: number (seconds) }
      const seconds = (r.durationCompleted as number) || 0
      const minutes = Math.round(seconds / 60)
      return `I just finished ${minutes > 0 ? `a ${minutes}-minute` : 'an'} urge surfing meditation. The urge has passed a bit. Can we talk about it?`
    }
    case 'W_CHECKIN': {
      const metric = r.metric as Record<string, unknown>
      if (metric) {
        const mood = metric.moodScore || 'not recorded'
        const sober = metric.sobrietyMaintained ? 'maintained sobriety' : 'had a struggle'
        return `I just completed my daily check-in. My mood is ${mood}/10 and I ${sober} today. Anything you notice?`
      }
      return `I just completed my daily check-in. Can we review how things are going?`
    }
    case 'W_COMMITMENT':
      return `I just reviewed my commitment statement. It was good to reconnect with why I'm doing this.`
    case 'W_NETWORK':
      return `I just looked at my support network. I'm thinking about reaching out to someone.`
    default:
      return `I just completed the ${widgetName} activity. Can we discuss it?`
  }
}

const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text || isLoading.value) return

  inputText.value = ''
  await chatSendMessage(text)
  // Focus is handled by the isLoading watcher
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

const handleInputBlur = () => {
  // If we're in the middle of loading/streaming, refocus the input
  if (isLoading.value || isStreaming.value) {
    setTimeout(() => inputElement.value?.focus(), 0)
  }
}

const handleWidgetComplete = (widgetId: string, result: unknown) => {
  // Include the actual widget result data so the AI can see what the user entered
  let completionNote = ''

  switch (widgetId) {
    case 'W_DENTS': {
      const r = result as { success: boolean; stepsCompleted: string[] }
      completionNote = `I just completed the DENTS protocol. I finished ${r.stepsCompleted.length}/5 steps: ${r.stepsCompleted.join(', ')}.`
      break
    }
    case 'W_TAPE': {
      const r = result as { success: boolean; responses: string[] }
      completionNote = `I just finished playing the tape forward. Here's what I came up with:\n${r.responses.map((resp, i) => `${i + 1}. ${resp}`).join('\n')}`
      break
    }
    case 'W_STOIC': {
      const r = result as { success: boolean; canControl: string[]; cannotControl: string[] }
      completionNote = `I completed the Dichotomy of Control exercise.\n\nThings I CAN control:\n${r.canControl.map(item => `- ${item}`).join('\n')}\n\nThings I CANNOT control:\n${r.cannotControl.map(item => `- ${item}`).join('\n')}`
      break
    }
    case 'W_EVIDENCE': {
      const r = result as { success: boolean; thought: string; evidenceFor: string[]; evidenceAgainst: string[]; balancedThought: string }
      completionNote = `I finished examining the evidence for my thought: "${r.thought}"\n\nEvidence supporting it:\n${r.evidenceFor.map(e => `- ${e}`).join('\n')}\n\nEvidence against it:\n${r.evidenceAgainst.map(e => `- ${e}`).join('\n')}\n\nMy balanced thought: "${r.balancedThought}"`
      break
    }
    case 'W_URGESURF': {
      const r = result as { success: boolean; durationCompleted: number }
      const minutes = Math.floor(r.durationCompleted / 60)
      const seconds = r.durationCompleted % 60
      completionNote = `I just completed an urge surfing session for ${minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''} and ` : ''}${seconds} seconds.`
      break
    }
    case 'W_CHECKIN': {
      const r = result as { success: boolean; metric: { sobriety: boolean; exercised: boolean; mealsEaten: number; mood: number; journaled: boolean; socialConnection: boolean; sleepHours: number; notes?: string } }
      const m = r.metric
      completionNote = `I completed my daily check-in:\n- Sober today: ${m.sobriety ? 'Yes' : 'No'}\n- Exercised: ${m.exercised ? 'Yes' : 'No'}\n- Meals eaten: ${m.mealsEaten}\n- Mood (1-10): ${m.mood}\n- Journaled: ${m.journaled ? 'Yes' : 'No'}\n- Social connection: ${m.socialConnection ? 'Yes' : 'No'}\n- Sleep: ${m.sleepHours} hours${m.notes ? `\n- Notes: ${m.notes}` : ''}`
      break
    }
    case 'W_COMMITMENT': {
      const r = result as { success: boolean; commitment: string }
      completionNote = `I just reviewed my commitment statement: "${r.commitment}"`
      break
    }
    case 'W_NETWORK': {
      const r = result as { success: boolean; action: string; contactedPeople?: string[] }
      if (r.contactedPeople && r.contactedPeople.length > 0) {
        completionNote = `I reached out to my support network. I contacted: ${r.contactedPeople.join(', ')}.`
      } else {
        completionNote = `I reviewed my support network.`
      }
      break
    }
    default:
      completionNote = "I completed the exercise."
  }

  // Send as a user message so AI can see and respond to the actual data
  if (completionNote) {
    chatSendMessage(completionNote)
  }
}

const handleNewChat = () => {
  startNewSession()
}
</script>

<template>
  <div class="h-full max-w-3xl mx-auto border-x border-slate-800 shadow-2xl flex flex-col bg-slate-900">
    <!-- Crisis Modal -->
    <CrisisModal v-if="showCrisisModal" />

    <!-- Header -->
    <div class="p-3 border-b border-slate-700 flex justify-between items-center">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold text-xs shadow-lg">
          R
        </div>
        <div>
          <div class="text-sm font-medium text-slate-200">Remi</div>
          <div class="text-xs text-slate-500">Recovery Companion</div>
        </div>
      </div>
      <button
        @click="handleNewChat"
        class="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700 transition-colors"
      >
        New Chat
      </button>
    </div>

    <!-- Error Banner -->
    <div
      v-if="error"
      class="p-2 bg-red-900/30 border-b border-red-500/30 text-red-400 text-sm text-center"
    >
      {{ error }}
    </div>

    <!-- Messages Area -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto p-4 space-y-6"
    >
      <!-- Greeting Loading State -->
      <div v-if="messages.length === 0 && isGeneratingGreeting" class="flex flex-col items-center justify-center h-full text-center px-4">
        <div class="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold text-2xl shadow-lg mb-4">
          R
        </div>
        <TypingIndicator />
      </div>

      <!-- Empty State (static fallback) -->
      <div v-else-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center px-4">
        <div class="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold text-2xl shadow-lg mb-4">
          R
        </div>
        <h2 class="text-slate-200 text-lg font-medium mb-2">Hello{{ userProfile?.displayName ? `, ${userProfile.displayName}` : '' }}</h2>
        <p class="text-slate-400 text-sm max-w-sm mb-6">
          What's on your mind?
        </p>
        <button
          @click="goToActivities"
          class="flex items-center gap-2 px-4 py-2 bg-indigo-900/30 border border-indigo-500/30 rounded-lg text-indigo-400 hover:bg-indigo-900/50 hover:border-indigo-500/50 transition-all"
        >
          <Sparkles :size="18" />
          Browse Activities
        </button>
      </div>

      <!-- Date Separator -->
      <div v-if="messages.length > 0" class="flex justify-center">
        <span class="text-xs font-mono text-slate-600 bg-slate-900 px-2">
          Today, {{ new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }}
        </span>
      </div>

      <!-- Messages -->
      <template v-for="message in messages" :key="message.id">
        <!-- User Message -->
        <div v-if="message.role === 'user'" class="flex justify-end animate-slide-up">
          <div class="bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-md">
            <p class="text-base whitespace-pre-wrap">{{ message.content }}</p>
          </div>
        </div>

        <!-- Assistant Message (hide empty placeholder during thinking phase) -->
        <div v-else-if="message.role === 'assistant' && !(message.content === '' && isLoading && !isStreaming)" class="flex justify-start items-start gap-3 animate-slide-up">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex-shrink-0 flex items-center justify-center text-white font-bold text-xs shadow-lg">
            R
          </div>
          <div class="flex flex-col gap-2 max-w-[90%]">
            <div class="bg-slate-800 text-slate-200 p-4 rounded-2xl rounded-tl-sm border border-slate-700 shadow-md">
              <div class="prose prose-base prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 max-w-none" v-html="renderMarkdown(message.content)"></div>
            </div>

            <!-- Widgets -->
            <template v-if="message.widgets?.length">
              <WidgetRenderer
                v-for="(widget, idx) in message.widgets"
                :key="idx"
                :widget="widget"
                @complete="handleWidgetComplete"
              />
            </template>
          </div>
        </div>

        <!-- System Message (for context, usually hidden or styled differently) -->
        <div v-else-if="message.role === 'system'" class="flex justify-center">
          <span class="text-xs text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full">
            {{ message.content }}
          </span>
        </div>
      </template>

      <!-- Thinking Indicator (shows during agentic loop with tool info) -->
      <div v-if="isLoading && !isStreaming && agentState.loopState !== 'idle'" class="flex justify-start items-start gap-3">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex-shrink-0 flex items-center justify-center text-white font-bold text-xs shadow-lg">
          R
        </div>
        <ThinkingIndicator
          :state="agentState.loopState"
          :current-tool="agentState.currentTool"
        />
      </div>

      <!-- Typing Indicator (fallback for non-agentic loading) -->
      <div v-else-if="isLoading && !isStreaming" class="flex justify-start items-start gap-3">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex-shrink-0 flex items-center justify-center text-white font-bold text-xs shadow-lg">
          R
        </div>
        <TypingIndicator />
      </div>
    </div>

    <!-- Input Area -->
    <div class="p-4 bg-slate-800 border-t border-slate-700">
      <div class="flex items-center gap-3 bg-slate-900 p-2 rounded-xl border border-slate-700 focus-within:border-indigo-500 transition-colors">
        <textarea
          ref="inputElement"
          v-model="inputText"
          :placeholder="isLoading ? 'Waiting for response...' : 'Type your message...'"
          class="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-base pl-2 resize-none min-h-[24px] max-h-[120px]"
          rows="1"
          @keydown="handleKeydown"
          @blur="handleInputBlur"
          @input="($event.target as HTMLTextAreaElement).style.height = 'auto'; ($event.target as HTMLTextAreaElement).style.height = ($event.target as HTMLTextAreaElement).scrollHeight + 'px'"
        />
        <button
          @click="sendMessage"
          @mousedown.prevent
          :disabled="!inputText.trim() || isLoading"
          tabindex="-1"
          class="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg shadow-lg transition-all"
          aria-label="Send message"
        >
          <Send :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>
