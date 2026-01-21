import { ref, readonly } from 'vue'
import type { ChatMessage, WidgetCommand } from '@/types'
import { generateId, generateSessionId } from '@/types'
import type { AgentState, ToolResultMessage } from '@/types/agent'
import { createInitialAgentState } from '@/types/agent'
import { useCrisis } from './useCrisis'
import { useVault } from './useVault'
import { buildContextWindow, buildGreetingContext } from '@/services/orchestrator'
import { getAnthropicProvider } from '@/services/inference'
import type { AgenticMessage, AgenticResponse } from '@/services/inference/types'
import { AGENT_TOOLS, executeAgentTool, formatToolResultContent } from '@/services/agentTools'
import { parseWidgetCommands } from '@/services/widgetParser'

const MAX_AGENT_ITERATIONS = 5

// ============================================
// Chat State
// ============================================

const messages = ref<ChatMessage[]>([])
const isLoading = ref(false)
const isStreaming = ref(false)
const isGeneratingGreeting = ref(false)
const currentSessionId = ref<string | null>(null) // Will be set on first use or when loading session
const error = ref<string | null>(null)
const streamingMessageId = ref<string | null>(null)
const sessionInitialized = ref(false)
const agentState = ref<AgentState>(createInitialAgentState())

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a session ID is from today based on embedded timestamp
 */
