import { ref, readonly } from 'vue'
import type { ChatMessage, WidgetCommand, WidgetId } from '@/types'
import { generateId, generateSessionId } from '@/types'
import {
  runAgent,
  createIdleState,
  type AgentLoopState,
  type StreamEvent
} from '@/agent'
import { useCrisis } from './useCrisis'
import { useVault } from './useVault'
import { buildContextWindow, buildGreetingContext } from '@/services/orchestrator'
import { getAnthropicProvider } from '@/services/inference'
import { parseWidgetCommands } from '@/services/widgetParser'

const MAX_AGENT_ITERATIONS = 5

// ============================================
// Chat State
// ============================================

const messages = ref<ChatMessage[]>([])
const isLoading = ref(false)
const isStreaming = ref(false)
const isGeneratingGreeting = ref(false)
const currentSessionId = ref<string | null>(null)
const error = ref<string | null>(null)
const streamingMessageId = ref<string | null>(null)
const sessionInitialized = ref(false)
const agentState = ref<AgentLoopState>(createIdleState())

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a session ID is from today based on embedded timestamp
 */
function isSessionFromToday(sessionId: string): boolean {
  const match = sessionId.match(/^session_(\d+)_/)
  if (!match) return false

  const sessionTimestamp = parseInt(match[1], 10)
  const sessionDate = new Date(sessionTimestamp).toDateString()
  const todayDate = new Date().toDateString()

  return sessionDate === todayDate
}

/**
 * Ensure we have a valid session ID
 */
function ensureSessionId(): string {
  if (!currentSessionId.value) {
    currentSessionId.value = generateSessionId()
  }
  return currentSessionId.value
}

// ============================================
// Composable
// ============================================

