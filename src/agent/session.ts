/**
 * Session Manager for RecoveryLM Agent
 *
 * Handles session creation, resumption, forking, and persistence.
 * Sessions are stored in the vault and linked to chat messages.
 */

import type { SessionState, SessionMetadata, AgentMessage } from './types'
import { generateSessionId } from '@/types'
import * as vault from '@/services/vault'
import { fromChatMessage, toChatMessage } from './messages'

// ============================================
// Session Manager Interface
// ============================================

export interface SessionManager {
  /**
   * Create a new session
   */
  create(): SessionState

  /**
   * Resume an existing session by ID
   */
  resume(sessionId: string): Promise<SessionState | null>

  /**
   * Fork an existing session (creates a copy with new ID)
   */
  fork(sessionId: string): Promise<SessionState>

  /**
   * Save the current session state
   */
  save(state: SessionState): Promise<void>

  /**
   * Check if a session is from today
   */
  isFromToday(sessionId: string): boolean

  /**
   * Get the most recent session from today, if any
   */
  getTodaySession(): Promise<SessionState | null>
}

// ============================================
// Implementation
// ============================================

/**
 * Check if a session ID is from today based on embedded timestamp
 */
function isSessionFromToday(sessionId: string): boolean {
  // Session format: session_{timestamp}_{random}
  const match = sessionId.match(/^session_(\d+)_/)
  if (!match) return false

  const sessionTimestamp = parseInt(match[1], 10)
  const sessionDate = new Date(sessionTimestamp).toDateString()
  const todayDate = new Date().toDateString()

  return sessionDate === todayDate
}

/**
 * Create session metadata
 */
function createMetadata(sessionId: string): SessionMetadata {
  const now = Date.now()
  return {
    id: sessionId,
    createdAt: now,
    lastActiveAt: now,
    messageCount: 0
  }
}

/**
 * Create the session manager instance
 */
export function createSessionManager(): SessionManager {
  return {
    create(): SessionState {
      const sessionId = generateSessionId()
      return {
        metadata: createMetadata(sessionId),
        messages: []
      }
    },

    async resume(sessionId: string): Promise<SessionState | null> {
      try {
        // Load messages from vault
        const chatMessages = await vault.getChatHistory(sessionId)
        if (chatMessages.length === 0) {
          return null
        }

        // Convert to agent messages
        const messages: AgentMessage[] = chatMessages
          .map(fromChatMessage)
          .filter((m): m is AgentMessage => m !== null)

        // Build metadata from session
        const match = sessionId.match(/^session_(\d+)_/)
        const createdAt = match ? parseInt(match[1], 10) : Date.now()
        const lastActiveAt = chatMessages.length > 0
          ? Math.max(...chatMessages.map(m => m.timestamp))
          : createdAt

        return {
          metadata: {
            id: sessionId,
            createdAt,
            lastActiveAt,
            messageCount: chatMessages.length
          },
          messages
        }
      } catch (error) {
        console.error('Failed to resume session:', error)
        return null
      }
    },

    async fork(sessionId: string): Promise<SessionState> {
      const original = await this.resume(sessionId)
      if (!original) {
        // If original doesn't exist, just create a new session
        return this.create()
      }

      const newSessionId = generateSessionId()
      return {
        metadata: {
          ...createMetadata(newSessionId),
          forkedFrom: sessionId
        },
        messages: [...original.messages]
      }
    },

    async save(state: SessionState): Promise<void> {
      // Update metadata
      state.metadata.lastActiveAt = Date.now()
      state.metadata.messageCount = state.messages.length

      // Convert agent messages to chat messages and save
      for (const message of state.messages) {
        const chatMessage = toChatMessage(message, state.metadata.id)
        if (chatMessage) {
          await vault.saveChatMessage(chatMessage)
        }
      }
    },

    isFromToday(sessionId: string): boolean {
      return isSessionFromToday(sessionId)
    },

    async getTodaySession(): Promise<SessionState | null> {
      try {
        const recentSessions = await vault.getRecentSessions(10)
        const todaySession = recentSessions.find(isSessionFromToday)

        if (todaySession) {
          return this.resume(todaySession)
        }

        return null
      } catch (error) {
        console.error('Failed to get today\'s session:', error)
        return null
      }
    }
  }
}

/**
 * Default session manager instance
 */
export const sessionManager = createSessionManager()

/**
 * Helper to check if vault is ready for session operations
 */
export function canManageSessions(): boolean {
  return vault.isUnlocked()
}
