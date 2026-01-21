/**
 * Agent Types for RecoveryLM
 *
 * Type definitions for the agentic loop that allows Remi to
 * autonomously search conversations, check metrics, and query journal entries.
 */

// ============================================
// Agent Loop State
// ============================================

export type AgentLoopState =
  | 'idle'           // No agentic operation in progress
  | 'thinking'       // Initial API call, before streaming starts
  | 'tool_executing' // Executing a tool locally
  | 'continuing'     // Sending tool result back to API
  | 'streaming'      // Streaming text response
  | 'complete'       // Loop finished

// ============================================
// Tool Execution
// ============================================

export type ToolExecutionStatus = 'pending' | 'running' | 'success' | 'error'

export interface ToolExecution {
  id: string                    // Tool use ID from API
  name: string                  // Tool name (e.g., 'search_conversations')
  input: Record<string, unknown> // Tool input parameters
  status: ToolExecutionStatus
  result?: unknown              // Tool result after execution
  error?: string                // Error message if failed
}

// ============================================
// Agent State
// ============================================

export interface AgentState {
  loopState: AgentLoopState
  iteration: number             // Current iteration (max 5)
  currentTool: string | null    // Name of tool currently being executed
  toolExecutions: ToolExecution[] // History of tool executions in this loop
}

export function createInitialAgentState(): AgentState {
  return {
    loopState: 'idle',
    iteration: 0,
    currentTool: null,
    toolExecutions: []
  }
}

// ============================================
// Tool Definitions (Anthropic Format)
// ============================================

export interface ToolInputSchema {
  type: 'object'
  properties: Record<string, {
    type: string
    description: string
    items?: { type: string }
    enum?: string[]
  }>
  required?: string[]
}

export interface AgentTool {
  name: string
  description: string
  input_schema: ToolInputSchema
}

// ============================================
// Tool Input Types
// ============================================

export interface SearchConversationsInput {
  keyword?: string
  after_date?: string   // YYYY-MM-DD
  before_date?: string  // YYYY-MM-DD
  limit?: number        // Max sessions (default: 5)
}

export interface GetMetricsInput {
  after_date?: string   // YYYY-MM-DD
  before_date?: string  // YYYY-MM-DD
  limit?: number        // Max days (default: 14)
  analyze_trends?: boolean
}

export interface SearchJournalInput {
  tags?: string[]       // Filter tags: craving, trigger, victory, etc.
  after_timestamp?: number // Unix timestamp filter
  limit?: number        // Max entries (default: 10)
}

// ============================================
// Tool Result Types
// ============================================

export interface ConversationSearchResult {
  sessionId: string
  date: string
  messageCount: number
  preview: string       // First ~100 chars of relevant messages
  matchingMessages: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: number
    widgets?: string[]  // Widget IDs if message contains widgets
  }>
}

export interface MetricsResult {
  metrics: Array<{
    date: string
    moodScore: number
    sobrietyMaintained: boolean
    exercise: boolean
    meditation: boolean
    cravingIntensity?: number
    notes?: string
  }>
  trends?: {
    avgMood: number
    moodTrend: 'improving' | 'stable' | 'declining'
    sobrietyStreak: number
    exerciseDays: number
    meditationDays: number
    cravingFrequency: number
  }
}

export interface JournalSearchResult {
  entries: Array<{
    id: string
    timestamp: number
    content: string
    tags: string[]
    sentiment?: string
  }>
}

export type ToolResult =
  | { success: true; data: ConversationSearchResult[] | MetricsResult | JournalSearchResult }
  | { success: false; error: string }

// ============================================
// Agentic Streaming Types
// ============================================

export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface TextBlock {
  type: 'text'
  text: string
}

export type ContentBlock = ToolUseBlock | TextBlock

export interface AgenticStreamResult {
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence'
  content: ContentBlock[]
  usage: {
    inputTokens: number
    outputTokens: number
  }
}

export interface ToolResultMessage {
  type: 'tool_result'
  tool_use_id: string
  content: string
}
