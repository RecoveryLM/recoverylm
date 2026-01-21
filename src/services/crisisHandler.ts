import type { CrisisAssessment, CrisisLevel, CrisisAction, CrisisResources } from '@/types'

// ============================================
// Crisis Detection Patterns
// ============================================

// EMERGENCY: Immediate danger - requires instant intervention
const EMERGENCY_PATTERNS: RegExp[] = [
  /\b(kill|killing|end)\s*(myself|my\s*life|it\s*all)\b/i,
  /\b(want|going|about|planning)\s*to\s*(die|hurt\s*myself|end\s*it)\b/i,
  /\bsuicid(e|al)\b/i,
  /\bnot\s*worth\s*(living|it)\b/i,
  /\bwant\s*to\s*disappear\b/i,
  /\beveryone.*better\s*off\s*without\s*me\b/i,
  /\bno\s*reason\s*to\s*live\b/i,
  /\bgoing\s*to\s*hurt\s*myself\b/i,
  /\bhave\s*a\s*plan\s*to\b/i,
  /\bpills|rope|gun|knife.*myself\b/i,
]

// URGENT: Significant concern - needs resources and support
const URGENT_PATTERNS: RegExp[] = [
  /\bthoughts?\s*(of|about)\s*(self[- ]?harm|hurting\s*myself|ending\s*it)\b/i,
  /\bfeeling\s*hopeless\b/i,
  /\bcan'?t\s*go\s*on\b/i,
  /\bwhat'?s\s*the\s*point\b/i,
  /\bgive\s*up\b/i,
  /\bdon'?t\s*want\s*to\s*be\s*here\b/i,
  /\bwish\s*i\s*(wasn'?t|weren'?t)\s*alive\b/i,
  /\bhurting\s*myself\b/i,
]

// CONCERN: Relapse or significant distress - needs monitoring
const CONCERN_PATTERNS: RegExp[] = [
  /\brelapsed?\b/i,
  /\bused\s*(today|last\s*night|again)\b/i,
  /\bcan'?t\s*stop\b/i,
  /\bgave\s*in\b/i,
  /\bfailed\b/i,
  /\bslipped\b/i,
  /\bhit\s*rock\s*bottom\b/i,
  /\beverything\s*is\s*falling\s*apart\b/i,
  /\bcan'?t\s*cope\b/i,
  /\boverwhelmed\b/i,
]

// MONITOR: Mild distress signals - add context to AI
const MONITOR_PATTERNS: RegExp[] = [
  /\bstruggling\b/i,
  /\bhard\s*day\b/i,
  /\bdifficult\s*time\b/i,
  /\btempted\b/i,
  /\burge\b/i,
  /\bcraving\b/i,
  /\bwant\s*to\s*use\b/i,
  /\bthinking\s*about\s*(using|drinking)\b/i,
]

// ============================================
// Assessment Functions
// ============================================

/**
 * Stage 1: Local pattern matching (instant, no API required)
 */
function patternMatch(message: string): { level: CrisisLevel; triggers: string[] } {
  const triggers: string[] = []

  // Check patterns in order of severity
  for (const pattern of EMERGENCY_PATTERNS) {
    const match = message.match(pattern)
    if (match) {
      triggers.push(match[0])
      return { level: 'emergency', triggers }
    }
  }

  for (const pattern of URGENT_PATTERNS) {
    const match = message.match(pattern)
    if (match) {
      triggers.push(match[0])
    }
  }
  if (triggers.length > 0) {
    return { level: 'urgent', triggers }
  }

  for (const pattern of CONCERN_PATTERNS) {
    const match = message.match(pattern)
    if (match) {
      triggers.push(match[0])
    }
  }
  if (triggers.length > 0) {
    return { level: 'concern', triggers }
  }

  for (const pattern of MONITOR_PATTERNS) {
    const match = message.match(pattern)
    if (match) {
      triggers.push(match[0])
    }
  }
  if (triggers.length > 0) {
    return { level: 'monitor', triggers }
  }

  return { level: 'none', triggers: [] }
}

/**
 * Determine recommended action based on crisis level
 */
function getRecommendedAction(level: CrisisLevel): CrisisAction {
  switch (level) {
    case 'emergency':
      return 'emergency-protocol'
    case 'urgent':
      return 'pause-and-connect'
    case 'concern':
      return 'show-resources'
    case 'monitor':
      return 'inject-context'
    case 'none':
    default:
      return 'proceed'
  }
}

/**
 * Main crisis assessment function
 * This is called BEFORE any API call to ensure safety
 */
export async function assessCrisis(
  message: string,
  context?: {
    recentVelocity?: number // messages per minute
    timeOfDay?: number // hour 0-23
    historicalPatterns?: string[]
  }
): Promise<CrisisAssessment> {
  // Stage 1: Pattern matching (instant)
  const { level, triggers } = patternMatch(message)

  // Consider additional context factors
  let adjustedLevel = level

  // High message velocity might indicate crisis
  if (context?.recentVelocity && context.recentVelocity > 5) {
    if (level === 'none') {
      adjustedLevel = 'monitor'
    } else if (level === 'monitor') {
      adjustedLevel = 'concern'
    }
  }

  // Late night + distress patterns might escalate
  if (context?.timeOfDay !== undefined) {
    const isLateNight = context.timeOfDay >= 23 || context.timeOfDay <= 4
    if (isLateNight && (level === 'monitor' || level === 'concern')) {
      adjustedLevel = adjustedLevel === 'monitor' ? 'concern' : 'urgent'
    }
  }

  // Stage 2: AI classification would go here for ambiguous cases
  // For now, we rely on pattern matching which is fast and doesn't require API

  return {
    level: adjustedLevel,
    triggers,
    recommendedAction: getRecommendedAction(adjustedLevel),
    timestamp: Date.now()
  }
}

/**
 * Get crisis resources
 */
export function getCrisisResources(): CrisisResources {
  return {
    nationalSuicidePrevention: '988',
    crisisTextLine: 'Text HOME to 741741',
    samhsaHelpline: '1-800-662-4357',
    // Emergency contact will be loaded from vault when available
  }
}

/**
 * Check if a level requires blocking normal flow
 */
export function shouldBlockNormalFlow(level: CrisisLevel): boolean {
  return level === 'emergency'
}

/**
 * Check if resources should be shown
 */
export function shouldShowResources(level: CrisisLevel): boolean {
  return level === 'urgent' || level === 'emergency'
}
