import { ref, readonly } from 'vue'
import type {
  UserProfile,
  EmergencyContact,
  SupportNetwork,
  DailyMetric,
  MetricsConfig,
  AppSettings,
  DailyPracticeConfig,
  DailyPracticeItem
} from '@/types'
import { DEFAULT_DAILY_PRACTICE_ITEMS } from '@/types'
import type { BackupData } from '@/services/vault'
import * as vault from '@/services/vault'
import { runMemoryExtractionIfNeeded } from '@/services/memoryExtraction'

// ============================================
// Reactive State
// ============================================

const isUnlocked = ref(false)
const isLoading = ref(false)
const error = ref<string | null>(null)
const userProfile = ref<UserProfile | null>(null)
const needsSetup = ref(true)

// Initialize on load
async function checkInitialState() {
  needsSetup.value = await vault.needsSetup()
  isUnlocked.value = vault.isUnlocked()
}
checkInitialState()

// Merge stored practice items with defaults to inherit new fields
function mergePracticeItemsWithDefaults(storedItems: DailyPracticeItem[]): DailyPracticeItem[] {
  return storedItems.map(item => {
    const defaultItem = DEFAULT_DAILY_PRACTICE_ITEMS.find(d => d.id === item.id)
    if (!defaultItem) return item
    // Default fields first, then stored values override
    return { ...defaultItem, ...item }
  })
}

// ============================================
// Composable
// ============================================

