/**
 * Dexie Database Schema for RecoveryLM
 *
 * This defines the IndexedDB schema using Dexie.js.
 * All sensitive data is stored encrypted via the Vault service.
 */

import Dexie, { type Table } from 'dexie'
import type { EncryptedPayload } from './crypto'

// ============================================
// Encrypted Storage Types
// ============================================

// These interfaces represent the encrypted versions stored in IndexedDB
// The actual data types are in @/types/index.ts

export interface EncryptedUserProfile {
  id: string
  data: EncryptedPayload // Encrypted UserProfile
  updatedAt: number
}

export interface EncryptedEmergencyContact {
  id: string
  data: EncryptedPayload // Encrypted EmergencyContact
  updatedAt: number
}

export interface EncryptedSupportPerson {
  id: string
  tier: 1 | 2 // Indexed for queries but not sensitive
  data: EncryptedPayload // Encrypted SupportPerson
  updatedAt: number
}

export interface EncryptedDailyMetric {
  date: string // YYYY-MM-DD, primary key, not encrypted
  data: EncryptedPayload // Encrypted DailyMetric
  updatedAt: number
}

export interface EncryptedJournalEntry {
  id: string
  sessionId: string // Indexed for session queries
  timestamp: number // Indexed for time-based queries
  tags: string[] // Indexed for tag queries, not sensitive
  data: EncryptedPayload // Encrypted JournalEntry content
}

export interface EncryptedChatMessage {
  id: string
  sessionId: string // Indexed for session queries
  timestamp: number // Indexed for ordering
  role: string // 'user' | 'assistant' | 'system', for filtering
  data: EncryptedPayload // Encrypted message content
}

export interface EncryptedTherapistGuidance {
  id: string
  category: string // Indexed for category queries
  active: number // 0 or 1, for filtering
  data: EncryptedPayload // Encrypted TherapistGuidance
  updatedAt: number
}

export interface EncryptedMetricsConfig {
  id: string // Always 'config' for singleton pattern
  data: EncryptedPayload // Encrypted MetricsConfig
  updatedAt: number
}

export interface EncryptedActivityLog {
  id: string
  activityId: string // WidgetId, indexed for queries by activity type
  completedAt: number // Indexed for time-based queries
  data: EncryptedPayload // Encrypted ActivityLog
}

export interface EncryptedDailyPracticeConfig {
  id: string // Always 'config' for singleton pattern
  data: EncryptedPayload // Encrypted DailyPracticeConfig
  updatedAt: number
}

export interface VaultSetting {
  key: string
  value: string // JSON stringified, some settings may be encrypted
}

export interface VaultMetadata {
  key: string // 'salt', 'version', etc.
  value: string
}

// ============================================
// Database Class
// ============================================

export class RecoveryLMDatabase extends Dexie {
  // Tables
  userProfile!: Table<EncryptedUserProfile>
  emergencyContacts!: Table<EncryptedEmergencyContact>
  supportNetwork!: Table<EncryptedSupportPerson>
  dailyMetrics!: Table<EncryptedDailyMetric>
  journalEntries!: Table<EncryptedJournalEntry>
  chatMessages!: Table<EncryptedChatMessage>
  therapistGuidance!: Table<EncryptedTherapistGuidance>
  metricsConfig!: Table<EncryptedMetricsConfig>
  activityLogs!: Table<EncryptedActivityLog>
  dailyPracticeConfig!: Table<EncryptedDailyPracticeConfig>
  settings!: Table<VaultSetting>
  metadata!: Table<VaultMetadata>

  constructor() {
    super('RecoveryLMVault')

    this.version(1).stores({
      // Primary key first, then indexed fields
      userProfile: 'id, updatedAt',
      emergencyContacts: 'id, updatedAt',
      supportNetwork: 'id, tier, updatedAt',
      dailyMetrics: 'date, updatedAt',
      journalEntries: 'id, sessionId, timestamp, *tags',
      chatMessages: 'id, sessionId, timestamp, role',
      therapistGuidance: 'id, category, active, updatedAt',
      settings: 'key',
      metadata: 'key'
    })

    this.version(2).stores({
      // Primary key first, then indexed fields
      userProfile: 'id, updatedAt',
      emergencyContacts: 'id, updatedAt',
      supportNetwork: 'id, tier, updatedAt',
      dailyMetrics: 'date, updatedAt',
      journalEntries: 'id, sessionId, timestamp, *tags',
      chatMessages: 'id, sessionId, timestamp, role',
      therapistGuidance: 'id, category, active, updatedAt',
      metricsConfig: 'id, updatedAt',
      settings: 'key',
      metadata: 'key'
    })

    this.version(3).stores({
      // Primary key first, then indexed fields
      userProfile: 'id, updatedAt',
      emergencyContacts: 'id, updatedAt',
      supportNetwork: 'id, tier, updatedAt',
      dailyMetrics: 'date, updatedAt',
      journalEntries: 'id, sessionId, timestamp, *tags',
      chatMessages: 'id, sessionId, timestamp, role',
      therapistGuidance: 'id, category, active, updatedAt',
      metricsConfig: 'id, updatedAt',
      activityLogs: 'id, activityId, completedAt',
      settings: 'key',
      metadata: 'key'
    })

    this.version(4).stores({
      // Primary key first, then indexed fields
      userProfile: 'id, updatedAt',
      emergencyContacts: 'id, updatedAt',
      supportNetwork: 'id, tier, updatedAt',
      dailyMetrics: 'date, updatedAt',
      journalEntries: 'id, sessionId, timestamp, *tags',
      chatMessages: 'id, sessionId, timestamp, role',
      therapistGuidance: 'id, category, active, updatedAt',
      metricsConfig: 'id, updatedAt',
      activityLogs: 'id, activityId, completedAt',
      dailyPracticeConfig: 'id, updatedAt',
      settings: 'key',
      metadata: 'key'
    })
  }
}

// ============================================
// Database Instance
// ============================================

let db: RecoveryLMDatabase | null = null

/**
 * Get the database instance (singleton)
 */
export function getDatabase(): RecoveryLMDatabase {
  if (!db) {
    db = new RecoveryLMDatabase()
  }
  return db
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    db.close()
    db = null
  }
}

/**
 * Delete the entire database (panic button / reset)
 */
export async function deleteDatabase(): Promise<void> {
  if (db) {
    db.close()
    db = null
  }
  await Dexie.delete('RecoveryLMVault')
}

/**
 * Check if the database has been initialized (has metadata)
 */
export async function isDatabaseInitialized(): Promise<boolean> {
  const database = getDatabase()
  const salt = await database.metadata.get('salt')
  return salt !== undefined
}

/**
 * Initialize the database with encryption salt
 */
export async function initializeDatabase(salt: string): Promise<void> {
  const database = getDatabase()
  await database.metadata.put({ key: 'salt', value: salt })
  await database.metadata.put({ key: 'version', value: '1' })
  await database.metadata.put({ key: 'createdAt', value: Date.now().toString() })
}

/**
 * Get the stored salt
 */
export async function getStoredSalt(): Promise<string | null> {
  const database = getDatabase()
  const entry = await database.metadata.get('salt')
  return entry?.value ?? null
}
