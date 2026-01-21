/**
 * Search Journal Tool
 *
 * Searches journal entries by tags.
 * Finds entries about cravings, triggers, victories, etc.
 */

import { z } from 'zod'
import { tool, success, failure } from './helpers'
import * as vault from '@/services/vault'
import type { JournalTag } from '@/types'

// ============================================
// Available Tags
// ============================================

const AVAILABLE_TAGS = [
  'craving',
  'rationalization',
  'trigger',
  'gratitude',
  'relapse',
  'victory',
  'therapy-prep',
  'urge-surfed',
  'distortion-caught'
] as const

// ============================================
// Input Schema
// ============================================

export const searchJournalSchema = z.object({
  tags: z
    .array(z.enum(AVAILABLE_TAGS))
    .optional()
    .describe('Filter by tags. Available tags: craving, rationalization, trigger, gratitude, relapse, victory, therapy-prep, urge-surfed, distortion-caught.'),
  after_timestamp: z
    .number()
    .optional()
    .describe('Unix timestamp in milliseconds. Only returns entries after this time.'),
  limit: z
    .number()
    .optional()
    .default(10)
    .describe('Maximum number of entries to return. Defaults to 10.')
})

export type SearchJournalInput = z.infer<typeof searchJournalSchema>

// ============================================
// Result Types
// ============================================

export interface JournalEntryResult {
  id: string
  timestamp: number
  content: string
  tags: string[]
  sentiment?: string
}

export interface JournalSearchResult {
  entries: JournalEntryResult[]
}

// ============================================
// Tool Definition
// ============================================

export const searchJournalTool = tool({
  name: 'search_journal',
  description: 'Search journal entries by tags. Use this to find entries about cravings, triggers, victories, gratitude, or other tagged content.',
  inputSchema: searchJournalSchema,
  execute: async (input) => {
    try {
      const { tags, after_timestamp, limit = 10 } = input

      const entries = await vault.getJournalEntries({
        tags: tags as JournalTag[] | undefined,
        after: after_timestamp,
        limit
      })

      const result: JournalSearchResult = {
        entries: entries.map(e => ({
          id: e.id,
          timestamp: e.timestamp,
          content: e.content.substring(0, 500) + (e.content.length > 500 ? '...' : ''),
          tags: e.tags,
          sentiment: e.sentiment
        }))
      }

      return success(result)
    } catch (error) {
      console.error('searchJournal error:', error)
      return failure(error instanceof Error ? error.message : 'Journal search failed')
    }
  }
})
