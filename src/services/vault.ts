/**
 * Vault Service for RecoveryLM
 *
 * The Vault is the encrypted persistence layer that wraps IndexedDB.
 * All data is encrypted/decrypted transparently.
 */

import type {
  UserProfile,
  EmergencyContact,
  SupportPerson,
  SupportNetwork,
  DailyMetric,
  JournalEntry,
  ChatMessage,
  TherapistGuidance,
  JournalTag,
  MetricsConfig,
  AppSettings,
  ActivityLog,
  WidgetId,
  DailyPracticeConfig
} from '@/types'
import { DEFAULT_METRICS, DEFAULT_DAILY_PRACTICE_ITEMS } from '@/types'
import {
  deriveKey,
  encryptObject,
  decryptObject,
  generateSalt,
  setCurrentKey,
  clearCurrentKey,
  getCurrentKey,
  isVaultUnlocked,
  generateRecoveryPhrase,
  keyFromRecoveryPhrase,
  validateRecoveryPhrase
} from './crypto'
import {
  getDatabase,
  deleteDatabase,
  isDatabaseInitialized,
  initializeDatabase,
  getStoredSalt
} from './database'

// ============================================
// Vault State
// ============================================

/**
 * Check if the vault is unlocked
 */
export function isUnlocked(): boolean {
  return isVaultUnlocked()
}

/**
 * Check if vault needs initial setup (no account exists)
 */
export async function needsSetup(): Promise<boolean> {
  return !(await isDatabaseInitialized())
}

/**
 * Create a new vault with a password
 */
/**
 * Check if the database contains existing encrypted data
 * (e.g. from a previous vault that wasn't wiped)
 */
export async function hasExistingData(): Promise<boolean> {
  const db = getDatabase()
  const profileCount = await db.userProfile.count()
  return profileCount > 0
}

export async function createVault(password: string): Promise<{ salt: string; recoveryPhrase: string[] }> {
  // Clear any stale encrypted data from a previous vault.
  // Data encrypted with the old key cannot be decrypted with the new one.
  const db = getDatabase()
  await Promise.all([
    db.userProfile.clear(),
    db.emergencyContacts.clear(),
    db.supportNetwork.clear(),
    db.dailyMetrics.clear(),
    db.journalEntries.clear(),
    db.chatMessages.clear(),
    db.therapistGuidance.clear(),
    db.metricsConfig.clear(),
    db.activityLogs.clear(),
    db.dailyPracticeConfig.clear(),
    db.settings.clear()
  ])

  const salt = generateSalt()
  const key = await deriveKey(password, salt)

  // Store salt and initialize database
  const saltBase64 = btoa(String.fromCharCode(...salt))
  await initializeDatabase(saltBase64)

  // Set the current key
  setCurrentKey(key, salt)

  // Generate and save recovery phrase
  const recoveryPhrase = generateRecoveryPhrase()
  await saveRecoveryPhrase(recoveryPhrase)

  return { salt: saltBase64, recoveryPhrase }
}

/**
 * Unlock the vault with a password
 */
export async function unlockVault(password: string): Promise<boolean> {
  try {
    const saltBase64 = await getStoredSalt()
    if (!saltBase64) {
      throw new Error('No vault found')
    }

    // Convert salt from base64
    const saltString = atob(saltBase64)
    const salt = new Uint8Array(saltString.length)
    for (let i = 0; i < saltString.length; i++) {
      salt[i] = saltString.charCodeAt(i)
    }

    // Derive the key
    const key = await deriveKey(password, salt)

    // Verify the key by trying to read the profile (if it exists)
    const db = getDatabase()
    const profileEntry = await db.userProfile.toArray()
    if (profileEntry.length > 0) {
      // Try to decrypt to verify the password is correct
      try {
        await decryptObject<UserProfile>(profileEntry[0].data, key)
      } catch {
        // Decryption failed - wrong password
        return false
      }
    }

    // Set the current key
    setCurrentKey(key, salt)
    return true
  } catch {
    return false
  }
}

/**
 * Lock the vault (clear the encryption key from memory)
 */
export function lockVault(): void {
  clearCurrentKey()
}

/**
 * Wipe all data (panic button)
 */
export async function wipeAllData(): Promise<void> {
  clearCurrentKey()
  await deleteDatabase()
}

// ============================================
// Helper Functions
// ============================================

function requireUnlocked(): { key: CryptoKey; salt: Uint8Array } {
  const keyData = getCurrentKey()
  if (!keyData) {
    throw new Error('Vault is locked')
  }
  return keyData
}

