/**
 * Agent Tools Service for RecoveryLM
 *
 * Defines the tools available to Remi for searching conversations,
 * retrieving metrics, and querying journal entries.
 * All tool execution happens client-side using the vault service.
 */

import type {
  AgentTool,
  SearchConversationsInput,
  GetMetricsInput,
  SearchJournalInput,
  ConversationSearchResult,
  MetricsResult,
  JournalSearchResult,
  ToolResult
} from '@/types/agent'
import type { ChatMessage, DailyMetric, JournalEntry, JournalTag } from '@/types'
import * as vault from './vault'

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
// Tool Definitions (Anthropic Format)
// ============================================

export const AGENT_TOOLS: AgentTool[] = [
  {
    name: 'search_conversations',
    description: 'Search past chat conversations by keyword or date range. This includes finding previous discussions, widget/exercise completions (DENTS, Play the Tape, Evidence Examination, Dichotomy of Control, Urge Surfing, etc.), and any historical context. Widget completions are stored as messages describing what the user did. Use this whenever the user asks about past exercises, techniques they\'ve tried, or previous conversations.',
    input_schema: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: 'Text to search for in conversation messages. Searches both user and assistant messages.'
        },
        after_date: {
          type: 'string',
          description: 'Start date for search range in YYYY-MM-DD format. Only returns sessions on or after this date.'
        },
        before_date: {
          type: 'string',
          description: 'End date for search range in YYYY-MM-DD format. Only returns sessions on or before this date.'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of sessions to return. Defaults to 5.'
        }
      },
      required: []
    }
  },
  {
    name: 'get_metrics',
    description: 'Retrieve daily metrics and habit tracking data. Use this to check mood trends, sobriety streaks, exercise habits, meditation practice, and other tracked metrics over time.',
    input_schema: {
      type: 'object',
      properties: {
        after_date: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format. Only returns metrics on or after this date.'
        },
        before_date: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format. Only returns metrics on or before this date.'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of days to return. Defaults to 14.'
        },
        analyze_trends: {
          type: 'boolean',
          description: 'If true, includes trend analysis (average mood, sobriety streak, exercise frequency, etc.). Defaults to false.'
        }
      },
      required: []
    }
  },
  {
    name: 'search_journal',
    description: 'Search journal entries by tags. Use this to find entries about cravings, triggers, victories, gratitude, or other tagged content.',
    input_schema: {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          description: 'Filter by tags. Available tags: craving, rationalization, trigger, gratitude, relapse, victory, therapy-prep, urge-surfed, distortion-caught.',
          items: { type: 'string' }
        },
        after_timestamp: {
          type: 'number',
          description: 'Unix timestamp in milliseconds. Only returns entries after this time.'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of entries to return. Defaults to 10.'
        }
      },
      required: []
    }
  }
]

// ============================================
// Tool Execution
// ============================================

/**
 * Execute an agent tool by name and return the result
 */
export async function executeAgentTool(
  name: string,
  input: Record<string, unknown>,
  _toolUseId: string
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'search_conversations':
        return await searchConversations(input as SearchConversationsInput)
      case 'get_metrics':
        return await getMetricsData(input as GetMetricsInput)
      case 'search_journal':
        return await searchJournal(input as SearchJournalInput)
      default:
        return { success: false, error: `Unknown tool: ${name}` }
    }
  } catch (error) {
    console.error(`Tool execution error (${name}):`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed'
    }
  }
}

// ============================================
// Tool Implementations
// ============================================

/**
 * Search past conversations by keyword or date range
 */
async function searchConversations(
  input: SearchConversationsInput
): Promise<ToolResult> {
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

  return {
    success: true,
    data: results
  }
}

/**
 * Retrieve daily metrics with optional trend analysis
 */
async function getMetricsData(input: GetMetricsInput): Promise<ToolResult> {
  const { after_date, before_date, limit = 14, analyze_trends = false } = input

  const metrics = await vault.getMetrics({
    after: after_date,
    before: before_date,
    limit
  })

  const result: MetricsResult = {
    metrics: metrics.map(m => ({
      date: m.date,
      moodScore: m.moodScore,
      sobrietyMaintained: m.sobrietyMaintained,
      exercise: m.exercise,
      meditation: m.meditation,
      cravingIntensity: m.cravingIntensity,
      notes: m.notes
    }))
  }

  if (analyze_trends && metrics.length > 0) {
    result.trends = calculateTrends(metrics)
  }

  return { success: true, data: result }
}

/**
 * Calculate trend analysis from metrics
 */
function calculateTrends(metrics: DailyMetric[]): MetricsResult['trends'] {
  const avgMood = metrics.reduce((sum, m) => sum + m.moodScore, 0) / metrics.length

  // Calculate mood trend (compare first half to second half)
  const midpoint = Math.floor(metrics.length / 2)
  const firstHalf = metrics.slice(midpoint) // Older (metrics are sorted newest first)
  const secondHalf = metrics.slice(0, midpoint) // Newer

  const firstHalfAvg = firstHalf.length > 0
    ? firstHalf.reduce((sum, m) => sum + m.moodScore, 0) / firstHalf.length
    : avgMood
  const secondHalfAvg = secondHalf.length > 0
    ? secondHalf.reduce((sum, m) => sum + m.moodScore, 0) / secondHalf.length
    : avgMood

  let moodTrend: 'improving' | 'stable' | 'declining' = 'stable'
  const diff = secondHalfAvg - firstHalfAvg
  if (diff > 0.5) moodTrend = 'improving'
  else if (diff < -0.5) moodTrend = 'declining'

  // Calculate sobriety streak (consecutive days maintained)
  let sobrietyStreak = 0
  for (const m of metrics) {
    if (m.sobrietyMaintained) sobrietyStreak++
    else break
  }

  // Count habit days
  const exerciseDays = metrics.filter(m => m.exercise).length
  const meditationDays = metrics.filter(m => m.meditation).length

  // Count craving incidents
  const cravingFrequency = metrics.filter(m =>
    m.cravingIntensity !== undefined && m.cravingIntensity > 3
  ).length

  return {
    avgMood: Math.round(avgMood * 10) / 10,
    moodTrend,
    sobrietyStreak,
    exerciseDays,
    meditationDays,
    cravingFrequency
  }
}

/**
 * Search journal entries by tags
 */
async function searchJournal(input: SearchJournalInput): Promise<ToolResult> {
  const { tags, after_timestamp, limit = 10 } = input

  const entries = await vault.getJournalEntries({
    tags: tags as JournalTag[] | undefined,
    after: after_timestamp,
    limit
  })

  const result: JournalSearchResult = {
    entries: entries.map((e: JournalEntry) => ({
      id: e.id,
      timestamp: e.timestamp,
      content: e.content.substring(0, 500) + (e.content.length > 500 ? '...' : ''),
      tags: e.tags,
      sentiment: e.sentiment
    }))
  }

  return { success: true, data: result }
}

/**
 * Format tool result for sending back to the API as tool_result message content
 */
export function formatToolResultContent(result: ToolResult): string {
  if (!result.success) {
    return `Error: ${result.error}`
  }
  return JSON.stringify(result.data, null, 2)
}
