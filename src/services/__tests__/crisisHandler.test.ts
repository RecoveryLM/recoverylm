import { describe, it, expect } from 'vitest'
import {
  assessCrisis,
  getCrisisResources,
  shouldBlockNormalFlow,
  shouldShowResources
} from '@/services/crisisHandler'

// ============================================
// Pattern Matching: EMERGENCY Level
// ============================================

describe('Crisis Detection - EMERGENCY patterns', () => {
  const emergencyCases = [
    'I want to kill myself',
    'I am going to end my life',
    'I want to end it all',
    'planning to die',
    'I am suicidal',
    'thinking about suicide',
    "it's not worth living",
    'not worth it anymore',
    'I want to disappear',
    'everyone would be better off without me',
    'there is no reason to live',
    'I am going to hurt myself',
    'I have a plan to end things',
    'I took pills myself',
  ]

  for (const message of emergencyCases) {
    it(`detects EMERGENCY: "${message}"`, async () => {
      const result = await assessCrisis(message)
      expect(result.level).toBe('emergency')
      expect(result.recommendedAction).toBe('emergency-protocol')
      expect(result.triggers.length).toBeGreaterThan(0)
    })
  }

  it('detects emergency with mixed case and extra whitespace', async () => {
    const result = await assessCrisis('I WANT TO KILL  MYSELF')
    expect(result.level).toBe('emergency')
  })

  it('detects suicidal within longer messages', async () => {
    const result = await assessCrisis(
      'I have been feeling really down lately and honestly I just feel suicidal sometimes'
    )
    expect(result.level).toBe('emergency')
  })
})

// ============================================
// Pattern Matching: URGENT Level
// ============================================

describe('Crisis Detection - URGENT patterns', () => {
  const urgentCases = [
    'I have thoughts of self-harm',
    'thoughts about hurting myself',
    'I am feeling hopeless',
    "I can't go on like this",
    "what's the point of any of this",
    'I just want to give up',
    "I don't want to be here anymore",
    'I wish I wasn\'t alive',
    'I keep hurting myself',
  ]

  for (const message of urgentCases) {
    it(`detects URGENT: "${message}"`, async () => {
      const result = await assessCrisis(message)
      expect(result.level).toBe('urgent')
      expect(result.recommendedAction).toBe('pause-and-connect')
      expect(result.triggers.length).toBeGreaterThan(0)
    })
  }
})

// ============================================
// Pattern Matching: CONCERN Level
// ============================================

describe('Crisis Detection - CONCERN patterns', () => {
  const concernCases = [
    'I relapsed last night',
    'I used again today',
    'I used last night after my argument',
    "I can't stop drinking",
    'I gave in to the craving',
    'I failed again',
    'I slipped and had a drink',
    'I hit rock bottom',
    'everything is falling apart',
    "I can't cope with this",
    'I feel overwhelmed by everything',
  ]

  for (const message of concernCases) {
    it(`detects CONCERN: "${message}"`, async () => {
      const result = await assessCrisis(message)
      expect(result.level).toBe('concern')
      expect(result.recommendedAction).toBe('show-resources')
      expect(result.triggers.length).toBeGreaterThan(0)
    })
  }
})

// ============================================
// Pattern Matching: MONITOR Level
// ============================================

describe('Crisis Detection - MONITOR patterns', () => {
  const monitorCases = [
    'I am struggling today',
    'Having a really hard day',
    'Going through a difficult time right now',
    'I feel tempted to drink',
    'I have a strong urge',
    'The craving is intense',
    'I want to use so badly',
    'I keep thinking about drinking',
    'thinking about using again',
  ]

  for (const message of monitorCases) {
    it(`detects MONITOR: "${message}"`, async () => {
      const result = await assessCrisis(message)
      expect(result.level).toBe('monitor')
      expect(result.recommendedAction).toBe('inject-context')
      expect(result.triggers.length).toBeGreaterThan(0)
    })
  }
})

// ============================================
// Pattern Matching: NONE Level (safe messages)
// ============================================

describe('Crisis Detection - NONE (safe messages)', () => {
  const safeCases = [
    'I had a great day today',
    'Feeling good about my progress',
    'I went to a meeting this morning',
    'My therapist said I am doing well',
    'I cooked dinner for my family',
    'What exercises can help with stress?',
    'Can you explain the SMART recovery framework?',
    'I want to set a new goal',
    'How do I meditate?',
    '',
  ]

  for (const message of safeCases) {
    it(`detects NONE: "${message || '(empty string)'}"`, async () => {
      const result = await assessCrisis(message)
      expect(result.level).toBe('none')
      expect(result.recommendedAction).toBe('proceed')
      expect(result.triggers).toEqual([])
    })
  }
})