// ============================================
// User Profile
// ============================================

export async function getProfile(): Promise<UserProfile | null> {
  const { key } = requireUnlocked()
  const db = getDatabase()
  const entries = await db.userProfile.toArray()
  if (entries.length === 0) return null

  return decryptObject<UserProfile>(entries[0].data, key)
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const { key, salt } = requireUnlocked()
  const db = getDatabase()

  const encrypted = await encryptObject(profile, key, salt)
  await db.userProfile.put({
    id: profile.id,
    data: encrypted,
    updatedAt: Date.now()
  })
}

// ============================================
// Emergency Contact
// ============================================

export async function getEmergencyContact(): Promise<EmergencyContact | null> {
  const { key } = requireUnlocked()
  const db = getDatabase()
  const entries = await db.emergencyContacts.toArray()
  if (entries.length === 0) return null

  return decryptObject<EmergencyContact>(entries[0].data, key)
}

export async function saveEmergencyContact(contact: EmergencyContact): Promise<void> {
  const { key, salt } = requireUnlocked()
  const db = getDatabase()

  const encrypted = await encryptObject(contact, key, salt)
  await db.emergencyContacts.put({
    id: contact.id,
    data: encrypted,
    updatedAt: Date.now()
  })
}

// ============================================
// Support Network
// ============================================

export async function getSupportNetwork(): Promise<SupportNetwork> {
  const { key } = requireUnlocked()
  const db = getDatabase()
  const entries = await db.supportNetwork.toArray()

  const tier1: SupportPerson[] = []
  const tier2: SupportPerson[] = []

  for (const entry of entries) {
    const person = await decryptObject<SupportPerson>(entry.data, key)
    if (entry.tier === 1) {
      tier1.push(person)
    } else {
      tier2.push(person)
    }
  }

  return {
    tier1,
    tier2,
    primaryPartner: tier1.length > 0 ? tier1[0].id : null,
    backupPartner: tier1.length > 1 ? tier1[1].id : null
  }
}

export async function saveSupportPerson(person: SupportPerson): Promise<void> {
  const { key, salt } = requireUnlocked()
  const db = getDatabase()

  const encrypted = await encryptObject(person, key, salt)
  await db.supportNetwork.put({
    id: person.id,
    tier: person.tier,
    data: encrypted,
    updatedAt: Date.now()
  })
}

export async function deleteSupportPerson(id: string): Promise<void> {
  requireUnlocked()
  const db = getDatabase()
  await db.supportNetwork.delete(id)
}

// ============================================
// Daily Metrics
// ============================================

export async function getMetrics(options: {
  after?: string
  before?: string
  limit?: number
} = {}): Promise<DailyMetric[]> {
  const { key } = requireUnlocked()
  const db = getDatabase()

  let query = db.dailyMetrics.orderBy('date').reverse()

  if (options.after) {
    query = query.filter(m => m.date >= options.after!)
  }
  if (options.before) {
    query = query.filter(m => m.date <= options.before!)
  }
  if (options.limit) {
    query = query.limit(options.limit)
  }

  const entries = await query.toArray()
  const metrics: DailyMetric[] = []

  for (const entry of entries) {
    const metric = await decryptObject<DailyMetric>(entry.data, key)
    metrics.push(metric)
  }

  return metrics
}

export async function getMetricForDate(date: string): Promise<DailyMetric | null> {
  const { key } = requireUnlocked()
  const db = getDatabase()
  const entry = await db.dailyMetrics.get(date)
  if (!entry) return null

  return decryptObject<DailyMetric>(entry.data, key)
}

export async function saveMetric(metric: DailyMetric): Promise<void> {
  const { key, salt } = requireUnlocked()
  const db = getDatabase()

  const encrypted = await encryptObject(metric, key, salt)
  await db.dailyMetrics.put({
    date: metric.date,
    data: encrypted,
    updatedAt: Date.now()
  })
}

// ============================================
// Journal Entries
// ============================================