export function useChat() {
  const { assessMessage, shouldBlockFlow, shouldInjectContext } = useCrisis()
  const { saveChatMessage, getChatHistory, getRecentSessions, isUnlocked } = useVault()

  /**
   * Load today's session if one exists, otherwise prepare for a new session.
   */
  const loadTodaySession = async (): Promise<boolean> => {
    if (sessionInitialized.value || !isUnlocked.value) {
      return messages.value.length > 0
    }

    sessionInitialized.value = true

    try {
      const recentSessions = await getRecentSessions(10)
      const todaySession = recentSessions.find(isSessionFromToday)

      if (todaySession) {
        const history = await getChatHistory(todaySession)
        if (history.length > 0) {
          messages.value = history
          currentSessionId.value = todaySession
          return true
        }
      }

      currentSessionId.value = generateSessionId()
      return false
    } catch (e) {
      console.error('Failed to load today\'s session:', e)
      currentSessionId.value = generateSessionId()
      return false
    }
  }

  /**
   * Send a message and get AI response using the agent runner
   */
  const sendMessage = async (content: string): Promise<void> => {
    if (!content.trim() || isLoading.value) return

    isLoading.value = true
    error.value = null
    agentState.value = { status: 'thinking', iteration: 1 }

    try {
      // 1. Crisis check FIRST (before any API call)
      const crisisAssessment = await assessMessage(content)

      if (shouldBlockFlow(crisisAssessment)) {
        agentState.value = createIdleState()
        return
      }

      // 2. Add user message
      const sessionId = ensureSessionId()
      const userMessage: ChatMessage = {
        id: generateId(),
        sessionId,
        role: 'user',
        content,
        timestamp: Date.now(),
        crisisLevel: crisisAssessment.level
      }
      messages.value.push(userMessage)

      if (isUnlocked.value) {
        await saveChatMessage(userMessage)
      }

      // 3. Build context window
      const crisisContext = shouldInjectContext(crisisAssessment)
        ? { level: crisisAssessment.level, action: crisisAssessment.recommendedAction }
        : undefined

      const context = await buildContextWindow(content, sessionId, crisisContext)

      // 4. Create placeholder message for streaming
      const messageId = generateId()
      streamingMessageId.value = messageId

      const assistantMessage: ChatMessage = {
        id: messageId,
        sessionId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        widgets: []
      }
      messages.value.push(assistantMessage)

      // 5. Run agent using the new runner
      let accumulatedText = ''
      let finalWidgets: WidgetCommand[] = []

      const runner = runAgent(content, {
        maxIterations: MAX_AGENT_ITERATIONS,
        context,
        onStateChange: (state) => {
          agentState.value = state
        }
      })

      for await (const event of runner) {
        handleStreamEvent(event, messageId, (text) => {
          accumulatedText = text
          isStreaming.value = true
        }, (widgets) => {
          finalWidgets = widgets
        })
      }

      // 6. Finalize the message
      const msg = messages.value.find(m => m.id === messageId)
      if (msg) {
        const { text: cleanText } = parseWidgetCommands(accumulatedText)
        msg.content = cleanText
        msg.widgets = finalWidgets
      }

      if (isUnlocked.value && msg) {
        await saveChatMessage(msg)
      }

      agentState.value = { status: 'complete', totalIterations: MAX_AGENT_ITERATIONS }
      isStreaming.value = false
      streamingMessageId.value = null

    } catch (e) {
      console.error('Chat error:', e)
      error.value = e instanceof Error ? e.message : 'Failed to get response'

      const msg = messages.value.find(m => m.id === streamingMessageId.value)
      if (msg) {
        msg.content = "I'm having trouble connecting right now. Please try again in a moment. If you're in crisis, remember you can always tap the SOS button or call 988."
      } else {
        const errorMessage: ChatMessage = {
          id: generateId(),
          sessionId: ensureSessionId(),
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please try again in a moment. If you're in crisis, remember you can always tap the SOS button or call 988.",
          timestamp: Date.now()
        }
        messages.value.push(errorMessage)
      }

      agentState.value = { status: 'error', error: error.value ?? 'Unknown error' }
      isStreaming.value = false
      streamingMessageId.value = null
    } finally {
      isLoading.value = false
      setTimeout(() => {
        agentState.value = createIdleState()
      }, 500)
    }
  }

  /**
   * Handle stream events from the agent runner
   */
  function handleStreamEvent(
    event: StreamEvent,
    messageId: string,
    onText: (text: string) => void,
    onWidgets: (widgets: WidgetCommand[]) => void
  ): void {
    switch (event.type) {
      case 'token': {
        const msg = messages.value.find(m => m.id === messageId)
        if (msg) {
          msg.content += event.text
          onText(msg.content)
        }
        break
      }

      case 'complete': {
        // Extract widgets from the message's internal property
        const msgWithWidgets = event.message as { _widgets?: WidgetCommand[] }
        if (msgWithWidgets._widgets) {
          onWidgets(msgWithWidgets._widgets)
        }
        break
      }

      case 'state_change':
        // State is already handled via onStateChange callback
        break

      case 'tool_start':
      case 'tool_end':
        // Tool events can be used for UI indicators if needed
        break

      case 'error':
        error.value = event.error
        break
    }
  }

  /**
   * Load chat history for a session
   */
  const loadSession = async (sessionId?: string): Promise<void> => {
    const targetSession = sessionId ?? currentSessionId.value ?? ensureSessionId()

    if (isUnlocked.value) {
      try {
        const history = await getChatHistory(targetSession)
        messages.value = history
        if (sessionId) {
          currentSessionId.value = sessionId
        }
      } catch (e) {
        console.error('Failed to load chat history:', e)
      }
    }
  }

  /**
   * Start a new chat session
   */
  const startNewSession = (): void => {
    currentSessionId.value = generateSessionId()
    messages.value = []
    error.value = null
  }

  /**
   * Add a system message (for widget completions, etc.)
   */
  const addSystemMessage = (content: string): void => {
    const systemMessage: ChatMessage = {
      id: generateId(),
      sessionId: ensureSessionId(),
      role: 'system',
      content,
      timestamp: Date.now()
    }
    messages.value.push(systemMessage)
  }

  /**
   * Show a widget directly with a brief intro message (no AI call)
   */
  const showWidget = (introMessage: string, widget: WidgetCommand): void => {
    const assistantMessage: ChatMessage = {
      id: generateId(),
      sessionId: ensureSessionId(),
      role: 'assistant',
      content: introMessage,
      timestamp: Date.now(),
      widgets: [widget]
    }
    messages.value.push(assistantMessage)

    if (isUnlocked.value) {
      saveChatMessage(assistantMessage)
    }
  }

  /**
   * Persist widget completion state to the vault
   */
  const completeWidget = async (
    messageId: string,
    widgetId: WidgetId,
    result: Record<string, unknown>
  ): Promise<void> => {
    const message = messages.value.find(m => m.id === messageId)
    if (!message?.widgets) return

    const widget = message.widgets.find(w => w.id === widgetId)
    if (!widget) return

    widget.completionState = { completedAt: Date.now(), result }

    if (isUnlocked.value) {
      await saveChatMessage(message)
    }
  }

  /**
   * Generate a personalized greeting message from the AI
   */
  const generateGreeting = async (): Promise<void> => {
    if (messages.value.length > 0 || isGeneratingGreeting.value) {
      return
    }

    isGeneratingGreeting.value = true
    error.value = null

    try {
      const context = await buildGreetingContext()

      const messageId = generateId()
      streamingMessageId.value = messageId
      isStreaming.value = true

      const assistantMessage: ChatMessage = {
        id: messageId,
        sessionId: ensureSessionId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        widgets: []
      }
      messages.value.push(assistantMessage)

      const provider = getAnthropicProvider()
      await provider.streamMessage(context, {
        onToken: (token) => {
          const msg = messages.value.find(m => m.id === messageId)
          if (msg) {
            msg.content += token
          }
        },
        onComplete: async (response) => {
          const msg = messages.value.find(m => m.id === messageId)
          if (msg) {
            msg.content = response.text
            msg.widgets = response.widgets
          }

          if (isUnlocked.value && msg) {
            await saveChatMessage(msg)
          }

          isStreaming.value = false
          streamingMessageId.value = null
          isGeneratingGreeting.value = false
        },
        onError: () => {
          const msgIndex = messages.value.findIndex(m => m.id === messageId)
          if (msgIndex !== -1) {
            messages.value.splice(msgIndex, 1)
          }

          isStreaming.value = false
          streamingMessageId.value = null
          isGeneratingGreeting.value = false
        }
      })
    } catch {
      isStreaming.value = false
      streamingMessageId.value = null
      isGeneratingGreeting.value = false
    }
  }

  return {
    messages: readonly(messages),
    isLoading: readonly(isLoading),
    isStreaming: readonly(isStreaming),
    isGeneratingGreeting: readonly(isGeneratingGreeting),
    currentSessionId: readonly(currentSessionId),
    error: readonly(error),
    agentState: readonly(agentState),
    sendMessage,
    showWidget,
    completeWidget,
    loadSession,
    loadTodaySession,
    startNewSession,
    addSystemMessage,
    generateGreeting
  }
}
