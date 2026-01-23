/**
 * Session Summarizer Service
 *
 * Analyzes previous chat sessions to extract structured summaries
 * including themes, emotional arc, widgets used, and end state.
 */

import type {
  ChatMessage,
  SessionSummary,
  EmotionalArc,
  SessionEndState,
  WidgetId,
  CrisisLevel
} from '@/types'
import { formatDate } from '@/types'
import * as vault from '@/services/vault'

// Keywords for theme detection (grouped by category)
const THEME_KEYWORDS: Record<string, string[]> = {
  'craving': ['craving', 'urge', 'want to use', 'tempted', 'temptation', 'desire'],
  'stress': ['stress', 'stressed', 'overwhelmed', 'anxious', 'anxiety', 'worried'],
  'relationships': ['family', 'friend', 'partner', 'spouse', 'relationship', 'argument', 'fight'],
  'work': ['work', 'job', 'boss', 'coworker', 'career', 'unemployed'],
  'emotions': ['sad', 'angry', 'frustrated', 'lonely', 'depressed', 'hopeless'],
  'progress': ['milestone', 'proud', 'better', 'improving', 'progress', 'achievement'],
  'relapse': ['relapse', 'slipped', 'used', 'drank', 'relapsed'],
  'sleep': ['sleep', 'insomnia', 'tired', 'exhausted', 'rest'],
  'health': ['health', 'sick', 'pain', 'doctor', 'medication'],
  'gratitude': ['grateful', 'thankful', 'gratitude', 'appreciate'],
  'trigger': ['trigger', 'triggered', 'reminded', 'memory']
}

// Keywords indicating emotional trajectory
const POSITIVE_INDICATORS = ['better', 'good', 'great', 'helped', 'thanks', 'resolved', 'feel better', 'calmer', 'relieved']
const NEGATIVE_INDICATORS = ['worse', 'bad', 'terrible', 'hopeless', 'can\'t', 'won\'t', 'give up', 'scared']
const CRISIS_LEVELS: CrisisLevel[] = ['emergency', 'urgent']