export async function getJournalEntries(options: {
  sessionId?: string
  tags?: JournalTag[]
  after?: number
  limit?: number
} = {}): Promise<JournalEntry[]> {
  const { key } = requireUnlocked()
  const db = getDatabase()

  let query = db.journalEntries.orderBy('timestamp').reverse()

  if (options.sessionId) {
    query = query.filter(e => e.sessionId === options.sessionId)
  }
  if (options.tags && options.tags.length > 0) {
    query = query.filter(e => options.tags!.some(t => e.tags.includes(t)))
  }
  if (options.after) {
    query = query.filter(e => e.timestamp >= options.after!)
  }
  if (options.limit) {
    query = query.limit(options.limit)
  }

  const entries = await query.toArray()
  const journalEntries: JournalEntry[] = []

  for (const entry of entries) {
    const journalEntry = await decryptObject<JournalEntry>(entry.data, key)
    journalEntries.push(journalEntry)
  }

  return journalEntries
}

export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  const { key, salt } = requireUnlocked()
  const db = getDatabase()

  const encrypted = await encryptObject(entry, key, salt)
  await db.journalEntries.put({
    id: entry.id,
    sessionId: entry.sessionId,
    timestamp: entry.timestamp,
    tags: entry.tags,
    data: encrypted
  })
}

// ============================================
// Chat Messages
// ============================================

export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const { key } = requireUnlocked()
  const db = getDatabase()

  const entries = await db.chatMessages
    .where('sessionId')
    .equals(sessionId)
    .sortBy('timestamp')

  const messages: ChatMessage[] = []

  for (const entry of entries) {
    const message = await decryptObject<ChatMessage>(entry.data, key)
    messages.push(message)
  }

  return messages
}

export async function getRecentSessions(limit: number = 10): Promise<string[]> {
  requireUnlocked()
  const db = getDatabase()

  // Get recent messages ordered by timestamp descending
  const entries = await db.chatMessages
    .orderBy('timestamp')
    .reverse()
    .limit(limit * 20) // Fetch enough to find unique sessions
    .toArray()

  // Extract unique session IDs preserving order (most recent first)
  const seen = new Set<string>()
  const sessionIds: string[] = []
  for (const entry of entries) {
    if (!seen.has(entry.sessionId)) {
      seen.add(entry.sessionId)
      sessionIds.push(entry.sessionId)
      if (sessionIds.length >= limit) break
    }
  }

  return sessionIds
}

export async function saveChatMessage(message: ChatMessage): Promise<void> {
  const { key, salt } = requireUnlocked()
  const db = getDatabase()

  const encrypted = await encryptObject(message, key, salt)
  await db.chatMessages.put({
    id: message.id,
    sessionId: message.sessionId,
    timestamp: message.timestamp,
    role: message.role,
    data: encrypted
  })
}

// ============================================
// Therapist Guidance
// ============================================

export async function getActiveGuidance(): Promise<TherapistGuidance[]> {
  const { key } = requireUnlocked()
  const db = getDatabase()

  const entries = await db.therapistGuidance
    .where('active')
    .equals(1)
    .toArray()

  const guidance: TherapistGuidance[] = []

  for (const entry of entries) {
    const item = await decryptObject<TherapistGuidance>(entry.data, key)
    guidance.push(item)
  }

  return guidance
}

export async function saveGuidance(guidance: TherapistGuidance): Promise<void> {
  const { key, salt } = requireUnlocked()
  const db = getDatabase()

  const encrypted = await encryptObject(guidance, key, salt)
  await db.therapistGuidance.put({
    id: guidance.id,
    category: guidance.category,
    active: guidance.active ? 1 : 0,
    data: encrypted,
    updatedAt: Date.now()
  })
}

// ============================================
// Metrics Configuration
// ============================================

export async function getMetricsConfig(): Promise<MetricsConfig> {
  const { key } = requireUnlocked()
  const db = getDatabase()

  const entry = await db.metricsConfig.get('config')
  if (!entry) {
    // Return default config if none exists
    return { metrics: [...DEFAULT_METRICS] }
  }

  return decryptObject<MetricsConfig>(entry.data, key)
}

export async function saveMetricsConfig(config: MetricsConfig): Promise<void> {
  const { key, salt } = requireUnlocked()
  const db = getDatabase()

  const encrypted = await encryptObject(config, key, salt)
  await db.metricsConfig.put({
    id: 'config',
    data: encrypted,
    updatedAt: Date.now()
  })
}

// ============================================
// Daily Practice Configuration
// ============================================

export async function getDailyPracticeConfig(): Promise<DailyPracticeConfig> {
  const { key } = requireUnlocked()
  const db = getDatabase()

  const entry = await db.dailyPracticeConfig.get('config')
  if (!entry) {
    // Return default config if none exists
    return { items: [...DEFAULT_DAILY_PRACTICE_ITEMS] }
  }

  return decryptObject<DailyPracticeConfig>(entry.data, key)
}

