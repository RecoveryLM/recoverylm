/**
 * Activity Insights Service
 *
 * Generates insights about user's activity usage patterns,
 * identifies practice gaps, and suggests activities.
 */

import type {
  ActivityInsight,
  ActivityInsightsResult,
  WidgetId,
  DailyPracticeItem
} from '@/types'
import { formatDate } from '@/types'
import * as vault from '@/services/vault'

const DAY_MS = 24 * 60 * 60 * 1000
const TWO_WEEKS_MS = 14 * DAY_MS

/**
 * Calculate relative time description from timestamp
 */
function getRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) return 'never'

  const now = Date.now()
  const diff = now - timestamp

  if (diff < DAY_MS) {
    // Check if it's actually today (same calendar day)
    const today = formatDate(new Date())
    const logDate = formatDate(new Date(timestamp))
    if (today === logDate) return 'today'
    return 'yesterday'
  }

  const days = Math.floor(diff / DAY_MS)

  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'last week'
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`

  return 'over a month ago'
}

/**
 * Check if a timestamp is from today
 */
function isToday(timestamp: number): boolean {
  const today = formatDate(new Date())
  const logDate = formatDate(new Date(timestamp))
  return today === logDate
}

/**
 * Get activity insights for all tracked activities
 */
export async function getActivityInsights(): Promise<ActivityInsightsResult> {
  const [lastActivityTimes, activityCounts, practiceConfig] = await Promise.all([
    vault.getLastActivityTimes(),
    vault.getActivityCounts(),
    vault.getDailyPracticeConfig()
  ])

  // Build a map of enabled daily practice widgets
  const enabledWidgets = new Map<WidgetId, DailyPracticeItem>()
  for (const item of practiceConfig.items) {
    if (item.enabled && item.type === 'widget' && item.widgetId) {
      enabledWidgets.set(item.widgetId, item)
    }
  }

  // All widget IDs we want to track
  const allWidgetIds: WidgetId[] = [
    'W_DENTS', 'W_TAPE', 'W_STOIC', 'W_EVIDENCE', 'W_URGESURF',
    'W_CHECKIN', 'W_COMMITMENT', 'W_NETWORK', 'W_THOUGHTLOG',
    'W_GRATITUDE', 'W_SELFAPPRECIATION'
  ]

  const insights: ActivityInsight[] = []
  const suggestedActivities: WidgetId[] = []
  const practiceGaps: WidgetId[] = []
  const now = Date.now()

  for (const widgetId of allWidgetIds) {
    const lastUsed = lastActivityTimes[widgetId]
    const totalCompletions = activityCounts[widgetId] || 0
    const isEnabled = enabledWidgets.has(widgetId)
    const completedToday = lastUsed ? isToday(lastUsed) : false

    insights.push({
      widgetId,
      totalCompletions,
      lastUsedRelative: getRelativeTime(lastUsed),
      lastUsedTimestamp: lastUsed,
      isEnabledInDailyPractice: isEnabled,
      completedToday
    })

    // Identify suggested activities: enabled but not completed today
    if (isEnabled && !completedToday) {
      // Check time window if configured
      const item = enabledWidgets.get(widgetId)!
      const hour = new Date().getHours()

      // Only suggest if within time window (or no time window set)
      const inTimeWindow = (!item.startHour && !item.endHour) ||
        (item.startHour !== undefined && item.endHour !== undefined &&
          hour >= item.startHour && hour <= item.endHour)

      if (inTimeWindow) {
        suggestedActivities.push(widgetId)
      }
    }

    // Identify practice gaps: enabled but not used in 2+ weeks
    if (isEnabled && (!lastUsed || now - lastUsed > TWO_WEEKS_MS)) {
      practiceGaps.push(widgetId)
    }
  }

  return {
    insights,
    suggestedActivities,
    practiceGaps
  }
}

/**
 * Get user's most frequently used activities
 */
export function getTopActivities(insights: ActivityInsight[], limit: number = 3): ActivityInsight[] {
  return [...insights]
    .filter(i => i.totalCompletions > 0)
    .sort((a, b) => b.totalCompletions - a.totalCompletions)
    .slice(0, limit)
}

/**
 * Format activity insights for inclusion in greeting context
 */
export function formatActivityInsights(result: ActivityInsightsResult): string {
  const parts: string[] = []

  // Add suggested activities
  if (result.suggestedActivities.length > 0) {
    const widgetLabels = getWidgetLabels(result.suggestedActivities)
    parts.push(`Suggested daily practice activities: ${widgetLabels.join(', ')}`)
  }

  // Add practice gaps (gently)
  if (result.practiceGaps.length > 0) {
    const gapLabels = getWidgetLabels(result.practiceGaps)
    parts.push(`Activities enabled but not used recently: ${gapLabels.join(', ')}`)
  }

  // Add completion status for today
  const completedToday = result.insights.filter(i => i.completedToday)
  if (completedToday.length > 0) {
    const completedLabels = getWidgetLabels(completedToday.map(i => i.widgetId))
    parts.push(`Already completed today: ${completedLabels.join(', ')}`)
  }

  // Add top activities (if any history)
  const topActivities = getTopActivities(result.insights, 3)
  if (topActivities.length > 0) {
    const topLabels = topActivities.map(a =>
      `${getWidgetLabel(a.widgetId)} (${a.totalCompletions}x)`
    )
    parts.push(`Most used tools: ${topLabels.join(', ')}`)
  }

  return parts.join('\n')
}

/**
 * Get human-readable label for a widget ID
 */
function getWidgetLabel(widgetId: WidgetId): string {
  const labels: Record<WidgetId, string> = {
    'W_DENTS': 'DENTS Protocol',
    'W_TAPE': 'Play the Tape',
    'W_STOIC': 'Stoic Exercise',
    'W_EVIDENCE': 'Evidence Examination',
    'W_URGESURF': 'Urge Surfing',
    'W_CHECKIN': 'Daily Check-In',
    'W_COMMITMENT': 'Commitment Statement',
    'W_NETWORK': 'Support Network',
    'W_THOUGHTLOG': 'Thought Log',
    'W_GRATITUDE': 'Gratitude Journal',
    'W_SELFAPPRECIATION': 'Self Appreciation'
  }
  return labels[widgetId] || widgetId
}

/**
 * Get labels for multiple widget IDs
 */
function getWidgetLabels(widgetIds: WidgetId[]): string[] {
  return widgetIds.map(getWidgetLabel)
}
