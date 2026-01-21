import { ref, readonly } from 'vue'
import type { CrisisAssessment, CrisisResources } from '@/types'
import { assessCrisis, getCrisisResources } from '@/services/crisisHandler'

const showCrisisModal = ref(false)
const currentAssessment = ref<CrisisAssessment | null>(null)
const isAssessing = ref(false)

export function useCrisis() {
  /**
   * Assess a message for crisis indicators.
   * This MUST be called before any API call.
   */
  const assessMessage = async (message: string): Promise<CrisisAssessment> => {
    isAssessing.value = true

    try {
      const assessment = await assessCrisis(message)
      currentAssessment.value = assessment

      // Show crisis modal for emergency level
      if (assessment.level === 'emergency') {
        showCrisisModal.value = true
      }

      return assessment
    } finally {
      isAssessing.value = false
    }
  }

  /**
   * Trigger the crisis modal manually (e.g., from SOS button)
   */
  const triggerCrisisProtocol = () => {
    currentAssessment.value = {
      level: 'emergency',
      triggers: ['manual_sos'],
      recommendedAction: 'emergency-protocol',
      timestamp: Date.now()
    }
    showCrisisModal.value = true
  }

  /**
   * Dismiss the crisis modal (requires acknowledgment)
   */
  const dismissModal = (acknowledged: boolean) => {
    if (acknowledged) {
      showCrisisModal.value = false
    }
  }

  /**
   * Get crisis resources including emergency contact
   */
  const getResources = (): CrisisResources => {
    return getCrisisResources()
  }

  /**
   * Check if the current assessment should block normal flow
   */
  const shouldBlockFlow = (assessment: CrisisAssessment): boolean => {
    return assessment.level === 'emergency'
  }

  /**
   * Check if safety context should be injected
   */
  const shouldInjectContext = (assessment: CrisisAssessment): boolean => {
    return ['monitor', 'concern', 'urgent'].includes(assessment.level)
  }

  /**
   * Get context string to inject into AI prompt
   */
  const getContextInjection = (assessment: CrisisAssessment): string | null => {
    switch (assessment.level) {
      case 'monitor':
        return 'Note: User may be experiencing some distress. Monitor for escalation.'
      case 'concern':
        return 'Important: User appears to be struggling. Please check in on their wellbeing and offer appropriate support.'
      case 'urgent':
        return 'Critical: User is showing signs of significant distress. Engage supportively, provide crisis resources if appropriate, and encourage connection with support network.'
      default:
        return null
    }
  }

  return {
    showCrisisModal: readonly(showCrisisModal),
    currentAssessment: readonly(currentAssessment),
    isAssessing: readonly(isAssessing),
    assessMessage,
    triggerCrisisProtocol,
    dismissModal,
    getResources,
    shouldBlockFlow,
    shouldInjectContext,
    getContextInjection
  }
}