export async function saveDailyPracticeConfig(config: DailyPracticeConfig): Promise<void> {
  const { key, salt } = requireUnlocked()
  const db = getDatabase()

  const encrypted = await encryptObject(config, key, salt)
  await db.dailyPracticeConfig.put({
    id: 'config',
    data: encrypted,
    updatedAt: Date.now()
  })
}

// ============================================
// Activity Logs
// ============================================

/**
 * Log an activity completion
 */
export async function logActivity(activityId: WidgetId, durationSeconds?: number, result?: Record<string, unknown>): Promise<void> {
  const { key, salt } = requireUnlocked()
  const db = getDatabase()

  const log: ActivityLog = {
    id: crypto.randomUUID(),
    activityId,
    completedAt: Date.now(),
    durationSeconds,
    result
  }

  const encrypted = await encryptObject(log, key, salt)
  await db.activityLogs.put({
    id: log.id,
    activityId: log.activityId,
    completedAt: log.completedAt,
    data: encrypted
  })
}

/**
 * Get activity logs for a specific activity
 */
export async function getActivityLogs(activityId: WidgetId, limit = 10): Promise<ActivityLog[]> {
  const { key } = requireUnlocked()
  const db = getDatabase()

  const entries = await db.activityLogs
    .where('activityId')
    .equals(activityId)
    .reverse()
    .sortBy('completedAt')

  const logs: ActivityLog[] = []
  for (const entry of entries.slice(0, limit)) {
    try {
      const decrypted = await decryptObject<ActivityLog>(entry.data, key)
      logs.push(decrypted)
    } catch (e) {
      console.error('Failed to decrypt activity log:', e)
    }
  }

  return logs
}

/**
 * Get the most recent activity log for each activity type
 */
export async function getLastActivityTimes(): Promise<Record<WidgetId, number>> {
  requireUnlocked()
  const db = getDatabase()

  const result: Partial<Record<WidgetId, number>> = {}

  // Get all logs and find the most recent for each activity
  const entries = await db.activityLogs.toArray()

  for (const entry of entries) {
    const activityId = entry.activityId as WidgetId
    if (!result[activityId] || entry.completedAt > result[activityId]!) {
      result[activityId] = entry.completedAt
    }
  }

  return result as Record<WidgetId, number>
}

/**
 * Get the count of completions for each activity
 */
export async function getActivityCounts(): Promise<Record<WidgetId, number>> {
  const db = getDatabase()

  const result: Partial<Record<WidgetId, number>> = {}

  const entries = await db.activityLogs.toArray()

  for (const entry of entries) {
    const activityId = entry.activityId as WidgetId
    result[activityId] = (result[activityId] || 0) + 1
  }

  return result as Record<WidgetId, number>
}

/**
 * Get all activity logs from today (efficient lookup for greeting context)
 */
export async function getTodayActivityLogs(): Promise<ActivityLog[]> {
  const { key } = requireUnlocked()
  const db = getDatabase()

  // Get start of today in milliseconds
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

  const entries = await db.activityLogs
    .where('completedAt')
    .aboveOrEqual(startOfToday)
    .toArray()

  const logs: ActivityLog[] = []
  for (const entry of entries) {
    try {
      const decrypted = await decryptObject<ActivityLog>(entry.data, key)
      logs.push(decrypted)
    } catch (e) {
      console.error('Failed to decrypt activity log:', e)
    }
  }

  return logs
}

// ============================================
// App Settings
// ============================================

const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'dark',
  includeNamesInContext: false,
  notificationsEnabled: false,
  autoLockMinutes: 5
}

