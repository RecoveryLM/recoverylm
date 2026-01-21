/**
 * Agent Runner for RecoveryLM
 *
 * SDK-aligned async generator that drives the agentic loop.
 * Yields stream events for real-time UI updates.
 */

import type { ContextWindow, WidgetCommand } from '@/types'
import type {
  StreamEvent,
  AgentLoopState,
  AssistantMessage,
  ToolCall,
  ToolOutput
} from './types'
import { createAssistantMessage } from './types'
import { executeToolByName, formatToolResult } from './tools'
import { getAnthropicProvider } from '@/services/inference'
import type { AgenticMessage, AgenticResponse } from '@/services/inference/types'
import type { ToolResultMessage as LegacyToolResultMessage } from '@/types/agent'
import { AGENT_TOOLS } from '@/services/agentTools'

// ============================================
// Runner Configuration
// ============================================

export interface AgentRunnerConfig {
  /** Maximum iterations of the agentic loop (default: 5) */
  maxIterations?: number
  /** The context window for the conversation */
  context: ContextWindow
  /** Optional callback for state changes */
  onStateChange?: (state: AgentLoopState) => void
}

// ============================================
// Internal State
// ============================================

interface RunnerState {
  iteration: number
  accumulatedText: string
  accumulatedWidgets: WidgetCommand[]
  toolCalls: ToolCall[]
  agenticMessages: AgenticMessage[]
}

// ============================================
// Runner Implementation
// ============================================

/**
 * Run the agent loop as an async generator.
 *
 * Yields StreamEvents for real-time UI updates:
 * - `token`: New text token received
 * - `tool_start`: Tool execution beginning
 * - `tool_end`: Tool execution complete
 * - `state_change`: Loop state changed
 * - `complete`: Final message ready
 * - `error`: Error occurred
 *
 * @example
 * ```ts
 * const runner = runAgent(userMessage, { context })
 *
 * for await (const event of runner) {
 *   switch (event.type) {
 *     case 'token':
 *       updateStreamingMessage(event.text)
 *       break
 *     case 'tool_start':
 *       showToolIndicator(event.name)
 *       break
 *     case 'complete':
 *       finalizeMessage(event.message)
 *       break
 *   }
 * }
 * ```
 */
