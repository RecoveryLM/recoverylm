/**
 * Memory Extraction Service
 *
 * Gathers raw activity data since a given date and sends it to Claude
 * for structured extraction into a DailyMemory object.
 * Uses the Anthropic SDK directly (not the orchestrator) since this
 * is a background utility call.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { DailyMemory, DailyMetric, JournalEntry, ChatMessage } from '@/types'
import { generateId, today } from '@/types'
import * as vault from '@/services/vault'

const MODEL = 'claude-haiku-4-5-20251001'

// Proxy support — same pattern as anthropic.ts
const PROXY_URL = import.meta.env.VITE_API_PROXY_URL as string | undefined
const USE_PROXY = !!PROXY_URL

let client: Anthropic | null = null
let extractionInProgress = false

function getClient(): Anthropic {
  if (!client) {
    if (USE_PROXY) {
      client = new Anthropic({
        apiKey: 'proxy-mode',
        baseURL: PROXY_URL,
        dangerouslyAllowBrowser: true
      })
    } else {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
      if (!apiKey) {
        throw new Error('VITE_ANTHROPIC_API_KEY is not set')
      }
      client = new Anthropic({
        apiKey,
        dangerouslyAllowBrowser: true
      })
    }
  }
  return client
}

// ============================================
// Activity gathering
// ============================================

interface RawActivity {
  chatMessages: ChatMessage[]
  journalEntries: JournalEntry[]
  metrics: DailyMetric[]
  previousFacts: string[]
}

/**
 * Fetch all user activity since a given date string (YYYY-MM-DD).
 */
async function gatherActivity(since: string): Promise<RawActivity> {
  // Convert date string to epoch timestamp for journal/session queries
  const [year, month, day] = since.split('-').map(Number)
  const sinceTimestamp = new Date(year, month - 1, day).getTime()

  // Fetch metrics, journal entries, and previous facts in parallel
  const [metrics, journalEntries, recentSessionIds, previousFacts] = await Promise.all([
    vault.getMetrics({ after: since }),
    vault.getJournalEntries({ after: sinceTimestamp }),
    vault.getRecentSessions(20),
    vault.getAllUserFacts()
  ])

  // Load chat history for sessions whose timestamp >= sinceTimestamp
  // Session ID format: session_{timestamp}_{random}
  const chatMessages: ChatMessage[] = []
  for (const sessionId of recentSessionIds) {
    const parts = sessionId.split('_')
    const sessionTs = parts.length >= 2 ? parseInt(parts[1], 10) : 0
    if (sessionTs >= sinceTimestamp) {
      const messages = await vault.getChatHistory(sessionId)
      chatMessages.push(...messages)
    }
  }

  return { chatMessages, journalEntries, metrics, previousFacts }
}

// ============================================
// Prompt building
// ============================================

const EXTRACTION_SYSTEM_PROMPT = `You are a memory extraction system for a recovery support app. Your job is to analyze a user's recent activity and extract structured memories.

You will receive the user's conversations with their AI companion Remi, journal entries, and daily check-in metrics.

Respond with ONLY valid JSON matching this schema:
{
  "conversationSummary": "Brief summary of what was discussed (or null if no conversations)",
  "journalSummary": "Brief summary of journal entries (or null if no entries)",
  "checkinSummary": "Brief summary of check-in trends (or null if no check-ins)",
  "userFacts": ["Durable facts about this person. Include ALL previous facts that are still true, plus any new ones. Remove any that are now contradicted."],
  "followUps": ["Things to follow up on"],
  "emotionalState": "How the user seemed emotionally during this period",
  "notablePatterns": ["Any patterns noticed"]
}

Guidelines:
- Be concise. Each summary should be 1-3 sentences.
- userFacts should be durable truths, not transient states. Include the full updated list (previous facts + new - contradicted).
- followUps are time-sensitive items Remi should bring up.
- notablePatterns should only include clear patterns, not speculation.
- If a section has no data, use null for summaries and empty arrays for lists.`

function buildExtractionPrompt(activity: RawActivity): string {
  const sections: string[] = []

  // Conversations
  if (activity.chatMessages.length > 0) {
    const convoLines = activity.chatMessages
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(m => `[${m.role}] ${m.content.slice(0, 500)}`)
    sections.push(`## Conversations\n${convoLines.join('\n')}`)
  } else {
    sections.push('## Conversations\nNo conversations during this period.')
  }

  // Journal entries
  if (activity.journalEntries.length > 0) {
    const journalLines = activity.journalEntries
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(e => `[${new Date(e.timestamp).toLocaleDateString()}] ${e.content.slice(0, 400)}`)
    sections.push(`## Journal Entries\n${journalLines.join('\n')}`)
  } else {
    sections.push('## Journal Entries\nNo journal entries during this period.')
  }

  // Daily check-ins (metrics)
  if (activity.metrics.length > 0) {
    const metricLines = activity.metrics.map(m => {
      const parts = [`Date: ${m.date}`, `Mood: ${m.moodScore}/10`, `Sober: ${m.sobrietyMaintained}`]
      if (m.sleepQuality !== undefined) parts.push(`Sleep: ${m.sleepQuality}/10`)
      if (m.anxietyLevel !== undefined) parts.push(`Anxiety: ${m.anxietyLevel}/10`)
      if (m.cravingIntensity !== undefined) parts.push(`Cravings: ${m.cravingIntensity}/10`)
      if (m.exercise) parts.push('Exercised')
      if (m.meditation) parts.push('Meditated')
      if (m.notes) parts.push(`Notes: ${m.notes}`)
      return parts.join(' | ')
    })
    sections.push(`## Daily Check-ins\n${metricLines.join('\n')}`)
  } else {
    sections.push('## Daily Check-ins\nNo check-ins during this period.')
  }

  // Previous facts
  if (activity.previousFacts.length > 0) {
    sections.push(`## Previous Known Facts\n${activity.previousFacts.map(f => `- ${f}`).join('\n')}`)
  } else {
    sections.push('## Previous Known Facts\nNo previous facts recorded.')
  }

  return sections.join('\n\n')
}

