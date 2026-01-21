import type { ContextWindow, WidgetCommand } from '@/types'
import type { ToolUseBlock, ToolResultMessage } from '@/types/agent'

export interface InferenceResponse {
  text: string
  widgets: WidgetCommand[]
  metadata: {
    tokensUsed: number
    latencyMs: number
    model: string
  }
}

export interface StreamCallbacks {
  onToken: (token: string) => void
  onComplete: (response: InferenceResponse) => void
  onError: (error: Error) => void
}

export interface InferenceProvider {
  name: string
  sendMessage(context: ContextWindow): Promise<InferenceResponse>
  streamMessage(context: ContextWindow, callbacks: StreamCallbacks): Promise<void>
  checkHealth(): Promise<boolean>
}

// ============================================
// Agentic Streaming Types
// ============================================

export interface AgenticResponse extends InferenceResponse {
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence'
  toolUseBlocks: ToolUseBlock[]
}

export interface AgenticStreamCallbacks {
  onToken: (token: string) => void
  onToolUseStart?: (toolName: string) => void
  onComplete: (response: AgenticResponse) => void
  onError: (error: Error) => void
}

/**
 * Message format for agentic turns that can include tool use and tool results.
 * User messages can have string content, text blocks (for continuation format), or tool results.
 * Assistant messages have text blocks and/or tool use blocks.
 */
export type AgenticMessage =
  | { role: 'user'; content: string | ToolResultMessage[] | Array<{ type: 'text'; text: string }> }
  | { role: 'assistant'; content: Array<{ type: 'text'; text: string } | ToolUseBlock> }
