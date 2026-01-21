/**
 * Message Format Converters for RecoveryLM Agent
 *
 * Handles conversion between agent message format and legacy ChatMessage format.
 * Provides backward compatibility with existing vault storage.
 */

import type { ChatMessage, WidgetCommand } from '@/types'
import { generateId } from '@/types'
import type { AgentMessage, UserMessage, AssistantMessage, SystemMessage } from './types'

// ============================================
// Legacy → Agent Format
// ============================================

/**
 * Convert a legacy ChatMessage to an AgentMessage
 */
export function fromChatMessage(msg: ChatMessage): AgentMessage | null {
  switch (msg.role) {
    case 'user':
      return {
        type: 'user',
        content: msg.content,
        timestamp: msg.timestamp
      } as UserMessage

    case 'assistant':
      return {
        type: 'assistant',
        content: msg.content,
        timestamp: msg.timestamp,
        // Note: We don't have toolCalls in the legacy format stored in vault
        // because we only store the final result, not intermediate tool calls
        toolCalls: undefined
      } as AssistantMessage

    case 'system':
      return {
        type: 'system',
        content: msg.content,
        timestamp: msg.timestamp
      } as SystemMessage

    default:
      console.warn('Unknown message role:', msg.role)
      return null
  }
}

/**
 * Convert multiple ChatMessages to AgentMessages
 */
export function fromChatHistory(messages: ChatMessage[]): AgentMessage[] {
  return messages
    .map(fromChatMessage)
    .filter((m): m is AgentMessage => m !== null)
}

// ============================================
// Agent → Legacy Format
// ============================================

/**
 * Convert an AgentMessage to a ChatMessage for vault storage
 */
export function toChatMessage(
  msg: AgentMessage,
  sessionId: string,
  options?: {
    widgets?: WidgetCommand[]
    crisisLevel?: ChatMessage['crisisLevel']
  }
): ChatMessage | null {
  const base = {
    id: generateId(),
    sessionId,
    timestamp: msg.timestamp
  }

  switch (msg.type) {
    case 'user':
      return {
        ...base,
        role: 'user',
        content: msg.content,
        crisisLevel: options?.crisisLevel
      }

    case 'assistant':
      return {
        ...base,
        role: 'assistant',
        content: msg.content,
        widgets: options?.widgets
      }

    case 'system':
      return {
        ...base,
        role: 'system',
        content: msg.content
      }

    case 'tool_result':
      // Tool results are not stored directly in the vault
      // They're part of the agentic loop but don't persist
      return null

    default:
      return null
  }
}

/**
 * Create a ChatMessage directly for vault storage
 * (Convenience function when you don't need AgentMessage)
 */
export function createChatMessage(
  role: 'user' | 'assistant' | 'system',
  content: string,
  sessionId: string,
  options?: {
    widgets?: WidgetCommand[]
    crisisLevel?: ChatMessage['crisisLevel']
  }
): ChatMessage {
  return {
    id: generateId(),
    sessionId,
    role,
    content,
    timestamp: Date.now(),
    widgets: options?.widgets,
    crisisLevel: options?.crisisLevel
  }
}

// ============================================
// Anthropic API Format Converters
// ============================================

/**
 * Content block types for Anthropic messages
 */
export interface TextBlock {
  type: 'text'
  text: string
}

export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock

/**
 * Anthropic API message format
 */
export type AnthropicMessage =
  | { role: 'user'; content: string | ToolResultBlock[] | TextBlock[] }
  | { role: 'assistant'; content: Array<TextBlock | ToolUseBlock> }

/**
 * Build an Anthropic assistant message with tool use blocks
 */
export function buildAssistantAnthropicMessage(
  text: string,
  toolUseBlocks: ToolUseBlock[]
): AnthropicMessage {
  const content: Array<TextBlock | ToolUseBlock> = []

  if (text) {
    content.push({ type: 'text', text })
  }

  content.push(...toolUseBlocks)

  return { role: 'assistant', content }
}

/**
 * Build an Anthropic user message with tool results
 */
export function buildToolResultAnthropicMessage(
  toolResults: Array<{ tool_use_id: string; content: string }>
): AnthropicMessage {
  return {
    role: 'user',
    content: toolResults.map(r => ({
      type: 'tool_result' as const,
      tool_use_id: r.tool_use_id,
      content: r.content
    }))
  }
}

/**
 * Convert agent messages to Anthropic API format for context window
 */
export function toAnthropicMessages(messages: AgentMessage[]): AnthropicMessage[] {
  return messages
    .filter(m => m.type !== 'tool_result') // Tool results handled specially
    .map(m => {
      if (m.type === 'user' || m.type === 'system') {
        return { role: 'user' as const, content: m.content }
      }
      if (m.type === 'assistant') {
        return {
          role: 'assistant' as const,
          content: [{ type: 'text' as const, text: m.content }]
        }
      }
      // Should never reach here due to filter
      return { role: 'user' as const, content: '' }
    })
}
