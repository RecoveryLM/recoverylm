/**
 * RecoveryLM Agent Layer
 *
 * SDK-aligned agent architecture for the Remi chat system.
 * This module provides a clean, type-safe interface for the agentic loop.
 *
 * @example
 * ```ts
 * import { runAgent, sessionManager } from '@/agent'
 *
 * // Resume or create a session
 * const session = await sessionManager.getTodaySession()
 *   ?? sessionManager.create()
 *
 * // Run the agent
 * for await (const event of runAgent(userMessage, { context })) {
 *   switch (event.type) {
 *     case 'token':
 *       updateUI(event.text)
 *       break
 *     case 'complete':
 *       saveMessage(event.message)
 *       break
 *   }
 * }
 * ```
 */

// ============================================
// Types
// ============================================

export type {
  // Message types
  UserMessage,
  AssistantMessage,
  SystemMessage,
  ToolResultMessage,
  AgentMessage,

  // Tool types
  ToolCall,
  ToolOutput,
  ToolDefinition,
  AnthropicTool,

  // Session types
  SessionMetadata,
  SessionState,

  // State types
  AgentLoopState,
  ToolExecutionStatus,
  ToolExecution,

  // Event types
  StreamEvent,
  TokenEvent,
  ToolStartEvent,
  ToolEndEvent,
  CompleteEvent,
  ErrorEvent,
  StateChangeEvent,

  // Config types
  AgentRunnerConfig
} from './types'

// ============================================
// Type Helpers
// ============================================

export {
  createIdleState,
  createUserMessage,
  createAssistantMessage,
  createToolResultMessage,
  isActiveState,
  isToolExecutingState,
  isStreamingState
} from './types'

// ============================================
// Runner
// ============================================

export {
  runAgent,
  runAgentToCompletion,
  isTokenEvent,
  isToolEvent,
  isCompleteEvent,
  isErrorEvent,
  extractToolOutputs
} from './runner'

export type { AgentRunnerConfig as RunnerConfig } from './runner'

// ============================================
// Session Management
// ============================================

export {
  sessionManager,
  createSessionManager,
  canManageSessions
} from './session'

export type { SessionManager } from './session'

// ============================================
// Message Converters
// ============================================

export {
  fromChatMessage,
  fromChatHistory,
  toChatMessage,
  createChatMessage,
  buildAssistantAnthropicMessage,
  buildToolResultAnthropicMessage,
  toAnthropicMessages
} from './messages'

export type {
  TextBlock,
  ToolUseBlock,
  ToolResultBlock,
  ContentBlock,
  AnthropicMessage
} from './messages'

// ============================================
// Tools
// ============================================

export {
  TOOLS,
  executeToolByName,
  getToolByName,
  getAnthropicTools,
  toAnthropicTool,
  formatToolResult,

  // Individual tools
  searchConversationsTool,
  getMetricsTool,
  searchJournalTool,

  // Helper functions
  tool,
  success,
  failure
} from './tools'