export function useVault() {
  /**
   * Create a new vault with password
   */
  const create = async (password: string): Promise<{ success: boolean; recoveryPhrase?: string[] }> => {
    isLoading.value = true
    error.value = null

    try {
      const result = await vault.createVault(password)
      isUnlocked.value = true
      needsSetup.value = false
      return { success: true, recoveryPhrase: result.recoveryPhrase }
    } catch (e) {
      error.value = 'Failed to create vault'
      console.error('Create vault error:', e)
      return { success: false }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Unlock the vault with password
   */
  const unlock = async (password: string): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      const success = await vault.unlockVault(password)
      if (success) {
        isUnlocked.value = true
        // Load user profile
        userProfile.value = await vault.getProfile()
        // Async memory extraction (non-blocking)
        runMemoryExtractionIfNeeded()
      } else {
        error.value = 'Incorrect password'
      }
      return success
    } catch (e) {
      error.value = 'Failed to unlock vault'
      console.error('Unlock vault error:', e)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Lock the vault
   */
  const lock = () => {
    vault.lockVault()
    isUnlocked.value = false
    userProfile.value = null
  }

  /**
   * Wipe all data
   */
  const wipe = async (): Promise<void> => {
    isLoading.value = true
    try {
      await vault.wipeAllData()
      isUnlocked.value = false
      userProfile.value = null
      needsSetup.value = true
    } finally {
      isLoading.value = false
    }
  }

  // ============================================
  // Profile Operations
  // ============================================

  const getProfile = async (): Promise<UserProfile | null> => {
    if (!isUnlocked.value) return null
    return vault.getProfile()
  }

  const saveProfile = async (profile: UserProfile): Promise<void> => {
    if (!isUnlocked.value) throw new Error('Vault is locked')
    await vault.saveProfile(profile)
    userProfile.value = profile
  }

  // ============================================
  // Emergency Contact Operations
  // ============================================

  const getEmergencyContact = async (): Promise<EmergencyContact | null> => {
    if (!isUnlocked.value) return null
    return vault.getEmergencyContact()
  }

  const saveEmergencyContact = async (contact: EmergencyContact): Promise<void> => {
    if (!isUnlocked.value) throw new Error('Vault is locked')
    await vault.saveEmergencyContact(contact)
  }

  // ============================================
  // Support Network Operations
  // ============================================

  const getSupportNetwork = async (): Promise<SupportNetwork | null> => {
    if (!isUnlocked.value) return null
    return vault.getSupportNetwork()
  }

  const saveSupportPerson = vault.saveSupportPerson
  const deleteSupportPerson = vault.deleteSupportPerson

  // ============================================
  // Metrics Operations
  // ============================================

  const getMetrics = async (options?: {
    after?: string
    before?: string
    limit?: number
  }): Promise<DailyMetric[]> => {
    if (!isUnlocked.value) return []
    return vault.getMetrics(options)
  }

  const getMetricForDate = async (date: string): Promise<DailyMetric | null> => {
    if (!isUnlocked.value) return null
    return vault.getMetricForDate(date)
  }

  const saveMetric = vault.saveMetric

  // ============================================
  // Journal Operations
  // ============================================

  const getJournalEntries = vault.getJournalEntries
  const saveJournalEntry = vault.saveJournalEntry

  // ============================================
  // Chat Operations
  // ============================================

  const getChatHistory = vault.getChatHistory
  const getRecentSessions = vault.getRecentSessions
  const saveChatMessage = vault.saveChatMessage

  // ============================================
  // Guidance Operations
  // ============================================

  const getActiveGuidance = vault.getActiveGuidance
  const saveGuidance = vault.saveGuidance

  // ============================================
  // Metrics Config Operations
  // ============================================

  const getMetricsConfig = async (): Promise<MetricsConfig> => {
    if (!isUnlocked.value) return { metrics: [] }
    return vault.getMetricsConfig()
  }

  const saveMetricsConfig = async (config: MetricsConfig): Promise<void> => {
    if (!isUnlocked.value) throw new Error('Vault is locked')
    await vault.saveMetricsConfig(config)
  }

  // ============================================
  // Daily Practice Config Operations
  // ============================================

  const getDailyPracticeConfig = async (): Promise<DailyPracticeConfig> => {
    if (!isUnlocked.value) return { items: [] }
    const config = await vault.getDailyPracticeConfig()
    if (config.items.length === 0) {
      return { items: [...DEFAULT_DAILY_PRACTICE_ITEMS] }
    }
    return { items: mergePracticeItemsWithDefaults(config.items) }
  }

  const saveDailyPracticeConfig = async (config: DailyPracticeConfig): Promise<void> => {
    if (!isUnlocked.value) throw new Error('Vault is locked')
    await vault.saveDailyPracticeConfig(config)
  }

  // ============================================
  // Activity Log Operations
  // ============================================

  const logActivity = vault.logActivity
  const getActivityLogs = vault.getActivityLogs
  const getLastActivityTimes = vault.getLastActivityTimes
  const getActivityCounts = vault.getActivityCounts

  // ============================================
  // Export Operations
  // ============================================

  const exportBackup = vault.exportEncryptedBackup

  // ============================================
  // App Settings Operations
  // ============================================

  const getAppSettings = async (): Promise<AppSettings> => {
    if (!isUnlocked.value) {
      return {
        theme: 'dark',
        includeNamesInContext: false,
        notificationsEnabled: false,
        autoLockMinutes: 5
      }
    }
    return vault.getAppSettings()
  }

  const saveAppSettings = async (settings: AppSettings): Promise<void> => {
    if (!isUnlocked.value) throw new Error('Vault is locked')
    await vault.saveAppSettings(settings)
  }

  // ============================================
  // Recovery Phrase Operations
  // ============================================

  const getRecoveryPhrase = async (): Promise<string[] | null> => {
    if (!isUnlocked.value) return null
    return vault.getRecoveryPhrase()
  }

  const saveRecoveryPhrase = async (phrase: string[]): Promise<void> => {
    if (!isUnlocked.value) throw new Error('Vault is locked')
    await vault.saveRecoveryPhrase(phrase)
  }

  // ============================================
  // Change Password Operation
  // ============================================

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    if (!isUnlocked.value) throw new Error('Vault is locked')
    return vault.changePassword(currentPassword, newPassword)
  }

  // ============================================
  // Import Backup Operations
  // ============================================

  const validateBackup = vault.validateBackup

  const importBackup = async (backup: BackupData, password: string): Promise<boolean> => {
    const success = await vault.importBackup(backup, password)
    if (success) {
      isUnlocked.value = true
      needsSetup.value = false
      userProfile.value = await vault.getProfile()
    }
    return success
  }

  // ============================================
  // Reset Password with Recovery Phrase
  // ============================================

  const resetPasswordWithRecoveryPhrase = async (phrase: string[], newPassword: string): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      const success = await vault.resetPasswordWithRecoveryPhrase(phrase, newPassword)
      if (success) {
        isUnlocked.value = true
        userProfile.value = await vault.getProfile()
      } else {
        error.value = 'Invalid recovery phrase or could not decrypt vault'
      }
      return success
    } catch (e) {
      error.value = 'Failed to reset password'
      console.error('Reset password error:', e)
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    isUnlocked: readonly(isUnlocked),
    isLoading: readonly(isLoading),
    error: readonly(error),
    userProfile: readonly(userProfile),
    needsSetup: readonly(needsSetup),

    // Auth
    create,
    unlock,
    lock,
    wipe,

    // Profile
    getProfile,
    saveProfile,

    // Emergency Contact
    getEmergencyContact,
    saveEmergencyContact,

    // Support Network
    getSupportNetwork,
    saveSupportPerson,
    deleteSupportPerson,

    // Metrics
    getMetrics,
    getMetricForDate,
    saveMetric,

    // Journal
    getJournalEntries,
    saveJournalEntry,

    // Chat
    getChatHistory,
    getRecentSessions,
    saveChatMessage,

    // Guidance
    getActiveGuidance,
    saveGuidance,

    // Metrics Config
    getMetricsConfig,
    saveMetricsConfig,

    // Daily Practice Config
    getDailyPracticeConfig,
    saveDailyPracticeConfig,

    // Activity Logs
    logActivity,
    getActivityLogs,
    getLastActivityTimes,
    getActivityCounts,

    // Export
    exportBackup,

    // App Settings
    getAppSettings,
    saveAppSettings,

    // Recovery Phrase
    getRecoveryPhrase,
    saveRecoveryPhrase,

    // Change Password
    changePassword,

    // Import Backup
    validateBackup,
    importBackup,

    // Reset Password with Recovery Phrase
    resetPasswordWithRecoveryPhrase
  }
}
