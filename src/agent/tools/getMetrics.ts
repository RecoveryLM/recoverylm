/**
 * Get Metrics Tool
 *
 * Retrieves daily metrics and habit tracking data.
 * Includes mood trends, sobriety streaks, exercise habits, etc.
 */

import { z } from 'zod'
import { tool, success, failure } from './helpers'
import * as vault from '@/services/vault'
import type { DailyMetric } from '@/types'

// ============================================
// Input Schema
// ============================================

export const getMetricsSchema = z.object({
  after_date: z
    .string()
    .optional()
    .describe('Start date in YYYY-MM-DD format. Only returns metrics on or after this date.'),
  before_date: z
    .string()
    .optional()
    .describe('End date in YYYY-MM-DD format. Only returns metrics on or before this date.'),
  limit: z
    .number()
    .optional()
    .default(14)
    .describe('Maximum number of days to return. Defaults to 14.'),
  analyze_trends: z
    .boolean()
    .optional()
    .default(false)
    .describe('If true, includes trend analysis (average mood, sobriety streak, exercise frequency, etc.). Defaults to false.')
})

export type GetMetricsInput = z.infer<typeof getMetricsSchema>

// ============================================
// Result Types
// ============================================

export interface MetricEntry {
  date: string
  moodScore: number
  sobrietyMaintained: boolean
  exercise: boolean
  meditation: boolean
  cravingIntensity?: number
  notes?: string
}

export interface TrendAnalysis {
  avgMood: number
  moodTrend: 'improving' | 'stable' | 'declining'
  sobrietyStreak: number
  exerciseDays: number
  meditationDays: number
  cravingFrequency: number
}

export interface MetricsResult {
  metrics: MetricEntry[]
  trends?: TrendAnalysis
}

// ============================================
// Trend Calculation
// ============================================

function calculateTrends(metrics: DailyMetric[]): TrendAnalysis {
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

// ============================================
// Tool Definition
// ============================================

export const getMetricsTool = tool({
  name: 'get_metrics',
  description: 'Retrieve daily metrics and habit tracking data. Use this to check mood trends, sobriety streaks, exercise habits, meditation practice, and other tracked metrics over time.',
  inputSchema: getMetricsSchema,
  execute: async (input) => {
    try {
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

      return success(result)
    } catch (error) {
      console.error('getMetrics error:', error)
      return failure(error instanceof Error ? error.message : 'Failed to retrieve metrics')
    }
  }
})
