/**
 * Search Conversations Tool
 *
 * Searches past chat conversations by keyword or date range.
 * Includes finding previous discussions, widget/exercise completions,
 * and any historical context.
 */

import { z } from 'zod'
import { tool, success, failure } from './helpers'
import * as vault from '@/services/vault'
import type { ChatMessage } from '@/types'

// ============================================
// Widget Search Terms Mapping
// ============================================

/**
 * Maps widget IDs to searchable terms so natural language queries
 * like "Dichotomy of Control" can find W_STOIC completions.
 */
const WIDGET_SEARCH_TERMS: Record<string, string[]> = {
  'W_DENTS': ['dents', 'urge', 'craving', 'delay', 'escape'],
  'W_TAPE': ['tape', 'play the tape', 'consequences'],
  'W_STOIC': ['stoic', 'dichotomy', 'control'],
  'W_EVIDENCE': ['evidence', 'cbt', 'thought', 'distortion'],
  'W_URGESURF': ['urge surf', 'urgesurf', 'meditation', 'riding', 'surfing'],
  'W_CHECKIN': ['check-in', 'checkin', 'daily'],
  'W_COMMITMENT': ['commitment', 'statement'],
  'W_NETWORK': ['network', 'support', 'contacts']
}

/**
 * Check if a keyword matches any widget (by ID or search terms)
 */
function keywordMatchesWidget(keyword: string, widgetId: string): boolean {
  const lowerKeyword = keyword.toLowerCase()
  const lowerWidgetId = widgetId.toLowerCase()

  // Direct widget ID match
  if (lowerWidgetId.includes(lowerKeyword)) return true

  // Check search terms for this widget
  const terms = WIDGET_SEARCH_TERMS[widgetId]
  if (terms) {
    return terms.some(term => term.includes(lowerKeyword) || lowerKeyword.includes(term))
  }

  return false
}

// ============================================
// Input Schema
// ============================================

export const searchConversationsSchema = z.object({
  keyword: z
    .string()
    .optional()
    .describe('Text to search for in conversation messages. Searches both user and assistant messages.'),
  after_date: z
    .string()
    .optional()
    .describe('Start date for search range in YYYY-MM-DD format. Only returns sessions on or after this date.'),
  before_date: z
    .string()
    .optional()
    .describe('End date for search range in YYYY-MM-DD format. Only returns sessions on or before this date.'),
  limit: z
    .number()
    .optional()
    .default(5)
    .describe('Maximum number of sessions to return. Defaults to 5.')
})

export type SearchConversationsInput = z.infer<typeof searchConversationsSchema>

// ============================================
// Result Types
// ============================================

export interface ConversationSearchResult {
  sessionId: string
  date: string
  messageCount: number
  preview: string
  matchingMessages: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: number
    widgets?: string[]
  }>
}

// ============================================
// Tool Definition
// ============================================

export const searchConversationsTool = tool({
  name: 'search_conversations',
  description: `Search past chat conversations by keyword or date range. This includes finding previous discussions, widget/exercise completions (DENTS, Play the Tape, Evidence Examination, Dichotomy of Control, Urge Surfing, etc.), and any historical context. Widget completions are stored as messages describing what the user did. Use this whenever the user asks about past exercises, techniques they've tried, or previous conversations.`,
  inputSchema: searchConversationsSchema,
  execute: async (input) => {
    try {
      const { keyword, after_date, before_date, limit = 5 } = input

      // Get recent sessions
      const sessionIds = await vault.getRecentSessions(20)
      const results: ConversationSearchResult[] = []

      for (const sessionId of sessionIds) {
        if (results.length >= limit) break

        // Extract date from session ID (format: session_{timestamp}_{random})
        const match = sessionId.match(/^session_(\d+)_/)
        if (!match) continue

        const sessionTimestamp = parseInt(match[1], 10)
        const sessionDate = new Date(sessionTimestamp).toISOString().split('T')[0]

        // Apply date filters
        if (after_date && sessionDate < after_date) continue
        if (before_date && sessionDate > before_date) continue

        // Get messages for this session
        const messages = await vault.getChatHistory(sessionId)
        if (messages.length === 0) continue

        // Filter by keyword if provided (searches content AND widget IDs/terms)
        let matchingMessages: ChatMessage[] = messages
        if (keyword) {
          const lowerKeyword = keyword.toLowerCase()
          matchingMessages = messages.filter(m =>
            m.content.toLowerCase().includes(lowerKeyword) ||
            m.widgets?.some(w => keywordMatchesWidget(keyword, w.id))
          )
          if (matchingMessages.length === 0) continue
        }

        // Build preview from first user message
        const firstUserMsg = messages.find(m => m.role === 'user')
        const preview = firstUserMsg
          ? firstUserMsg.content.substring(0, 100) + (firstUserMsg.content.length > 100 ? '...' : '')
          : ''

        results.push({
          sessionId,
          date: sessionDate,
          messageCount: messages.length,
          preview,
          matchingMessages: matchingMessages.slice(0, 5).map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content.substring(0, 300) + (m.content.length > 300 ? '...' : ''),
            timestamp: m.timestamp,
            widgets: m.widgets?.map(w => w.id)
          }))
        })
      }

      return success(results)
    } catch (error) {
      console.error('searchConversations error:', error)
      return failure(error instanceof Error ? error.message : 'Search failed')
    }
  }
})
