import { ref } from 'vue'
import type { WidgetId } from '@/types'

/**
 * Stores the result of a completed activity to be discussed with Remi.
 * This enables the hybrid flow: complete activity -> discuss with Remi.
 */

export interface ActivityResult {
  widgetId: WidgetId
  widgetName: string
  result: unknown
  completedAt: number
}

// Singleton state shared across components
const pendingResult = ref<ActivityResult | null>(null)

export function useActivityResult() {
  /**
   * Store a completed activity result for discussion with Remi
   */
  const setResult = (widgetId: WidgetId, widgetName: string, result: unknown): void => {
    pendingResult.value = {
      widgetId,
      widgetName,
      result,
      completedAt: Date.now()
    }
  }

  /**
   * Get and clear the pending result (consume it)
   */
  const consumeResult = (): ActivityResult | null => {
    const result = pendingResult.value
    pendingResult.value = null
    return result
  }

  /**
   * Check if there's a pending result without consuming it
   */
  const hasPendingResult = (): boolean => {
    return pendingResult.value !== null
  }

  /**
   * Clear any pending result without consuming
   */
  const clearResult = (): void => {
    pendingResult.value = null
  }

  return {
    pendingResult,
    setResult,
    consumeResult,
    hasPendingResult,
    clearResult
  }
}
