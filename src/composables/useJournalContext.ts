import { ref } from 'vue'

/**
 * Stores pending journal context for analysis with Remi.
 * This enables passing journal content to the chat page without URL query params,
 * which avoids browser URL length limits for long journal entries.
 */

export interface PendingJournalContext {
  journalId: string
  template: string
  content: string
}

// Singleton state shared across components
const pendingContext = ref<PendingJournalContext | null>(null)

export function useJournalContext() {
  /**
   * Store journal context for analysis with Remi
   */
  const setPendingContext = (context: PendingJournalContext): void => {
    pendingContext.value = context
  }

  /**
   * Get and clear the pending context (consume it)
   */
  const consumePendingContext = (): PendingJournalContext | null => {
    const context = pendingContext.value
    pendingContext.value = null
    return context
  }

  /**
   * Check if there's a pending context without consuming it
   */
  const hasPendingContext = (): boolean => {
    return pendingContext.value !== null
  }

  /**
   * Clear any pending context without consuming
   */
  const clearPendingContext = (): void => {
    pendingContext.value = null
  }

  return {
    pendingContext,
    setPendingContext,
    consumePendingContext,
    hasPendingContext,
    clearPendingContext
  }
}