// ============================================
// Extraction
// ============================================

interface ExtractionResult {
  conversationSummary: string | null
  journalSummary: string | null
  checkinSummary: string | null
  userFacts: string[]
  followUps: string[]
  emotionalState: string
  notablePatterns: string[]
}

async function extractDailyMemory(coveringFrom: string): Promise<DailyMemory> {
  const todayStr = today()
  const activity = await gatherActivity(coveringFrom)

  // If there is no activity at all, return a minimal memory preserving previous facts
  const hasActivity =
    activity.chatMessages.length > 0 ||
    activity.journalEntries.length > 0 ||
    activity.metrics.length > 0

  if (!hasActivity) {
    return {
      id: generateId(),
      date: todayStr,
      coveringFrom,
      coveringTo: todayStr,
      userFacts: activity.previousFacts,
      followUps: [],
      emotionalState: 'unknown',
      notablePatterns: [],
      createdAt: Date.now()
    }
  }

  // Build prompt and call Claude
  const prompt = buildExtractionPrompt(activity)
  const anthropic = getClient()

  // Use streaming API — the proxy only supports streaming responses
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  })

  const response = await stream.finalMessage()

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => (block.type === 'text' ? block.text : ''))
    .join('')

  // Parse JSON response — strip markdown code fences if present
  const jsonText = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
  let result: ExtractionResult
  try {
    result = JSON.parse(jsonText) as ExtractionResult
    if (!Array.isArray(result.userFacts)) result.userFacts = []
    if (!Array.isArray(result.followUps)) result.followUps = []
    if (!Array.isArray(result.notablePatterns)) result.notablePatterns = []
    if (typeof result.emotionalState !== 'string') result.emotionalState = 'Unknown'
  } catch {
    console.error('Failed to parse memory extraction JSON:', text)
    // Fall back to a minimal memory
    return {
      id: generateId(),
      date: todayStr,
      coveringFrom,
      coveringTo: todayStr,
      userFacts: activity.previousFacts,
      followUps: [],
      emotionalState: 'unknown',
      notablePatterns: [],
      createdAt: Date.now()
    }
  }

  return {
    id: generateId(),
    date: todayStr,
    coveringFrom,
    coveringTo: todayStr,
    conversationSummary: result.conversationSummary ?? undefined,
    journalSummary: result.journalSummary ?? undefined,
    checkinSummary: result.checkinSummary ?? undefined,
    userFacts: result.userFacts ?? activity.previousFacts,
    followUps: result.followUps ?? [],
    emotionalState: result.emotionalState ?? 'unknown',
    notablePatterns: result.notablePatterns ?? [],
    createdAt: Date.now()
  }
}

// ============================================
// Entry point
// ============================================

/**
 * Run the daily memory extraction if it hasn't been done today.
 * This is non-blocking — errors are logged but never thrown.
 */
export async function runMemoryExtractionIfNeeded(): Promise<void> {
  if (extractionInProgress) return
  extractionInProgress = true
  try {
    const todayStr = today()
    const latest = await vault.getLatestDailyMemory()

    // Already extracted today — nothing to do
    if (latest && latest.date === todayStr) {
      return
    }

    // Determine the start of the window to cover
    let coveringFrom: string
    if (latest) {
      coveringFrom = latest.coveringTo
    } else {
      // First extraction ever — look back from the user's account creation date
      const profile = await vault.getProfile()
      if (profile?.createdAt) {
        const created = new Date(profile.createdAt)
        coveringFrom = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`
      } else {
        // No profile or createdAt — nothing to extract
        return
      }
    }

    // Nothing to extract if covering period starts today
    if (coveringFrom >= todayStr) {
      return
    }

    const memory = await extractDailyMemory(coveringFrom)
    await vault.saveDailyMemory(memory)

    console.log(`[memoryExtraction] Saved daily memory covering ${coveringFrom} -> ${todayStr}`)
  } catch (error) {
    console.error('[memoryExtraction] Extraction failed (non-blocking):', error)
  } finally {
    extractionInProgress = false
  }
}