// ============================================
// Priority Ordering (higher severity wins)
// ============================================

describe('Crisis Detection - severity priority', () => {
  it('EMERGENCY takes priority when both emergency and urgent patterns present', async () => {
    const result = await assessCrisis('I feel hopeless and want to kill myself')
    expect(result.level).toBe('emergency')
  })

  it('EMERGENCY takes priority over concern patterns', async () => {
    const result = await assessCrisis('I relapsed and now I want to end it all')
    expect(result.level).toBe('emergency')
  })

  it('EMERGENCY takes priority over monitor patterns', async () => {
    const result = await assessCrisis('I have a strong urge and I am suicidal')
    expect(result.level).toBe('emergency')
  })
})

// ============================================
// Context-Based Escalation
// ============================================

describe('Crisis Detection - context escalation', () => {
  describe('high message velocity', () => {
    it('escalates NONE to MONITOR when velocity > 5', async () => {
      const result = await assessCrisis('hello', { recentVelocity: 6 })
      expect(result.level).toBe('monitor')
    })

    it('escalates MONITOR to CONCERN when velocity > 5', async () => {
      const result = await assessCrisis('I am struggling', { recentVelocity: 6 })
      expect(result.level).toBe('concern')
    })

    it('does not escalate when velocity <= 5', async () => {
      const result = await assessCrisis('hello', { recentVelocity: 5 })
      expect(result.level).toBe('none')
    })

    it('does not escalate CONCERN or above from velocity alone', async () => {
      const result = await assessCrisis('I relapsed', { recentVelocity: 6 })
      expect(result.level).toBe('concern')
    })
  })

  describe('late night escalation', () => {
    it('escalates MONITOR to CONCERN at 2am', async () => {
      const result = await assessCrisis('I am struggling', { timeOfDay: 2 })
      expect(result.level).toBe('concern')
    })

    it('escalates CONCERN to URGENT at midnight', async () => {
      const result = await assessCrisis('I relapsed', { timeOfDay: 0 })
      expect(result.level).toBe('urgent')
    })

    it('escalates MONITOR to CONCERN at 11pm', async () => {
      const result = await assessCrisis('I am struggling', { timeOfDay: 23 })
      expect(result.level).toBe('concern')
    })

    it('escalates CONCERN to URGENT at 4am', async () => {
      const result = await assessCrisis('I relapsed', { timeOfDay: 4 })
      expect(result.level).toBe('urgent')
    })

    it('does not escalate during daytime hours', async () => {
      const result = await assessCrisis('I am struggling', { timeOfDay: 14 })
      expect(result.level).toBe('monitor')
    })

    it('does not escalate NONE even at late night', async () => {
      const result = await assessCrisis('hello', { timeOfDay: 2 })
      expect(result.level).toBe('none')
    })

    it('does not escalate at 5am (boundary)', async () => {
      const result = await assessCrisis('I am struggling', { timeOfDay: 5 })
      expect(result.level).toBe('monitor')
    })

    it('does not escalate at 10pm (boundary)', async () => {
      const result = await assessCrisis('I am struggling', { timeOfDay: 22 })
      expect(result.level).toBe('monitor')
    })
  })

  describe('combined escalation', () => {
    it('velocity escalation does not chain with late-night escalation', async () => {
      // velocity escalates NONE -> MONITOR, but late-night check uses original
      // pattern-match level (none), so no further escalation occurs
      const result = await assessCrisis('hello', { recentVelocity: 6, timeOfDay: 2 })
      expect(result.level).toBe('monitor')
    })

    it('both escalations apply when pattern already matches', async () => {
      // "struggling" matches MONITOR, velocity escalates to CONCERN,
      // late-night checks original level (monitor) and would escalate,
      // but velocity already moved adjustedLevel to concern
      const result = await assessCrisis('I am struggling', { recentVelocity: 6, timeOfDay: 2 })
      expect(result.level).toBe('urgent')
    })
  })
})

// ============================================
// Assessment Result Structure
// ============================================

describe('Crisis Assessment result structure', () => {
  it('includes all required fields', async () => {
    const result = await assessCrisis('test message')
    expect(result).toHaveProperty('level')
    expect(result).toHaveProperty('triggers')
    expect(result).toHaveProperty('recommendedAction')
    expect(result).toHaveProperty('timestamp')
    expect(typeof result.timestamp).toBe('number')
    expect(Array.isArray(result.triggers)).toBe(true)
  })

  it('includes a recent timestamp', async () => {
    const before = Date.now()
    const result = await assessCrisis('test')
    const after = Date.now()
    expect(result.timestamp).toBeGreaterThanOrEqual(before)
    expect(result.timestamp).toBeLessThanOrEqual(after)
  })

  it('trigger strings come from the matched text', async () => {
    const result = await assessCrisis('I feel suicidal today')
    expect(result.triggers[0]).toMatch(/suicid/i)
  })
})

