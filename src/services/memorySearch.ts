/**
 * Memory Search Service
 *
 * Finds relevant past content (journal entries + chat messages) based on
 * the current message using keyword extraction + theme matching.
 */

import type { MemoryItem, JournalEntry, ChatMessage } from '@/types'
import { formatDate } from '@/types'
import * as vault from '@/services/vault'

// ============================================
// Constants
// ============================================

const MAX_MEMORY_TOKENS = 2400
const TOKENS_PER_ENTRY = 150
const MAX_ENTRIES = Math.floor(MAX_MEMORY_TOKENS / TOKENS_PER_ENTRY)
const CHAR_LIMIT_PER_ENTRY = TOKENS_PER_ENTRY * 4 // ~4 chars per token
const JOURNAL_LOOKBACK_DAYS = 60
const MAX_PAST_SESSIONS = 5

// Theme keywords — shared pattern with sessionSummarizer
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

// Stop words to exclude from keyword extraction
const STOP_WORDS = new Set([
  // Standard English
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'you', 'your', 'yours',
  'he', 'him', 'his', 'she', 'her', 'hers', 'it', 'its', 'they', 'them',
  'their', 'theirs', 'what', 'which', 'who', 'whom', 'this', 'that', 'these',
  'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
  'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the',
  'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at',
  'by', 'for', 'with', 'about', 'against', 'between', 'through', 'during',
  'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in',
  'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
  'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will',
  'should', 'would', 'could', 'shall', 'may', 'might', 'must',
  // Domain noise
  'just', 'really', 'feel', 'feeling', 'think', 'thinking', 'know',
  'want', 'need', 'going', 'got', 'get', 'getting', 'much', 'thing',
  'things', 'way', 'make', 'say', 'said', 'tell', 'told', 'take',
  'come', 'came', 'see', 'look', 'time', 'day', 'today', 'right',
  'well', 'also', 'back', 'still', 'even', 'like', 'yeah', 'okay',
  'ok', 'yes', 'no', 'maybe', 'something', 'anything', 'everything',
  'nothing', 'someone', 'anyone', 'everyone', 'lot', 'bit', 'kind',
  'sort', 'pretty', 'quite', 'around', 'always', 'never', 'sometimes',
  'already', 'since', 'now', 'keep', 'kept', 'trying', 'try',
  'help', 'helped', 'helping', 'remi', 'hey', 'hi', 'hello',
  'thanks', 'thank', 'please'
])

// ============================================
// Keyword Extraction
// ============================================

/**
 * Extract meaningful keywords from a message by stripping stop words
 * and keeping tokens with 3+ characters.
 */
export function extractKeywords(message: string): string[] {
  const words = message
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w))

  return [...new Set(words)]
}

/**
 * Detect themes in a message using the THEME_KEYWORDS dictionary.
 */
export function detectThemes(message: string): string[] {
  const lower = message.toLowerCase()
  const themes: string[] = []

  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        themes.push(theme)
        break
      }
    }
  }

  return themes
}

// ============================================
// Scoring
// ============================================

/**
 * Score content against extracted keywords and themes.
 */
function scoreContent(
  content: string,
  keywords: string[],
  themes: string[]
): number {
  const lower = content.toLowerCase()
  let score = 0

  for (const keyword of keywords) {
    if (lower.includes(keyword)) {
      score += 1
    }
  }

  for (const theme of themes) {
    const themeWords = THEME_KEYWORDS[theme]
    if (themeWords) {
      for (const word of themeWords) {
        if (lower.includes(word)) {
          score += 0.5
          break
        }
      }
    }
  }

  return score
}

/**
 * Truncate content to fit within the per-entry character limit.
 */
function truncateContent(content: string): string {
  if (content.length <= CHAR_LIMIT_PER_ENTRY) return content

  const truncated = content.slice(0, CHAR_LIMIT_PER_ENTRY)
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? ')
  )

  if (lastSentenceEnd > CHAR_LIMIT_PER_ENTRY * 0.5) {
    return truncated.slice(0, lastSentenceEnd + 1)
  }

  return truncated + '...'
}

// ============================================
// Data Fetching
// ============================================

async function fetchRecentJournalEntries(): Promise<JournalEntry[]> {
  try {
    const cutoff = Date.now() - (JOURNAL_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    return await vault.getJournalEntries({ after: cutoff })
  } catch (error) {
    console.error('[memorySearch] Failed to fetch journal entries:', error)
    return []
  }
}

async function fetchPastChatMessages(currentSessionId: string): Promise<{
  messages: ChatMessage[]
  sessionThemes: Map<string, string[]>
}> {
  try {
    const sessionIds = await vault.getRecentSessions(MAX_PAST_SESSIONS + 1)
    const pastSessionIds = sessionIds.filter(id => id !== currentSessionId).slice(0, MAX_PAST_SESSIONS)

    const allMessages: ChatMessage[] = []
    const sessionThemes = new Map<string, string[]>()

    for (const sessionId of pastSessionIds) {
      const history = await vault.getChatHistory(sessionId)
      const userMessages = history.filter(m => m.role === 'user')
      allMessages.push(...userMessages)

      const sessionContent = userMessages.map(m => m.content).join(' ')
      sessionThemes.set(sessionId, detectThemes(sessionContent))
    }

    return { messages: allMessages, sessionThemes }
  } catch (error) {
    console.error('[memorySearch] Failed to fetch past chat messages:', error)
    return { messages: [], sessionThemes: new Map() }
  }
}

// ============================================
// Main Search
// ============================================

/**
 * Search for relevant history based on the current message.
 * Combines keyword extraction and theme matching to find and rank
 * past journal entries and chat messages.
 */
export async function searchRelevantHistory(
  currentMessage: string,
  currentSessionId: string
): Promise<MemoryItem[]> {
  const keywords = extractKeywords(currentMessage)
  const themes = detectThemes(currentMessage)

  if (keywords.length === 0 && themes.length === 0) {
    return []
  }

  const [journalEntries, { messages: chatMessages, sessionThemes }] = await Promise.all([
    fetchRecentJournalEntries(),
    fetchPastChatMessages(currentSessionId)
  ])

  const candidates: MemoryItem[] = []

  for (const entry of journalEntries) {
    if (!entry.content || entry.entryType !== 'user') continue

    const score = scoreContent(entry.content, keywords, themes)
    if (score > 0) {
      candidates.push({
        source: 'journal',
        date: formatDate(new Date(entry.timestamp)),
        content: truncateContent(entry.content),
        relevanceScore: score,
        tags: entry.tags.length > 0 ? entry.tags : undefined
      })
    }
  }

  for (const msg of chatMessages) {
    if (!msg.content) continue

    const score = scoreContent(msg.content, keywords, themes)
    if (score > 0) {
      const msgThemes = sessionThemes.get(msg.sessionId)
      candidates.push({
        source: 'chat',
        date: formatDate(new Date(msg.timestamp)),
        content: truncateContent(msg.content),
        relevanceScore: score,
        sessionThemes: msgThemes && msgThemes.length > 0 ? msgThemes : undefined
      })
    }
  }

  candidates.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore
    }
    return b.date.localeCompare(a.date)
  })

  const seen = new Set<string>()
  const deduplicated = candidates.filter(item => {
    const prefix = item.content.slice(0, 80).toLowerCase()
    if (seen.has(prefix)) return false
    seen.add(prefix)
    return true
  })

  return deduplicated.slice(0, MAX_ENTRIES)
}