export async function* runAgent(
  userMessage: string,
  config: AgentRunnerConfig
): AsyncGenerator<StreamEvent, AssistantMessage, void> {
  const { maxIterations = 5, context, onStateChange } = config

  // Initialize state
  const state: RunnerState = {
    iteration: 0,
    accumulatedText: '',
    accumulatedWidgets: [],
    toolCalls: [],
    agenticMessages: []
  }

  // Helper to emit state changes
  const emitState = (loopState: AgentLoopState): StreamEvent => {
    onStateChange?.(loopState)
    return { type: 'state_change', state: loopState }
  }

  // Get provider and tools (use legacy AGENT_TOOLS for API compatibility)
  const provider = getAnthropicProvider()
  const tools = AGENT_TOOLS

  try {
    // Initial thinking state
    yield emitState({ status: 'thinking', iteration: 1 })

    // Main agentic loop
    while (state.iteration < maxIterations) {
      state.iteration++

      // Make API call and yield tokens
      const response = await new Promise<AgenticResponse>((resolve, reject) => {
        provider.streamAgenticMessage(
          { ...context, currentMessage: userMessage },
          tools,
          state.agenticMessages,
          {
            onToken: (token) => {
              // We can't yield from inside a callback, so we accumulate
              state.accumulatedText += token
            },
            onToolUseStart: (toolName) => {
              // Tool notification handled after promise resolves
              void toolName
            },
            onComplete: resolve,
            onError: reject
          }
        )
      })

      // Yield streaming state with accumulated text
      yield emitState({
        status: 'streaming',
        iteration: state.iteration,
        accumulatedText: state.accumulatedText
      })

      // Yield all accumulated tokens as a single event
      // (We can't yield during the streaming callback, so we batch)
      if (state.accumulatedText) {
        yield { type: 'token', text: state.accumulatedText }
      }

      // Accumulate widgets
      if (response.widgets.length > 0) {
        state.accumulatedWidgets.push(...response.widgets)
      }

      // Check if we need to handle tool use
      if (response.stopReason === 'tool_use' && response.toolUseBlocks.length > 0) {
        // Execute tools
        yield emitState({
          status: 'tool_executing',
          iteration: state.iteration,
          toolName: response.toolUseBlocks[0].name,
          toolCallId: response.toolUseBlocks[0].id
        })

        const toolResults: LegacyToolResultMessage[] = []

        for (const toolUse of response.toolUseBlocks) {
          // Emit tool start
          yield {
            type: 'tool_start',
            name: toolUse.name,
            id: toolUse.id,
            input: toolUse.input
          }

          // Execute the tool
          const result = await executeToolByName(toolUse.name, toolUse.input)

          // Track tool call
          state.toolCalls.push({
            id: toolUse.id,
            name: toolUse.name,
            input: toolUse.input
          })

          // Emit tool end
          yield {
            type: 'tool_end',
            id: toolUse.id,
            result
          }

          // Build result for API
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: formatToolResult(result)
          })
        }

        // Build continuation messages
        const assistantMsg = provider.buildAssistantAgenticMessage(
          response.text,
          response.toolUseBlocks
        )
        const toolResultMsg = provider.buildToolResultMessage(toolResults)

        state.agenticMessages.push(assistantMsg, toolResultMsg)

        // Emit continuing state
        yield emitState({
          status: 'continuing',
          iteration: state.iteration
        })

        // Reset accumulated text for next iteration (keep widgets)
        state.accumulatedText = ''

        // Continue loop
        continue
      }

      // No tool use - we're done
      break
    }

    // Create final message
    const finalMessage = createAssistantMessage(
      state.accumulatedText,
      state.toolCalls.length > 0 ? state.toolCalls : undefined
    )

    // Add widgets to a metadata property (we'll handle this in the caller)
    // since AssistantMessage doesn't have widgets
    const messageWithWidgets = {
      ...finalMessage,
      _widgets: state.accumulatedWidgets
    }

    // Emit complete state
    yield emitState({
      status: 'complete',
      totalIterations: state.iteration
    })

    // Emit complete event
    yield {
      type: 'complete',
      message: messageWithWidgets as AssistantMessage
    }

    return messageWithWidgets as AssistantMessage

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Agent execution failed'

    yield emitState({
      status: 'error',
      error: errorMessage
    })

    yield {
      type: 'error',
      error: errorMessage
    }

    // Return a fallback message
    return createAssistantMessage(
      "I'm having trouble connecting right now. Please try again in a moment. If you're in crisis, remember you can always tap the SOS button or call 988."
    )
  }
}

// ============================================
// Simplified Runner (No Generator)
// ============================================

/**
 * Run the agent and collect all events into a result.
 * Use this when you don't need real-time streaming updates.
 */
export async function runAgentToCompletion(
  userMessage: string,
  config: AgentRunnerConfig
): Promise<{
  message: AssistantMessage
  events: StreamEvent[]
  widgets: WidgetCommand[]
}> {
  const events: StreamEvent[] = []
  let finalMessage: AssistantMessage | undefined
  const widgets: WidgetCommand[] = []

  for await (const event of runAgent(userMessage, config)) {
    events.push(event)

    if (event.type === 'complete') {
      finalMessage = event.message
      // Extract widgets from the internal property
      const msgWithWidgets = event.message as AssistantMessage & { _widgets?: WidgetCommand[] }
      if (msgWithWidgets._widgets) {
        widgets.push(...msgWithWidgets._widgets)
      }
    }
  }

  if (!finalMessage) {
    finalMessage = createAssistantMessage('No response generated')
  }

  return { message: finalMessage, events, widgets }
}

// ============================================
// Event Helpers
// ============================================

/**
 * Check if an event indicates streaming text
 */
export function isTokenEvent(event: StreamEvent): event is { type: 'token'; text: string } {
  return event.type === 'token'
}

/**
 * Check if an event indicates tool activity
 */
export function isToolEvent(event: StreamEvent): boolean {
  return event.type === 'tool_start' || event.type === 'tool_end'
}

/**
 * Check if an event indicates completion
 */
export function isCompleteEvent(event: StreamEvent): event is { type: 'complete'; message: AssistantMessage } {
  return event.type === 'complete'
}

/**
 * Check if an event indicates an error
 */
export function isErrorEvent(event: StreamEvent): event is { type: 'error'; error: string } {
  return event.type === 'error'
}

/**
 * Extract tool outputs from a sequence of events
 */
export function extractToolOutputs(events: StreamEvent[]): Map<string, ToolOutput> {
  const outputs = new Map<string, ToolOutput>()

  for (const event of events) {
    if (event.type === 'tool_end') {
      outputs.set(event.id, event.result)
    }
  }

  return outputs
}
