/**
 * Agent Types for RecoveryLM
 *
 * SDK-aligned type definitions for the agentic architecture.
 * These types follow Claude Agent SDK patterns adapted for browser use.
 */

import type { z } from 'zod'

// ============================================
// Message Types (SDK-aligned)
// ============================================

/**
 * User message in the agent system
 */
export interface UserMessage {
  type: 'user'
  content: string
  timestamp: number
}

/**
 * Assistant message with optional tool calls
 */
export interface AssistantMessage {
  type: 'assistant'
  content: string
  timestamp: number
  toolCalls?: ToolCall[]
}

/**
 * System message for context injection
 */
export interface SystemMessage {
  type: 'system'
  content: string
  timestamp: number
}

/**
 * Tool result message
 */
export interface ToolResultMessage {
  type: 'tool_result'
  toolCallId: string
  result: ToolOutput
  timestamp: number
}

/**
 * Union type for all agent messages
 */
export type AgentMessage =
  | UserMessage
  | AssistantMessage
  | SystemMessage
  | ToolResultMessage

// ============================================
// Tool System Types
// ============================================

/**
 * Tool call as requested by the model
 */
export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

/**
 * Tool output after execution
 */
export interface ToolOutput {
  success: boolean
  data?: unknown
  error?: string
}

/**
 * Tool definition with Zod schema
 */
export interface ToolDefinition<TInput extends z.ZodType = z.ZodType> {
  name: string
  description: string
  inputSchema: TInput
  execute: (input: z.infer<TInput>) => Promise<ToolOutput>
}

/**
 * Anthropic-format tool for API calls
 */
export interface AnthropicTool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

// ============================================
// Session Management Types
// ============================================

/**
 * Metadata about an agent session
 */
export interface SessionMetadata {
  id: string
  createdAt: number
  lastActiveAt: number
  messageCount: number
  forkedFrom?: string
}

/**
 * Complete session state
 */
export interface SessionState {
  metadata: SessionMetadata
  messages: AgentMessage[]
}

// ============================================
// Agent Loop State (Discriminated Union)
// ============================================

interface IdleState {
  status: 'idle'
}

interface ThinkingState {
  status: 'thinking'
  iteration: number
}

interface StreamingState {
  status: 'streaming'
  iteration: number
  accumulatedText: string
}

interface ToolExecutingState {
  status: 'tool_executing'
  iteration: number
  toolName: string
  toolCallId: string
}

interface ContinuingState {
  status: 'continuing'
  iteration: number
}

interface CompleteState {
  status: 'complete'
  totalIterations: number
}

interface ErrorState {
  status: 'error'
  error: string
}

/**
 * Discriminated union for agent loop state
 */
export type AgentLoopState =
  | IdleState
  | ThinkingState
  | StreamingState
  | ToolExecutingState
  | ContinuingState
  | CompleteState
  | ErrorState

// ============================================
// Stream Events (Async Generator Output)
// ============================================

export interface TokenEvent {
  type: 'token'
  text: string
}

export interface ToolStartEvent {
  type: 'tool_start'
  name: string
  id: string
  input: Record<string, unknown>
}

export interface ToolEndEvent {
  type: 'tool_end'
  id: string
  result: ToolOutput
}

export interface CompleteEvent {
  type: 'complete'
  message: AssistantMessage
}

export interface ErrorEvent {
  type: 'error'
  error: string
}

export interface StateChangeEvent {
  type: 'state_change'
  state: AgentLoopState
}

/**
 * Union type for all stream events
 */
export type StreamEvent =
  | TokenEvent
  | ToolStartEvent
  | ToolEndEvent
  | CompleteEvent
  | ErrorEvent
  | StateChangeEvent

// ============================================
// Agent Runner Configuration
// ============================================

export interface AgentRunnerConfig {
  maxIterations: number
  systemPrompt: string
  tools: ToolDefinition[]
  context: import('@/types').ContextWindow
  onStateChange?: (state: AgentLoopState) => void
}

// ============================================
// Tool Execution Tracking
// ============================================

export type ToolExecutionStatus = 'pending' | 'running' | 'success' | 'error'

export interface ToolExecution {
  id: string
  name: string
  input: Record<string, unknown>
  status: ToolExecutionStatus
  result?: ToolOutput
  startedAt: number
  completedAt?: number
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create initial idle state
 */
export function createIdleState(): AgentLoopState {
  return { status: 'idle' }
}

/**
 * Create a user message
 */
export function createUserMessage(content: string): UserMessage {
  return {
    type: 'user',
    content,
    timestamp: Date.now()
  }
}

/**
 * Create an assistant message
 */
export function createAssistantMessage(
  content: string,
  toolCalls?: ToolCall[]
): AssistantMessage {
  return {
    type: 'assistant',
    content,
    timestamp: Date.now(),
    toolCalls
  }
}

/**
 * Create a tool result message
 */
export function createToolResultMessage(
  toolCallId: string,
  result: ToolOutput
): ToolResultMessage {
  return {
    type: 'tool_result',
    toolCallId,
    result,
    timestamp: Date.now()
  }
}

/**
 * Type guard for checking if state indicates activity
 */
export function isActiveState(state: AgentLoopState): boolean {
  return state.status !== 'idle' && state.status !== 'complete' && state.status !== 'error'
}

/**
 * Type guard for tool executing state
 */
export function isToolExecutingState(
  state: AgentLoopState
): state is ToolExecutingState {
  return state.status === 'tool_executing'
}

/**
 * Type guard for streaming state
 */
export function isStreamingState(
  state: AgentLoopState
): state is StreamingState {
  return state.status === 'streaming'
}