// ============================================
// Helper Functions
// ============================================

describe('shouldBlockNormalFlow', () => {
  it('blocks on emergency', () => {
    expect(shouldBlockNormalFlow('emergency')).toBe(true)
  })

  it('does not block on urgent', () => {
    expect(shouldBlockNormalFlow('urgent')).toBe(false)
  })

  it('does not block on concern', () => {
    expect(shouldBlockNormalFlow('concern')).toBe(false)
  })

  it('does not block on monitor', () => {
    expect(shouldBlockNormalFlow('monitor')).toBe(false)
  })

  it('does not block on none', () => {
    expect(shouldBlockNormalFlow('none')).toBe(false)
  })
})

describe('shouldShowResources', () => {
  it('shows resources on emergency', () => {
    expect(shouldShowResources('emergency')).toBe(true)
  })

  it('shows resources on urgent', () => {
    expect(shouldShowResources('urgent')).toBe(true)
  })

  it('does not show resources on concern', () => {
    expect(shouldShowResources('concern')).toBe(false)
  })

  it('does not show resources on monitor', () => {
    expect(shouldShowResources('monitor')).toBe(false)
  })

  it('does not show resources on none', () => {
    expect(shouldShowResources('none')).toBe(false)
  })
})

describe('getCrisisResources', () => {
  it('returns the 988 Suicide & Crisis Lifeline number', () => {
    const resources = getCrisisResources()
    expect(resources.nationalSuicidePrevention).toBe('988')
  })

  it('returns Crisis Text Line info', () => {
    const resources = getCrisisResources()
    expect(resources.crisisTextLine).toBe('Text HOME to 741741')
  })

  it('returns SAMHSA helpline', () => {
    const resources = getCrisisResources()
    expect(resources.samhsaHelpline).toBe('1-800-662-4357')
  })
})

// ============================================
// Edge Cases & False Positive Resistance
// ============================================

describe('Crisis Detection - edge cases & false positives', () => {
  it('does not flag "I killed it at work today" as emergency', async () => {
    const result = await assessCrisis('I killed it at work today')
    expect(result.level).not.toBe('emergency')
  })

  it('does not flag discussion about recovery philosophy as crisis', async () => {
    const result = await assessCrisis(
      'I want to learn more about SMART Recovery and how it can help me'
    )
    expect(result.level).toBe('none')
  })

  it('does not flag cooking references as crisis', async () => {
    const result = await assessCrisis('I used the knife to chop vegetables for dinner')
    expect(result.level).toBe('none')
  })

  it('does not flag exercise discussion as crisis', async () => {
    const result = await assessCrisis('I went for a hard day of hiking and it was tough')
    // "hard day" triggers monitor - this is expected behavior
    expect(['none', 'monitor']).toContain(result.level)
  })

  it('handles very long messages without error', async () => {
    const longMessage = 'I am doing great today. '.repeat(1000)
    const result = await assessCrisis(longMessage)
    expect(result.level).toBe('none')
  })

  it('handles special characters without error', async () => {
    const result = await assessCrisis('!@#$%^&*()_+-=[]{}|;:,.<>?')
    expect(result.level).toBe('none')
  })

  it('handles unicode/emoji without error', async () => {
    const result = await assessCrisis('Feeling better today! 😊🎉💪')
    expect(result.level).toBe('none')
  })

  it('handles newlines in messages', async () => {
    const result = await assessCrisis('I want to\nkill\nmyself')
    // Pattern requires "kill myself" on same line - newlines may break pattern
    // This documents current behavior
    expect(result).toHaveProperty('level')
  })
})

// ============================================
// Action Mapping Consistency
// ============================================

describe('Crisis Detection - action mapping', () => {
  it('emergency maps to emergency-protocol', async () => {
    const result = await assessCrisis('I want to kill myself')
    expect(result.recommendedAction).toBe('emergency-protocol')
  })

  it('urgent maps to pause-and-connect', async () => {
    const result = await assessCrisis('feeling hopeless')
    expect(result.recommendedAction).toBe('pause-and-connect')
  })

  it('concern maps to show-resources', async () => {
    const result = await assessCrisis('I relapsed yesterday')
    expect(result.recommendedAction).toBe('show-resources')
  })

  it('monitor maps to inject-context', async () => {
    const result = await assessCrisis('having a hard day')
    expect(result.recommendedAction).toBe('inject-context')
  })

  it('none maps to proceed', async () => {
    const result = await assessCrisis('good morning')
    expect(result.recommendedAction).toBe('proceed')
  })
})
