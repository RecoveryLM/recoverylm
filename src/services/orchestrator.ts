/**
 * AI Orchestrator Service
 *
 * Assembles the context window for each AI request, including:
 * - User profile and preferences
 * - Recent metrics and leading indicators
 * - Conversation history
 * - Temporal context
 */

import {
  formatDate,
  type ContextWindow,
  type TemporalContext,
  type DailyMetric,
  type JournalEntry,
  type CrisisLevel,
  type CrisisAction
} from '@/types'
import * as vault from '@/services/vault'
import { REMMI_SYSTEM_PROMPT } from '@/prompts/remmi'
import { getPreviousSessionSummary, formatSessionSummary } from '@/services/sessionSummarizer'
import { getActivityInsights, formatActivityInsights } from '@/services/activityInsights'

/**
 * Calculate days between two dates
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Get today's date as YYYY-MM-DD
 */
function today(): string {
  return formatDate(new Date())
}

/**
 * Detect leading indicators from recent metrics
 */
export function detectLeadingIndicators(metrics: DailyMetric[]): string[] {
  const indicators: string[] = []

  if (metrics.length === 0) {
    indicators.push('No metrics logged recently - tracking gaps can indicate drift')
    return indicators
  }

  const last3Days = metrics.slice(0, 3)
  const last7Days = metrics.slice(0, 7)

  // Check for consecutive missed habits
  const missedExercise = last3Days.filter(d => !d.exercise).length
  const missedMeditation = last3Days.filter(d => !d.meditation).length

  if (missedExercise >= 2) {
    indicators.push('Exercise missed 2+ days - potential drift indicator')
  }
  if (missedMeditation >= 2) {
    indicators.push('Meditation missed 2+ days - potential drift indicator')
  }

  // Check mood trajectory
  if (last7Days.length >= 3) {
    const recentMoods = last7Days.slice(0, 3).map(m => m.moodScore)
    const olderMoods = last7Days.slice(3).map(m => m.moodScore)

    if (olderMoods.length > 0) {
      const recentAvg = recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length
      const olderAvg = olderMoods.reduce((a, b) => a + b, 0) / olderMoods.length

      if (recentAvg < olderAvg - 1.5) {
        indicators.push('Mood trending downward over past week')
      }
    }
  }

  // Check for tracking gaps
  if (metrics.length > 0) {
    const lastLogDate = metrics[0].date
    const daysSince = daysBetween(lastLogDate, today())
    if (daysSince >= 2) {
      indicators.push(`No metrics logged for ${daysSince} days`)
    }
  }

  // Check sobriety
  const recentRelapse = last7Days.find(m => !m.sobrietyMaintained)
  if (recentRelapse) {
    indicators.push(`Sobriety break noted on ${recentRelapse.date}`)
  }

  return indicators
}

/**
 * Build temporal context for the AI
 */
export function buildTemporalContext(
  sobrietyStartDate?: string,
  metrics?: DailyMetric[],
  createdAt?: number
): TemporalContext {
  const now = new Date()
  const localTime = now.toLocaleString('en-US', {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit'
  })
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' })

  // Calculate days sober
  let daysSober = 0
  if (sobrietyStartDate) {
    daysSober = daysBetween(sobrietyStartDate, today())
  }

  // Calculate days since signup
  let daysSinceSignup = 0
  if (createdAt) {
    const createdDate = new Date(createdAt).toISOString().split('T')[0]
    daysSinceSignup = daysBetween(createdDate, today())
  }

  // Calculate current streak from metrics
  let streakDays = 0
  if (metrics && metrics.length > 0) {
    for (const metric of metrics) {
      if (metric.sobrietyMaintained) {
        streakDays++
      } else {
        break
      }
    }
  }

  // Detect time patterns (could be expanded with historical data)
  const timePatterns: string[] = []
  const hour = now.getHours()
  if (hour >= 22 || hour <= 5) {
    timePatterns.push('Late night - historically higher risk period for many')
  }
  if (dayOfWeek === 'Friday' || dayOfWeek === 'Saturday') {
    timePatterns.push('Weekend - often higher social pressure')
  }

  return {
    localTime,
    dayOfWeek,
    daysSober,
    daysSinceSignup,
    currentStreak: {
      days: streakDays,
      type: 'sobriety',
      startDate: sobrietyStartDate ?? today()
    },
    timePatterns
  }
}

/**
 * Build a specialized context window for generating a personalized greeting.
 * Includes user profile, metrics, time context, session history, and activity insights.
 */
