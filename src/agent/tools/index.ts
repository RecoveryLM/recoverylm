/**
 * Tool Registry for RecoveryLM Agent
 *
 * Central registry for all available tools.
 * Provides lookup, execution, and conversion utilities.
 */

import type { ToolDefinition, ToolOutput, AnthropicTool } from '../types'
import { toAnthropicTool, formatToolResult } from './helpers'
import { searchConversationsTool } from './searchConversations'
import { getMetricsTool } from './getMetrics'
import { searchJournalTool } from './searchJournal'

// ============================================
// Tool Registry
// ============================================

/**
 * All available tools in the agent system
 */
export const TOOLS: ToolDefinition[] = [
  searchConversationsTool,
  getMetricsTool,
  searchJournalTool
]

/**
 * Map of tool names to their definitions for quick lookup
 */
const toolMap = new Map<string, ToolDefinition>(
  TOOLS.map(t => [t.name, t])
)

// ============================================
// Tool Execution
// ============================================

/**
 * Execute a tool by name with the given input
 */
export async function executeToolByName(
  name: string,
  input: Record<string, unknown>
): Promise<ToolOutput> {
  const tool = toolMap.get(name)
  if (!tool) {
    return {
      success: false,
      error: `Unknown tool: ${name}`
    }
  }

  try {
    return await tool.execute(input)
  } catch (error) {
    console.error(`Tool execution error (${name}):`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed'
    }
  }
}

/**
 * Get a tool definition by name
 */
export function getToolByName(name: string): ToolDefinition | undefined {
  return toolMap.get(name)
}

// ============================================
// Anthropic API Conversion
// ============================================

/**
 * Get all tools in Anthropic API format
 */
export function getAnthropicTools(): AnthropicTool[] {
  return TOOLS.map(toAnthropicTool)
}

/**
 * Convert a single tool to Anthropic format
 */
export { toAnthropicTool, formatToolResult }

// ============================================
// Tool Exports
// ============================================

export { searchConversationsTool } from './searchConversations'
export { getMetricsTool } from './getMetrics'
export { searchJournalTool } from './searchJournal'
export * from './helpers'
