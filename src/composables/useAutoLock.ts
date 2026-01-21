import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useVault } from './useVault'

const CHECK_INTERVAL_MS = 10000 // Check every 10 seconds
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const

// Shared state across all composable instances
const lastActivityTime = ref(Date.now())
const autoLockMinutes = ref(5)
let checkInterval: ReturnType<typeof setInterval> | null = null
let isInitialized = false

export function useAutoLock() {
  const router = useRouter()
  const { lock, isUnlocked, getAppSettings } = useVault()

  const updateActivity = () => {
    lastActivityTime.value = Date.now()
  }

  const checkInactivity = () => {
    // Don't check if auto-lock is disabled (0 minutes) or vault is already locked
    if (autoLockMinutes.value === 0 || !isUnlocked.value) {
      return
    }

    const inactiveMs = Date.now() - lastActivityTime.value
    const thresholdMs = autoLockMinutes.value * 60 * 1000

    if (inactiveMs >= thresholdMs) {
      lock()
      router.push({ name: 'unlock' })
    }
  }

  const loadSettings = async () => {
    try {
      const settings = await getAppSettings()
      autoLockMinutes.value = settings.autoLockMinutes
    } catch {
      // Use default if settings can't be loaded
      autoLockMinutes.value = 5
    }
  }

  const initialize = () => {
    if (isInitialized) return

    // Add activity listeners
    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true })
    })

    // Start checking for inactivity
    checkInterval = setInterval(checkInactivity, CHECK_INTERVAL_MS)
    isInitialized = true
  }

  const cleanup = () => {
    if (!isInitialized) return

    // Remove activity listeners
    ACTIVITY_EVENTS.forEach(event => {
      document.removeEventListener(event, updateActivity)
    })

    // Stop checking
    if (checkInterval) {
      clearInterval(checkInterval)
      checkInterval = null
    }
    isInitialized = false
  }

  // Watch for vault unlock to initialize/cleanup
  watch(isUnlocked, async (unlocked) => {
    if (unlocked) {
      await loadSettings()
      updateActivity() // Reset activity time on unlock
      initialize()
    } else {
      cleanup()
    }
  }, { immediate: true })

  // Update settings when autoLockMinutes changes externally
  const updateAutoLockMinutes = (minutes: number) => {
    autoLockMinutes.value = minutes
    // Reset activity timer when setting changes
    updateActivity()
  }

  onMounted(() => {
    if (isUnlocked.value) {
      loadSettings()
      initialize()
    }
  })

  onUnmounted(() => {
    // Don't cleanup on unmount since other components may still be using it
    // The cleanup will happen when the vault is locked
  })

  return {
    autoLockMinutes,
    updateAutoLockMinutes,
    resetActivityTimer: updateActivity
  }
}