function isSessionFromToday(sessionId: string): boolean {
  // Session format: session_{timestamp}_{random}
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
   * Should be called on chat page mount before generating a greeting.
   */
  const loadTodaySession = async (): Promise<boolean> => {
    // Skip if already initialized or vault is locked
    if (sessionInitialized.value || !isUnlocked.value) {
      return messages.value.length > 0
    }

    sessionInitialized.value = true

    try {
      // Get recent session IDs
      const recentSessions = await getRecentSessions(10)

      // Find the most recent session from today
      const todaySession = recentSessions.find(isSessionFromToday)

      if (todaySession) {
        // Load messages from today's session
        const history = await getChatHistory(todaySession)
        if (history.length > 0) {
          messages.value = history
          currentSessionId.value = todaySession
          return true
        }
      }

      // No session from today found - generate new session ID
      currentSessionId.value = generateSessionId()
      return false
    } catch (e) {
      console.error('Failed to load today\'s session:', e)
      // Fallback to new session
      currentSessionId.value = generateSessionId()
      return false
    }
  }

  /**
   * Send a message and get AI response using the agentic loop
   */
  const sendMessage = async (content: string): Promise<void> => {
    if (!content.trim() || isLoading.value) return

    // Set loading immediately to prevent duplicate calls
    isLoading.value = true
    error.value = null

    // Reset agent state
    agentState.value = createInitialAgentState()
    agentState.value.loopState = 'thinking'

    try {
      // 1. Crisis check FIRST (before any API call or tool execution)
      const crisisAssessment = await assessMessage(content)

      // Block if emergency level
      if (shouldBlockFlow(crisisAssessment)) {
        // Crisis modal will handle - don't proceed with AI call
        agentState.value.loopState = 'idle'
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

      // Save to vault if unlocked
      if (isUnlocked.value) {
        await saveChatMessage(userMessage)
      }

      // 3. Build context window
      const crisisContext = shouldInjectContext(crisisAssessment)
        ? { level: crisisAssessment.level, action: crisisAssessment.recommendedAction }
        : undefined

      const context = await buildContextWindow(
        content,
        sessionId,
        crisisContext
      )

      // 4. Create placeholder message for streaming
      const messageId = generateId()
      streamingMessageId.value = messageId
      // Don't set isStreaming here - wait for actual tokens to arrive
      // This allows ThinkingIndicator to show during the agentic thinking phase

      const assistantMessage: ChatMessage = {
        id: messageId,
        sessionId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        widgets: []
      }
      messages.value.push(assistantMessage)

      // 5. Run agentic loop
      const provider = getAnthropicProvider()
      // Start with empty array - user message is already in context from buildContextWindow
      const agenticMessages: AgenticMessage[] = []
      let iteration = 0
      let accumulatedText = ''
      let finalWidgets: WidgetCommand[] = []

      while (iteration < MAX_AGENT_ITERATIONS) {
        agentState.value.iteration = iteration + 1

        const response = await new Promise<AgenticResponse>((resolve, reject) => {
          provider.streamAgenticMessage(context, AGENT_TOOLS, agenticMessages, {
            onToken: (token) => {
              agentState.value.loopState = 'streaming'
              isStreaming.value = true  // Set streaming flag when tokens actually arrive
              accumulatedText += token
              // Update the streaming message
              const msg = messages.value.find(m => m.id === messageId)
              if (msg) {
                msg.content = accumulatedText
              }
            },
            onToolUseStart: (toolName) => {
              agentState.value.loopState = 'tool_executing'
              agentState.value.currentTool = toolName
            },
            onComplete: resolve,
            onError: reject
          })
        })

        // Accumulate widgets from each iteration (text is already accumulated via onToken)
        if (response.widgets.length > 0) {
          finalWidgets.push(...response.widgets)
        }

        // Check if we need to continue the loop (tool use)
        if (response.stopReason === 'tool_use' && response.toolUseBlocks.length > 0) {
          agentState.value.loopState = 'tool_executing'

          // Execute all tools
          const toolResults: ToolResultMessage[] = []
          for (const toolUse of response.toolUseBlocks) {
            agentState.value.currentTool = toolUse.name
            agentState.value.toolExecutions.push({
              id: toolUse.id,
              name: toolUse.name,
              input: toolUse.input,
              status: 'running'
            })

            const result = await executeAgentTool(toolUse.name, toolUse.input, toolUse.id)

            // Update execution status
            const execution = agentState.value.toolExecutions.find(e => e.id === toolUse.id)
            if (execution) {
              execution.status = result.success ? 'success' : 'error'
              execution.result = result.success ? result.data : undefined
              execution.error = result.success ? undefined : result.error
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: formatToolResultContent(result)
            })
          }

          // Build continuation messages
          const assistantAgenticMsg = provider.buildAssistantAgenticMessage(
            response.text,
            response.toolUseBlocks
          )
          const toolResultMsg = provider.buildToolResultMessage(toolResults)

          agenticMessages.push(assistantAgenticMsg, toolResultMsg)

          agentState.value.loopState = 'continuing'
          agentState.value.currentTool = null
          iteration++
        } else {
          // end_turn or max_tokens - we're done
          break
        }
      }

      // 6. Finalize the message
      const msg = messages.value.find(m => m.id === messageId)
      if (msg) {
        // Parse accumulated text to strip widget commands for clean display
        const { text: cleanText } = parseWidgetCommands(accumulatedText)
        msg.content = cleanText
        msg.widgets = finalWidgets
      }

      // Save to vault
      if (isUnlocked.value && msg) {
        await saveChatMessage(msg)
      }

      agentState.value.loopState = 'complete'
      isStreaming.value = false
      streamingMessageId.value = null

    } catch (e) {
      console.error('Chat error:', e)
      error.value = e instanceof Error ? e.message : 'Failed to get response'

      // Update message with error
      const msg = messages.value.find(m => m.id === streamingMessageId.value)
      if (msg) {
        msg.content = "I'm having trouble connecting right now. Please try again in a moment. If you're in crisis, remember you can always tap the SOS button or call 988."
      } else {
        // Add error message if we don't have a streaming message
        const errorMessage: ChatMessage = {
          id: generateId(),
          sessionId: ensureSessionId(),
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please try again in a moment. If you're in crisis, remember you can always tap the SOS button or call 988.",
          timestamp: Date.now()
        }
        messages.value.push(errorMessage)
      }

      agentState.value.loopState = 'idle'
      isStreaming.value = false
      streamingMessageId.value = null
    } finally {
      isLoading.value = false
      // Reset agent state after a short delay to allow UI to show completion
      setTimeout(() => {
        agentState.value = createInitialAgentState()
      }, 500)
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
   * Show a widget directly with a brief intro message (no AI call).
   * Used for activity card selections where we want immediate widget display.
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

    // Save to vault if unlocked
    if (isUnlocked.value) {
      saveChatMessage(assistantMessage)
    }
  }

  /**
   * Generate a personalized greeting message from the AI.
   * Called on page mount when there are no existing messages.
   * Falls back to static greeting silently on error.
   */
  const generateGreeting = async (): Promise<void> => {
    // Guard: don't generate if messages exist or already generating
    if (messages.value.length > 0 || isGeneratingGreeting.value) {
      return
    }

    isGeneratingGreeting.value = true
    error.value = null

    try {
      // Build greeting-specific context
      const context = await buildGreetingContext()

      // Create placeholder message for streaming
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

      // Stream the greeting from AI
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

          // Save to vault
          if (isUnlocked.value && msg) {
            await saveChatMessage(msg)
          }

          isStreaming.value = false
          streamingMessageId.value = null
          isGeneratingGreeting.value = false
        },
        onError: () => {
          // On error, silently fall back to static greeting by removing placeholder
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
      // Silent fallback - just stop loading, empty messages will show static greeting
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
    loadSession,
    loadTodaySession,
    startNewSession,
    addSystemMessage,
    generateGreeting
  }
}