// Keywords indicating user intentions
const INTENTION_PATTERNS = [
  /i('ll| will| want to| need to| should| plan to| going to) (\w+)/gi,
  /tomorrow i('ll| will)? (\w+)/gi,
  /my goal is to/gi,
  /i'm going to try/gi
]

/**
 * Extract themes from message content using keyword matching
 */
function extractThemes(messages: ChatMessage[]): string[] {
  const userContent = messages
    .filter(m => m.role === 'user')
    .map(m => m.content.toLowerCase())
    .join(' ')

  const detectedThemes: Set<string> = new Set()

  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    for (const keyword of keywords) {
      if (userContent.includes(keyword)) {
        detectedThemes.add(theme)
        break
      }
    }
  }

  return Array.from(detectedThemes)
}

/**
 * Analyze emotional arc across the session
 * Looks at early messages vs late messages to detect trajectory
 */
function analyzeEmotionalArc(messages: ChatMessage[]): EmotionalArc {
  if (messages.length < 2) return 'unknown'

  // Check for crisis levels in messages
  const hasCrisis = messages.some(m =>
    m.crisisLevel && CRISIS_LEVELS.includes(m.crisisLevel)
  )

  if (hasCrisis) {
    // Check if crisis was resolved (later messages have lower crisis levels)
    const lastThird = messages.slice(-Math.ceil(messages.length / 3))
    const crisisResolved = lastThird.every(m =>
      !m.crisisLevel || !CRISIS_LEVELS.includes(m.crisisLevel)
    )
    return crisisResolved ? 'crisis-managed' : 'declining'
  }

  // Analyze sentiment trajectory using keyword presence
  const userMessages = messages.filter(m => m.role === 'user')
  if (userMessages.length < 2) return 'unknown'

  const midpoint = Math.floor(userMessages.length / 2)
  const firstHalf = userMessages.slice(0, midpoint).map(m => m.content.toLowerCase()).join(' ')
  const secondHalf = userMessages.slice(midpoint).map(m => m.content.toLowerCase()).join(' ')

  const earlyPositive = POSITIVE_INDICATORS.filter(w => firstHalf.includes(w)).length
  const earlyNegative = NEGATIVE_INDICATORS.filter(w => firstHalf.includes(w)).length
  const latePositive = POSITIVE_INDICATORS.filter(w => secondHalf.includes(w)).length
  const lateNegative = NEGATIVE_INDICATORS.filter(w => secondHalf.includes(w)).length

  const earlyScore = earlyPositive - earlyNegative
  const lateScore = latePositive - lateNegative

  if (lateScore > earlyScore + 1) return 'improving'
  if (lateScore < earlyScore - 1) return 'declining'
  return 'stable'
}

/**
 * Extract widgets used from assistant messages
 */
function extractWidgetsUsed(messages: ChatMessage[]): WidgetId[] {
  const widgets: Set<WidgetId> = new Set()

  for (const message of messages) {
    if (message.widgets) {
      for (const widget of message.widgets) {
        widgets.add(widget.id)
      }
    }
  }

  return Array.from(widgets)
}

/**
 * Determine how the session ended
 */
function determineEndState(messages: ChatMessage[]): SessionEndState {
  if (messages.length === 0) return 'open-ended'

  const lastUserMessages = messages
    .filter(m => m.role === 'user')
    .slice(-2)

  if (lastUserMessages.length === 0) return 'open-ended'

  const lastContent = lastUserMessages[lastUserMessages.length - 1].content.toLowerCase()

  // Check for resolution indicators
  const resolvedIndicators = ['thank', 'helped', 'better now', 'feel better', 'resolved', 'good night', 'bye']
  if (resolvedIndicators.some(w => lastContent.includes(w))) {
    return 'resolved'
  }

  // Check for unresolved indicators
  const unresolvedIndicators = ['still', 'not sure', 'don\'t know', 'confused', 'scared']
  if (unresolvedIndicators.some(w => lastContent.includes(w))) {
    return 'unresolved'
  }

  return 'open-ended'
}

/**
 * Extract user-stated intentions for follow-up
 */
function extractIntentions(messages: ChatMessage[]): string[] {
  const intentions: string[] = []

  const userContent = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join(' ')

  for (const pattern of INTENTION_PATTERNS) {
    const matches = userContent.matchAll(pattern)
    for (const match of matches) {
      if (match[0]) {
        intentions.push(match[0].trim())
      }
    }
  }

  // Limit to most relevant intentions
  return intentions.slice(0, 3)
}

/**
 * Summarize a single chat session
 */
export async function summarizeSession(sessionId: string): Promise<SessionSummary | null> {
  try {
    const messages = await vault.getChatHistory(sessionId)

    if (messages.length === 0) return null

    // Get session date from first message
    const firstMessage = messages[0]
    const sessionDate = formatDate(new Date(firstMessage.timestamp))

    return {
      sessionId,
      date: sessionDate,
      themes: extractThemes(messages),
      emotionalArc: analyzeEmotionalArc(messages),
      widgetsUsed: extractWidgetsUsed(messages),
      endState: determineEndState(messages),
      userIntentions: extractIntentions(messages),
      messageCount: messages.length
    }
  } catch (error) {
    console.error('[summarizeSession] Error:', error)
    return null
  }
}

/**
 * Get summary for the most recent previous session (not today's)
 */
export async function getPreviousSessionSummary(): Promise<SessionSummary | null> {
  try {
    const recentSessionIds = await vault.getRecentSessions(5)
    const todayStr = formatDate(new Date())

    for (const sessionId of recentSessionIds) {
      const messages = await vault.getChatHistory(sessionId)
      if (messages.length === 0) continue

      // Check if this session is from today
      const sessionDate = formatDate(new Date(messages[0].timestamp))
      if (sessionDate === todayStr) continue

      // Found a previous session, summarize it
      return await summarizeSession(sessionId)
    }

    return null
  } catch (error) {
    console.error('[getPreviousSessionSummary] Error:', error)
    return null
  }
}

/**
 * Format a session summary for inclusion in greeting context
 */
export function formatSessionSummary(summary: SessionSummary | null): string {
  if (!summary) return ''

  const parts: string[] = []

  parts.push(`Previous session: ${summary.date}`)

  if (summary.themes.length > 0) {
    parts.push(`Themes discussed: ${summary.themes.join(', ')}`)
  }

  if (summary.emotionalArc !== 'unknown') {
    const arcDescriptions: Record<EmotionalArc, string> = {
      'improving': 'Session ended on a positive note',
      'stable': 'Mood was relatively stable throughout',
      'declining': 'User was struggling at end of session',
      'crisis-managed': 'Crisis was addressed and stabilized',
      'unknown': ''
    }
    parts.push(arcDescriptions[summary.emotionalArc])
  }

  if (summary.widgetsUsed.length > 0) {
    parts.push(`Exercises completed: ${summary.widgetsUsed.join(', ')}`)
  }

  if (summary.endState === 'unresolved') {
    parts.push('Session ended with unresolved concerns - consider checking in')
  }

  if (summary.userIntentions && summary.userIntentions.length > 0) {
    parts.push(`User mentioned: ${summary.userIntentions.join('; ')}`)
  }

  return parts.join('\n')
}

/**
 * Get summaries for the most recent N previous sessions (excluding today).
 * Returns empty array on error for graceful degradation.
 */
export async function getRecentSessionSummaries(count: number = 2): Promise<SessionSummary[]> {
  try {
    // Fetch more sessions than needed to account for filtering out today
    const recentSessionIds = await vault.getRecentSessions(count + 3)
    const todayStr = formatDate(new Date())
    const summaries: SessionSummary[] = []

    for (const sessionId of recentSessionIds) {
      if (summaries.length >= count) break

      const messages = await vault.getChatHistory(sessionId)
      if (messages.length === 0) continue

      // Skip today's session
      const sessionDate = formatDate(new Date(messages[0].timestamp))
      if (sessionDate === todayStr) continue

      // Summarize the session
      const summary = await summarizeSession(sessionId)
      if (summary) {
        summaries.push(summary)
      }
    }

    return summaries
  } catch (error) {
    console.error('[getRecentSessionSummaries] Error:', error)
    return []
  }
}

/**
 * Format session summaries for compact inclusion in system prompt context.
 * One line per session for token efficiency.
 */
export function formatRecentSessionsForContext(summaries: SessionSummary[]): string {
  if (summaries.length === 0) return ''

  const lines: string[] = []

  for (const summary of summaries) {
    const parts: string[] = [summary.date]

    if (summary.themes.length > 0) {
      parts.push(`Themes: ${summary.themes.slice(0, 3).join(', ')}`)
    }

    if (summary.emotionalArc !== 'unknown') {
      parts.push(`Ended: ${summary.emotionalArc}`)
    }

    if (summary.endState === 'unresolved' && summary.userIntentions?.length) {
      parts.push(`(unresolved: ${summary.userIntentions[0]})`)
    } else if (summary.endState === 'unresolved') {
      parts.push('(unresolved concerns)')
    }

    lines.push(`- ${parts.join(' | ')}`)
  }

  return lines.join('\n')
}