export async function getAppSettings(): Promise<AppSettings> {
  const { key } = requireUnlocked()
  const db = getDatabase()

  const entry = await db.settings.get('appSettings')
  if (!entry) {
    return { ...DEFAULT_APP_SETTINGS }
  }

  try {
    const payload = JSON.parse(entry.value)
    return await decryptObject<AppSettings>(payload, key)
  } catch {
    return { ...DEFAULT_APP_SETTINGS }
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const { key, salt } = requireUnlocked()
  const db = getDatabase()

  const encrypted = await encryptObject(settings, key, salt)
  await db.settings.put({
    key: 'appSettings',
    value: JSON.stringify(encrypted)
  })
}

// ============================================
// Recovery Phrase
// ============================================

export async function getRecoveryPhrase(): Promise<string[] | null> {
  const { key } = requireUnlocked()
  const db = getDatabase()

  const entry = await db.settings.get('recoveryPhrase')
  if (!entry) {
    return null
  }

  try {
    const payload = JSON.parse(entry.value)
    return await decryptObject<string[]>(payload, key)
  } catch {
    return null
  }
}

export async function saveRecoveryPhrase(phrase: string[]): Promise<void> {
  const { key, salt } = requireUnlocked()
  const db = getDatabase()

  const encrypted = await encryptObject(phrase, key, salt)
  await db.settings.put({
    key: 'recoveryPhrase',
    value: JSON.stringify(encrypted)
  })
}

// ============================================
// Change Password
// ============================================

export async function changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
  try {
    // First verify the current password
    const saltBase64 = await getStoredSalt()
    if (!saltBase64) {
      throw new Error('No vault found')
    }

    const saltString = atob(saltBase64)
    const oldSalt = new Uint8Array(saltString.length)
    for (let i = 0; i < saltString.length; i++) {
      oldSalt[i] = saltString.charCodeAt(i)
    }

    const oldKey = await deriveKey(currentPassword, oldSalt)

    // Verify by decrypting the profile
    const db = getDatabase()
    const profileEntry = await db.userProfile.toArray()
    if (profileEntry.length > 0) {
      try {
        await decryptObject<UserProfile>(profileEntry[0].data, oldKey)
      } catch {
        return false // Wrong password
      }
    }

    // Generate new salt and key
    const newSalt = generateSalt()
    const newKey = await deriveKey(newPassword, newSalt)
    const newSaltBase64 = btoa(String.fromCharCode(...newSalt))

    // Re-encrypt all data in a transaction
    await db.transaction('rw', [
      db.userProfile,
      db.emergencyContacts,
      db.supportNetwork,
      db.dailyMetrics,
      db.journalEntries,
      db.chatMessages,
      db.therapistGuidance,
      db.metricsConfig,
      db.activityLogs,
      db.dailyPracticeConfig,
      db.settings,
      db.metadata
    ], async () => {
      // Re-encrypt user profile
      const profiles = await db.userProfile.toArray()
      for (const entry of profiles) {
        const decrypted = await decryptObject<UserProfile>(entry.data, oldKey)
        const encrypted = await encryptObject(decrypted, newKey, newSalt)
        await db.userProfile.put({ ...entry, data: encrypted })
      }

      // Re-encrypt emergency contacts
      const contacts = await db.emergencyContacts.toArray()
      for (const entry of contacts) {
        const decrypted = await decryptObject<EmergencyContact>(entry.data, oldKey)
        const encrypted = await encryptObject(decrypted, newKey, newSalt)
        await db.emergencyContacts.put({ ...entry, data: encrypted })
      }

      // Re-encrypt support network
      const network = await db.supportNetwork.toArray()
      for (const entry of network) {
        const decrypted = await decryptObject<SupportPerson>(entry.data, oldKey)
        const encrypted = await encryptObject(decrypted, newKey, newSalt)
        await db.supportNetwork.put({ ...entry, data: encrypted })
      }

      // Re-encrypt daily metrics
      const metrics = await db.dailyMetrics.toArray()
      for (const entry of metrics) {
        const decrypted = await decryptObject<DailyMetric>(entry.data, oldKey)
        const encrypted = await encryptObject(decrypted, newKey, newSalt)
        await db.dailyMetrics.put({ ...entry, data: encrypted })
      }

      // Re-encrypt journal entries
      const journal = await db.journalEntries.toArray()
      for (const entry of journal) {
        const decrypted = await decryptObject<JournalEntry>(entry.data, oldKey)
        const encrypted = await encryptObject(decrypted, newKey, newSalt)
        await db.journalEntries.put({ ...entry, data: encrypted })
      }

      // Re-encrypt chat messages
      const messages = await db.chatMessages.toArray()
      for (const entry of messages) {
        const decrypted = await decryptObject<ChatMessage>(entry.data, oldKey)
        const encrypted = await encryptObject(decrypted, newKey, newSalt)
        await db.chatMessages.put({ ...entry, data: encrypted })
      }

      // Re-encrypt therapist guidance
      const guidance = await db.therapistGuidance.toArray()
      for (const entry of guidance) {
        const decrypted = await decryptObject<TherapistGuidance>(entry.data, oldKey)
        const encrypted = await encryptObject(decrypted, newKey, newSalt)
        await db.therapistGuidance.put({ ...entry, data: encrypted })
      }

      // Re-encrypt metrics config
      const config = await db.metricsConfig.toArray()
      for (const entry of config) {
        const decrypted = await decryptObject<MetricsConfig>(entry.data, oldKey)
        const encrypted = await encryptObject(decrypted, newKey, newSalt)
        await db.metricsConfig.put({ ...entry, data: encrypted })
      }

      // Re-encrypt activity logs
      const activityLogs = await db.activityLogs.toArray()
      for (const entry of activityLogs) {
        const decrypted = await decryptObject<ActivityLog>(entry.data, oldKey)
        const encrypted = await encryptObject(decrypted, newKey, newSalt)
        await db.activityLogs.put({ ...entry, data: encrypted })
      }

      // Re-encrypt daily practice config
      const practiceConfig = await db.dailyPracticeConfig.toArray()
      for (const entry of practiceConfig) {
        const decrypted = await decryptObject<DailyPracticeConfig>(entry.data, oldKey)
        const encrypted = await encryptObject(decrypted, newKey, newSalt)
        await db.dailyPracticeConfig.put({ ...entry, data: encrypted })
      }

      // Re-encrypt settings (appSettings, recoveryPhrase)
      const settingsEntries = await db.settings.toArray()
      for (const entry of settingsEntries) {
        try {
          const payload = JSON.parse(entry.value)
          if (payload.iv && payload.ciphertext) {
            const decrypted = await decryptObject(payload, oldKey)
            const encrypted = await encryptObject(decrypted, newKey, newSalt)
            await db.settings.put({ ...entry, value: JSON.stringify(encrypted) })
          }
        } catch {
          // Not an encrypted entry, skip
        }
      }

      // Update the stored salt
      await db.metadata.put({ key: 'salt', value: newSaltBase64 })
    })

    // Update the current key in memory
    setCurrentKey(newKey, newSalt)

    return true
  } catch (error) {
    console.error('Change password error:', error)
    return false
  }
}