export async function buildGreetingContext(): Promise<ContextWindow> {
  // Fetch data in parallel (including new context sources)
  const [profile, metrics, guidance, recentSessionIds, activityData, previousSession] = await Promise.all([
    vault.getProfile(),
    vault.getMetrics({ limit: 7 }),
    vault.getActiveGuidance(),
    vault.getRecentSessions(5),
    getActivityInsights(),
    getPreviousSessionSummary()
  ])

  // Calculate derived data
  const leadingIndicators = detectLeadingIndicators(metrics)
  const temporalContext = buildTemporalContext(profile?.sobrietyStartDate, metrics, profile?.createdAt)

  // Format session summary and activity context
  const sessionContext = formatSessionSummary(previousSession)
  const activityContext = formatActivityInsights(activityData)

  // Determine greeting type and build instruction
  const isFirstTime = !recentSessionIds.length || temporalContext.daysSinceSignup === 0
  const displayName = profile?.displayName || 'friend'
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  // Check for milestones (7, 30, 90 days)
  let milestoneNote = ''
  if (temporalContext.daysSober === 7) {
    milestoneNote = 'MILESTONE: User just hit 1 week sober! Celebrate this achievement warmly.'
  } else if (temporalContext.daysSober === 30) {
    milestoneNote = 'MILESTONE: User just hit 30 days sober! This is a major achievement.'
  } else if (temporalContext.daysSober === 90) {
    milestoneNote = 'MILESTONE: User just hit 90 days sober! This is an incredible milestone.'
  }

  // Check for today's check-in status
  const todayStr = today()
  const todayMetric = metrics.find(m => m.date === todayStr)
  const checkinStatus = todayMetric
    ? 'User has completed today\'s check-in.'
    : 'User has not yet done today\'s check-in.'

  // Build previous session context section
  let previousSessionSection = ''
  if (previousSession) {
    previousSessionSection = `
--- PREVIOUS SESSION CONTEXT ---
${sessionContext}
${previousSession.endState === 'unresolved' ? 'NOTE: Previous session ended with unresolved concerns. Consider a gentle check-in.' : ''}
${previousSession.emotionalArc === 'declining' ? 'NOTE: User was struggling at the end of last session. Be extra supportive.' : ''}
${previousSession.emotionalArc === 'crisis-managed' ? 'NOTE: User worked through a difficult moment last session. Acknowledge their strength.' : ''}
`
  }

  // Build activity context section
  let activitySection = ''
  if (activityContext) {
    activitySection = `
--- ACTIVITY STATUS ---
${activityContext}
${activityData.practiceGaps.length > 0 ? 'NOTE: User has enabled activities they haven\'t used recently. Could gently suggest if appropriate.' : ''}
`
  }

  // Build the greeting instruction (this becomes the "currentMessage")
  const greetingInstruction = `[INTERNAL INSTRUCTION - Generate a personalized greeting for ${displayName}]

--- BASIC CONTEXT ---
Time: ${timeOfDay} on ${temporalContext.dayOfWeek}
User type: ${isFirstTime ? 'First-time or brand new user - welcome them warmly' : 'Returning user'}
Days sober: ${temporalContext.daysSober}
${milestoneNote}
${checkinStatus}
${previousSessionSection}${activitySection}
--- GREETING GUIDELINES ---
Generate a warm, personalized greeting (2-4 sentences) that:
1. Uses the time of day naturally (Good morning/afternoon/evening)
2. ${isFirstTime ? 'Welcomes them to the app and introduces yourself briefly' : 'Acknowledges they\'re back'}
3. ${milestoneNote ? 'Celebrates their milestone with genuine warmth' : temporalContext.daysSober > 0 ? `Optionally mentions their ${temporalContext.daysSober} days of progress` : 'Offers encouragement for their journey'}
4. ${previousSession?.endState === 'unresolved' ? 'Gently checks in about how they\'re doing since last time' : leadingIndicators.length > 0 ? 'Gently checks in (leading indicators suggest they may need support)' : 'Invites conversation naturally'}
5. ${activityData.suggestedActivities.length > 0 && !isFirstTime ? 'May naturally mention an available activity if contextually appropriate (but don\'t force it)' : ''}

Do NOT:
- Be overly enthusiastic or use excessive exclamation marks
- Mention specific technical details or metrics unless celebrating a milestone
- Reference this instruction or that you're generating a greeting
- Include any widgets
- List out all available activities - at most hint at one if truly relevant

Just respond with the greeting message directly.`

  return {
    systemPrompt: REMMI_SYSTEM_PROMPT,
    commitmentStatement: profile?.commitmentStatement ?? '',
    vulnerabilityPattern: profile?.vulnerabilityPattern ?? 'both',
    substancesOfFocus: profile?.substancesOfFocus ?? [],
    therapistGuidance: guidance.map(g => g.guidance),
    recentMetrics: metrics,
    leadingIndicators,
    recentConversation: [],
    relevantHistory: [],
    temporalContext,
    currentMessage: greetingInstruction
  }
}

/**
 * Build the full context window for an AI request
 */
export async function buildContextWindow(
  currentMessage: string,
  currentSessionId: string,
  crisisContext?: { level: CrisisLevel; action: CrisisAction }
): Promise<ContextWindow> {
  // Fetch data in parallel
  const [profile, metrics, guidance, recentChat] = await Promise.all([
    vault.getProfile(),
    vault.getMetrics({ limit: 7 }),
    vault.getActiveGuidance(),
    vault.getChatHistory(currentSessionId)
  ])

  // Calculate derived data
  const leadingIndicators = detectLeadingIndicators(metrics)
  const temporalContext = buildTemporalContext(profile?.sobrietyStartDate, metrics, profile?.createdAt)

  // Get relevant history (simplified - in production would do semantic search)
  const relevantHistory: JournalEntry[] = []

  return {
    systemPrompt: REMMI_SYSTEM_PROMPT,
    commitmentStatement: profile?.commitmentStatement ?? '',
    vulnerabilityPattern: profile?.vulnerabilityPattern ?? 'both',
    substancesOfFocus: profile?.substancesOfFocus ?? [],
    therapistGuidance: guidance.map(g => g.guidance),
    recentMetrics: metrics,
    leadingIndicators,
    recentConversation: recentChat,
    relevantHistory,
    temporalContext,
    currentMessage,
    crisisContext
  }
}