// ============================================
// Reset Password with Recovery Phrase
// ============================================

export async function resetPasswordWithRecoveryPhrase(phrase: string[], newPassword: string): Promise<boolean> {
  try {
    // Validate phrase format
    if (!validateRecoveryPhrase(phrase)) {
      return false
    }

    // Derive key from recovery phrase
    const { key: oldKey } = await keyFromRecoveryPhrase(phrase)

    // Verify the key by trying to decrypt the profile
    const db = getDatabase()
    const profileEntry = await db.userProfile.toArray()
    if (profileEntry.length > 0) {
      try {
        await decryptObject<UserProfile>(profileEntry[0].data, oldKey)
      } catch {
        return false // Wrong recovery phrase
      }
    } else {
      // No profile means no data to recover
      return false
    }

    // Generate new salt and key
    const newSalt = generateSalt()
    const newKey = await deriveKey(newPassword, newSalt)
    const newSaltBase64 = btoa(String.fromCharCode(...newSalt))

    // Re-encrypt all data in a transaction (same logic as changePassword)
    await db.transaction('rw', [
      db.userProfile,
      db.emergencyContacts,
      db.supportNetwork,
      db.dailyMetrics,
      db.journalEntries,
      db.chatMessages,
      db.therapistGuidance,
      db.metricsConfig,
      db.activityLogs,
      db.dailyPracticeConfig,
      db.settings,
      db.metadata
    ], async () => {
      // Re-encrypt user profile
      const profiles = await db.userProfile.toArray()
      for (const entry of profiles) {
        const decrypted = await decryptObject<UserProfile>(entry.data, oldKey)
        const encrypted = await encryptObject(decrypted, newKey, newSalt)
        await db.userProfile.put({ ...entry, data: encrypted })
      }

      // Re-encrypt emergency contacts
      const contacts = await db.emergencyContacts.toArray()
      for (const entry of contacts) {
        const decrypted = await decryptObject<EmergencyContact>(entry.data, oldKey)
        const encrypted = await encryptObject(decrypted, newKey, newSalt)
        await db.emergencyContacts.put({ ...entry, data: encrypted })
      }

      // Re-encrypt support network
      const network = await db.supportNetwork.toArray()
      for (const entry of network) {
        const decrypted = await decryptObject<SupportPerson>(entry.data, oldKey)
        const encrypted = await encryptObject(decrypted, newKey, newSalt)
        await db.supportNetwork.put({ ...entry, data: encrypted })
      }

      // Re-encrypt daily metrics
      const metrics = await db.dailyMetrics.toArray()
      for (const entry of metrics) {
        const decrypted = await decryptObject<DailyMetric>(entry.data, oldKey)
        const encrypted = await encryptObject(decrypted, newKey, newSalt)
        await db.dailyMetrics.put({ ...entry, data: encrypted })
      }

      // Re-encrypt journal entries
      const journal = await db.journalEntries.toArray()
      for (const entry of journal) {
        const decrypted = await decryptObject<JournalEntry>(entry.data, oldKey)
        const encrypted = await encryptObject(decrypted, newKey, newSalt)
        await db.journalEntries.put({ ...entry, data: encrypted })
      }

      // Re-encrypt chat messages
      const messages = await db.chatMessages.toArray()
      for (const entry of messages) {
        const decrypted = await decryptObject<ChatMessage>(entry.data, oldKey)
        const encrypted = await encryptObject(decrypted, newKey, newSalt)
        await db.chatMessages.put({ ...entry, data: encrypted })
      }

      // Re-encrypt therapist guidance
      const guidance = await db.therapistGuidance.toArray()
      for (const entry of guidance) {
        const decrypted = await decryptObject<TherapistGuidance>(entry.data, oldKey)
        const encrypted = await encryptObject(decrypted, newKey, newSalt)
        await db.therapistGuidance.put({ ...entry, data: encrypted })
      }

      // Re-encrypt metrics config
      const config = await db.metricsConfig.toArray()
      for (const entry of config) {
        const decrypted = await decryptObject<MetricsConfig>(entry.data, oldKey)
        const encrypted = await encryptObject(decrypted, newKey, newSalt)
        await db.metricsConfig.put({ ...entry, data: encrypted })
      }

      // Re-encrypt activity logs
      const activityLogs = await db.activityLogs.toArray()
      for (const entry of activityLogs) {
        const decrypted = await decryptObject<ActivityLog>(entry.data, oldKey)
        const encrypted = await encryptObject(decrypted, newKey, newSalt)
        await db.activityLogs.put({ ...entry, data: encrypted })
      }

      // Re-encrypt daily practice config
      const practiceConfig = await db.dailyPracticeConfig.toArray()
      for (const entry of practiceConfig) {
        const decrypted = await decryptObject<DailyPracticeConfig>(entry.data, oldKey)
        const encrypted = await encryptObject(decrypted, newKey, newSalt)
        await db.dailyPracticeConfig.put({ ...entry, data: encrypted })
      }

      // Re-encrypt settings (appSettings, recoveryPhrase)
      const settingsEntries = await db.settings.toArray()
      for (const entry of settingsEntries) {
        try {
          const payload = JSON.parse(entry.value)
          if (payload.iv && payload.ciphertext) {
            const decrypted = await decryptObject(payload, oldKey)
            const encrypted = await encryptObject(decrypted, newKey, newSalt)
            await db.settings.put({ ...entry, value: JSON.stringify(encrypted) })
          }
        } catch {
          // Not an encrypted entry, skip
        }
      }

      // Update the stored salt
      await db.metadata.put({ key: 'salt', value: newSaltBase64 })
    })

    // Update the current key in memory (auto-unlock after reset)
    setCurrentKey(newKey, newSalt)

    return true
  } catch (error) {
    console.error('Reset password with recovery phrase error:', error)
    return false
  }
}

// ============================================
// Data Export/Import
// ============================================

export interface BackupData {
  version: string
  exportedAt: string
  userProfile: unknown[]
  emergencyContacts: unknown[]
  supportNetwork: unknown[]
  dailyMetrics: unknown[]
  journalEntries: unknown[]
  chatMessages: unknown[]
  therapistGuidance: unknown[]
  metricsConfig: unknown[]
  dailyPracticeConfig?: unknown[]
  activityLogs?: unknown[]
  settings?: unknown[]
  metadata: unknown[]
}

export function validateBackup(data: unknown): data is BackupData {
  if (typeof data !== 'object' || data === null) return false
  const backup = data as Record<string, unknown>
  return (
    typeof backup.version === 'string' &&
    typeof backup.exportedAt === 'string' &&
    Array.isArray(backup.userProfile) &&
    Array.isArray(backup.metadata)
  )
}

export async function importBackup(backup: BackupData, password: string): Promise<boolean> {
  try {
    // Extract salt from backup metadata
    const saltEntry = backup.metadata.find(
      (m: unknown) => (m as { key: string }).key === 'salt'
    ) as { key: string; value: string } | undefined

    if (!saltEntry) {
      throw new Error('Backup is missing encryption salt')
    }

    const saltBase64 = saltEntry.value
    const saltString = atob(saltBase64)
    const salt = new Uint8Array(saltString.length)
    for (let i = 0; i < saltString.length; i++) {
      salt[i] = saltString.charCodeAt(i)
    }

    // Derive key from password
    const key = await deriveKey(password, salt)

    // Verify password by attempting to decrypt the profile
    if (backup.userProfile.length > 0) {
      const profile = backup.userProfile[0] as { data: { iv: string; ciphertext: string; salt: string } }
      try {
        await decryptObject<UserProfile>(profile.data, key)
      } catch {
        return false // Wrong password
      }
    }

    // Clear existing database
    const db = getDatabase()
    await db.transaction('rw', [
      db.userProfile,
      db.emergencyContacts,
      db.supportNetwork,
      db.dailyMetrics,
      db.journalEntries,
      db.chatMessages,
      db.therapistGuidance,
      db.metricsConfig,
      db.activityLogs,
      db.dailyPracticeConfig,
      db.settings,
      db.metadata
    ], async () => {
      // Clear all tables
      await db.userProfile.clear()
      await db.emergencyContacts.clear()
      await db.supportNetwork.clear()
      await db.dailyMetrics.clear()
      await db.journalEntries.clear()
      await db.chatMessages.clear()
      await db.therapistGuidance.clear()
      await db.metricsConfig.clear()
      await db.activityLogs.clear()
      await db.dailyPracticeConfig.clear()
      await db.settings.clear()
      await db.metadata.clear()

      // Import all data
      if (backup.userProfile.length > 0) {
        await db.userProfile.bulkPut(backup.userProfile as never[])
      }
      if (backup.emergencyContacts.length > 0) {
        await db.emergencyContacts.bulkPut(backup.emergencyContacts as never[])
      }
      if (backup.supportNetwork.length > 0) {
        await db.supportNetwork.bulkPut(backup.supportNetwork as never[])
      }
      if (backup.dailyMetrics.length > 0) {
        await db.dailyMetrics.bulkPut(backup.dailyMetrics as never[])
      }
      if (backup.journalEntries.length > 0) {
        await db.journalEntries.bulkPut(backup.journalEntries as never[])
      }
      if (backup.chatMessages.length > 0) {
        await db.chatMessages.bulkPut(backup.chatMessages as never[])
      }
      if (backup.therapistGuidance.length > 0) {
        await db.therapistGuidance.bulkPut(backup.therapistGuidance as never[])
      }
      if (backup.metricsConfig.length > 0) {
        await db.metricsConfig.bulkPut(backup.metricsConfig as never[])
      }
      if (backup.activityLogs && backup.activityLogs.length > 0) {
        await db.activityLogs.bulkPut(backup.activityLogs as never[])
      }
      if (backup.dailyPracticeConfig && backup.dailyPracticeConfig.length > 0) {
        await db.dailyPracticeConfig.bulkPut(backup.dailyPracticeConfig as never[])
      }
      if (backup.settings && backup.settings.length > 0) {
        await db.settings.bulkPut(backup.settings as never[])
      }
      if (backup.metadata.length > 0) {
        await db.metadata.bulkPut(backup.metadata as never[])
      }
    })

    // Set the current key
    setCurrentKey(key, salt)

    return true
  } catch (error) {
    console.error('Import backup error:', error)
    return false
  }
}

export async function exportEncryptedBackup(): Promise<Blob> {
  requireUnlocked()
  const db = getDatabase()

  const data = {
    version: '1',
    exportedAt: new Date().toISOString(),
    userProfile: await db.userProfile.toArray(),
    emergencyContacts: await db.emergencyContacts.toArray(),
    supportNetwork: await db.supportNetwork.toArray(),
    dailyMetrics: await db.dailyMetrics.toArray(),
    journalEntries: await db.journalEntries.toArray(),
    chatMessages: await db.chatMessages.toArray(),
    therapistGuidance: await db.therapistGuidance.toArray(),
    metricsConfig: await db.metricsConfig.toArray(),
    activityLogs: await db.activityLogs.toArray(),
    dailyPracticeConfig: await db.dailyPracticeConfig.toArray(),
    settings: await db.settings.toArray(),
    metadata: await db.metadata.toArray()
  }

  const json = JSON.stringify(data, null, 2)
  return new Blob([json], { type: 'application/json' })
}
