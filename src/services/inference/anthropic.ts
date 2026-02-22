import Anthropic from '@anthropic-ai/sdk'
import type { ContextWindow } from '@/types'
import type { InferenceProvider, InferenceResponse, StreamCallbacks, AgenticStreamCallbacks, AgenticMessage } from './types'
import { parseWidgetCommands } from '../widgetParser'
import { REMMI_SYSTEM_PROMPT } from '@/prompts/remmi'
import { formatRecentSessionsForContext } from '../sessionSummarizer'
import { formatActivityInsights } from '../activityInsights'
import type { AgentTool, ToolUseBlock, ToolResultMessage } from '@/types/agent'

const MODEL = 'claude-sonnet-4-6'

// Check if we're using a proxy or direct API access
const PROXY_URL = import.meta.env.VITE_API_PROXY_URL as string | undefined
const USE_PROXY = !!PROXY_URL

// Retryable error types from Anthropic
const RETRYABLE_ERRORS = ['overloaded_error', 'rate_limit_error', 'api_error']

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if retryable
      const errorType = (error as { error?: { type?: string } })?.error?.type
      if (!RETRYABLE_ERRORS.includes(errorType || '') || attempt === maxRetries) {
        throw lastError
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelayMs * Math.pow(2, attempt)
      console.log(`Anthropic API error (${errorType}), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw lastError!
}

export class AnthropicProvider implements InferenceProvider {
  name = 'Anthropic Claude'
  private client: Anthropic | null = null

  private getClient(): Anthropic {
    if (!this.client) {
      // When using proxy, we don't need a real API key on the client
      if (USE_PROXY) {
        this.client = new Anthropic({
          apiKey: 'proxy-mode', // Placeholder, not used
          baseURL: PROXY_URL,
          dangerouslyAllowBrowser: true
        })
      } else {
        const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
        if (!apiKey) {
          throw new Error('VITE_ANTHROPIC_API_KEY is not set')
        }
        this.client = new Anthropic({
          apiKey,
          dangerouslyAllowBrowser: true // Required for browser usage
        })
      }
    }
    return this.client
  }

  async sendMessage(context: ContextWindow): Promise<InferenceResponse> {
    const client = this.getClient()
    const startTime = Date.now()

    // Build the system prompt with injected context
    const systemPrompt = this.buildSystemPrompt(context)

    // Build conversation history
    const messages = this.buildMessages(context)

    try {
      const response = await withRetry(() =>
        client.messages.create({
          model: MODEL,
          max_tokens: 2048,
          system: systemPrompt,
          messages
        })
      )

      const latencyMs = Date.now() - startTime
      const text = response.content
        .filter(block => block.type === 'text')
        .map(block => block.type === 'text' ? block.text : '')
        .join('')

      // Parse widgets from response
      const parsed = parseWidgetCommands(text)

      return {
        text: parsed.text,
        widgets: parsed.widgets,
        metadata: {
          tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
          latencyMs,
          model: response.model
        }
      }
    } catch (error) {
      console.error('Anthropic API error:', error)
      throw error
    }
  }

  async streamMessage(context: ContextWindow, callbacks: StreamCallbacks): Promise<void> {
    const client = this.getClient()
    const startTime = Date.now()

    const systemPrompt = this.buildSystemPrompt(context)
    const messages = this.buildMessages(context)

    let fullText = ''
    let inputTokens = 0
    let outputTokens = 0

    try {
      const result = await withRetry(async () => {
        // Reset state for retry attempts
        fullText = ''

        const stream = client.messages.stream({
          model: MODEL,
          max_tokens: 2048,
          system: systemPrompt,
          messages
        })

        stream.on('text', (text) => {
          fullText += text
          callbacks.onToken(text)
        })

        const finalMessage = await stream.finalMessage()
        return finalMessage
      })

      inputTokens = result.usage.input_tokens
      outputTokens = result.usage.output_tokens

      const latencyMs = Date.now() - startTime
      const parsed = parseWidgetCommands(fullText)

      callbacks.onComplete({
        text: parsed.text,
        widgets: parsed.widgets,
        metadata: {
          tokensUsed: inputTokens + outputTokens,
          latencyMs,
          model: result.model
        }
      })
    } catch (error) {
      console.error('Anthropic streaming error:', error)
      callbacks.onError(error instanceof Error ? error : new Error(String(error)))
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      if (USE_PROXY) {
        // Check proxy health endpoint
        const response = await fetch(`${PROXY_URL}/health`)
        return response.ok
      }
      const client = this.getClient()
      // Just verify we can create a client
      return client !== null
    } catch {
      return false
    }
  }

  /**
   * Stream a message with tool support for agentic loops.
   * Returns stop_reason and any tool_use blocks for continuation.
   */
  async streamAgenticMessage(
    context: ContextWindow,
    tools: AgentTool[],
    previousMessages: AgenticMessage[],
    callbacks: AgenticStreamCallbacks
  ): Promise<void> {
    const client = this.getClient()
    const startTime = Date.now()

    const systemPrompt = this.buildSystemPrompt(context)

    // Build messages: conversation history + previous agentic turns
    // When previousMessages has content (tool continuations), we need ALL messages
    // to use content-block format for API compatibility
    let allMessages: AgenticMessage[]

    if (previousMessages.length === 0) {
      // First call - use string format (API accepts both)
      allMessages = this.buildMessages(context) as AgenticMessage[]
    } else {
      // Continuation call - convert history to content-block format
      const baseMessages = this.buildMessages(context)
      const historyInBlockFormat: AgenticMessage[] = baseMessages.map(msg => ({
        role: msg.role,
        content: [{ type: 'text' as const, text: msg.content }]
      }))
      // Append previous agentic messages (assistant tool_use + user tool_result)
      allMessages = [...historyInBlockFormat, ...previousMessages]
    }

    let fullText = ''
    const toolUseBlocks: ToolUseBlock[] = []

    try {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages: allMessages as Anthropic.MessageParam[],
        tools: tools as Anthropic.Tool[]
      })

      // Handle text streaming
      stream.on('text', (text) => {
        fullText += text
        callbacks.onToken(text)
      })

      // Handle input JSON for tool use (if available)
      stream.on('inputJson', (json, snapshot) => {
        // inputJson fires during tool_use blocks, we track state through finalMessage
        void json
        void snapshot
      })

      const finalMessage = await stream.finalMessage()
      const latencyMs = Date.now() - startTime

      // Extract tool_use blocks from the final message
      for (const block of finalMessage.content) {
        if (block.type === 'tool_use') {
          callbacks.onToolUseStart?.(block.name)
          toolUseBlocks.push({
            type: 'tool_use',
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>
          })
        }
      }

      // Parse widgets from text response
      const parsed = parseWidgetCommands(fullText)

      callbacks.onComplete({
        text: parsed.text,
        widgets: parsed.widgets,
        stopReason: finalMessage.stop_reason as 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence',
        toolUseBlocks,
        metadata: {
          tokensUsed: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
          latencyMs,
          model: finalMessage.model
        }
      })
    } catch (error) {
      console.error('Anthropic agentic streaming error:', error)
      callbacks.onError(error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * Build an assistant message for agentic continuation that includes both text and tool use
   */
  buildAssistantAgenticMessage(text: string, toolUseBlocks: ToolUseBlock[]): AgenticMessage {
    const content: Array<{ type: 'text'; text: string } | ToolUseBlock> = []

    if (text) {
      content.push({ type: 'text', text })
    }

    content.push(...toolUseBlocks)

    return {
      role: 'assistant',
      content
    }
  }

  /**
   * Build a user message containing tool results for agentic continuation
   */
  buildToolResultMessage(toolResults: ToolResultMessage[]): AgenticMessage {
    return {
      role: 'user',
      content: toolResults
    }
  }

  private buildSystemPrompt(context: ContextWindow): string {
    let prompt = REMMI_SYSTEM_PROMPT

    // Inject dynamic context
    const contextSections: string[] = []

    // User context
    if (context.commitmentStatement) {
      contextSections.push(`## User's Commitment Statement\n"${context.commitmentStatement}"`)
    }

    if (context.vulnerabilityPattern) {
      contextSections.push(`## Vulnerability Pattern\nThis user primarily struggles with: ${context.vulnerabilityPattern}`)
    }

    if (context.substancesOfFocus && context.substancesOfFocus.length > 0) {
      contextSections.push(`## Substance(s) of Focus\nThis user is in recovery from: ${context.substancesOfFocus.join(', ')}. Tailor your support and advice to be relevant to their specific recovery journey.`)
    }

    // Temporal context
    if (context.temporalContext) {
      const { localTime, daysSober, daysSinceSignup, currentStreak } = context.temporalContext
      let contextLines = `## Current Context\n- Local time: ${localTime}\n- Days sober: ${daysSober}\n- Current streak: ${currentStreak.days} days\n- Days since signup: ${daysSinceSignup}`
      if (daysSinceSignup <= 7) {
        contextLines += `\n\nNote: This user is new (${daysSinceSignup === 0 ? 'just signed up today' : `only ${daysSinceSignup} day${daysSinceSignup === 1 ? '' : 's'} ago`}). Be welcoming and patient - they're still learning how to use the app and establishing their routine. Don't shame them for missing check-ins or not having habits established yet.`
      }
      contextSections.push(contextLines)
    }

    // Therapist guidance
    if (context.therapistGuidance.length > 0) {
      contextSections.push(`## Active Therapist Guidance\n${context.therapistGuidance.map(g => `- ${g}`).join('\n')}`)
    }

    // Leading indicators
    if (context.leadingIndicators.length > 0) {
      contextSections.push(`## Leading Indicators (Risk Signals)\n${context.leadingIndicators.map(i => `- ${i}`).join('\n')}`)
    }

    // Recent metrics - comprehensive view
    if (context.recentMetrics.length > 0) {
      const metrics = context.recentMetrics.slice(0, 7)
      const lines: string[] = [`## Recent Metrics (last ${metrics.length} days)`]

      // Core habits
      const soberDays = metrics.filter(m => m.sobrietyMaintained).length
      const exerciseDays = metrics.filter(m => m.exercise).length
      const meditationDays = metrics.filter(m => m.meditation).length
      const studyDays = metrics.filter(m => m.study).length
      const eatingDays = metrics.filter(m => m.healthyEating).length
      const connectionDays = metrics.filter(m => m.connectionTime).length
      const cbtDays = metrics.filter(m => m.cbtPractice).length

      lines.push(`Habits: Sober ${soberDays}/${metrics.length} | Exercise ${exerciseDays}/${metrics.length} | Meditation ${meditationDays}/${metrics.length} | Study ${studyDays}/${metrics.length} | Eating ${eatingDays}/${metrics.length} | Connection ${connectionDays}/${metrics.length} | CBT ${cbtDays}/${metrics.length}`)

      // Mood average
      const avgMood = metrics.reduce((sum, m) => sum + m.moodScore, 0) / metrics.length
      lines.push(`Average mood: ${avgMood.toFixed(1)}/10`)

      // Optional metrics (only if data exists)
      const withSleep = metrics.filter(m => m.sleepQuality !== undefined)
      const withAnxiety = metrics.filter(m => m.anxietyLevel !== undefined)
      const withCravings = metrics.filter(m => m.cravingIntensity !== undefined)

      if (withSleep.length > 0) {
        const avgSleep = withSleep.reduce((sum, m) => sum + (m.sleepQuality ?? 0), 0) / withSleep.length
        lines.push(`Sleep quality: ${avgSleep.toFixed(1)}/10 avg`)
      }
      if (withAnxiety.length > 0) {
        const avgAnxiety = withAnxiety.reduce((sum, m) => sum + (m.anxietyLevel ?? 0), 0) / withAnxiety.length
        lines.push(`Anxiety level: ${avgAnxiety.toFixed(1)}/10 avg`)
      }
      if (withCravings.length > 0) {
        const avgCravings = withCravings.reduce((sum, m) => sum + (m.cravingIntensity ?? 0), 0) / withCravings.length
        const recentCraving = metrics[0]?.cravingIntensity
        lines.push(`Craving intensity: ${avgCravings.toFixed(1)}/10 avg${recentCraving !== undefined ? ` (most recent: ${recentCraving})` : ''}`)
      }

      contextSections.push(lines.join('\n'))
    }

    // Activity insights
    if (context.activityInsights) {
      const activityContext = formatActivityInsights(context.activityInsights)
      if (activityContext) {
        contextSections.push(`## Activity Usage\n${activityContext}`)
      }
    }

    // Recent session history
    if (context.recentSessionSummaries && context.recentSessionSummaries.length > 0) {
      const sessionHistory = formatRecentSessionsForContext(context.recentSessionSummaries)
      let section = `## Recent Session History\n${sessionHistory}`

      // Add actionable notes for unresolved concerns
      const lastSession = context.recentSessionSummaries[0]
      if (lastSession.endState === 'unresolved') {
        section += '\n\nNote: Last session ended with unresolved concerns. Consider checking in about how they\'re doing.'
      }

      contextSections.push(section)
    }

    // Relevant history (memory)
    if (context.relevantHistory.length > 0) {
      const historyLines = context.relevantHistory.map(item => {
        const tagInfo = item.tags && item.tags.length > 0
          ? ` [${item.tags.join(', ')}]`
          : ''
        return `- [${item.date}, ${item.source}${tagInfo}] "${item.content}"`
      })

      contextSections.push(
        '## Relevant History\n' +
        'Past journal entries and conversations that may relate to what the user is discussing. ' +
        'Reference naturally if appropriate \u2014 don\'t list them or force connections.\n\n' +
        historyLines.join('\n')
      )
    }

    // Support network context
    if (context.supportNetwork) {
      const { tier1, tier2, primaryPartner, backupPartner } = context.supportNetwork

      if (tier1.length > 0 || tier2.length > 0) {
        let networkSection = '## Support Network\n'

        if (tier1.length > 0) {
          networkSection += '### Core Support (Tier 1)\n'
          for (const person of tier1) {
            const isPrimary = person.id === primaryPartner
            const isBackup = person.id === backupPartner
            let roleNote = ''
            if (isPrimary) roleNote = ' (Primary accountability partner)'
            else if (isBackup) roleNote = ' (Backup accountability partner)'
            networkSection += `- **${person.name}** - ${person.relationship}${roleNote}\n`
          }
        }

        if (tier2.length > 0) {
          networkSection += '### Extended Support (Tier 2)\n'
          for (const person of tier2) {
            networkSection += `- **${person.name}** - ${person.relationship}\n`
          }
        }

        networkSection += '\nYou can suggest the user reach out to these people when appropriate.'
        contextSections.push(networkSection)
      }
    }

    // Crisis context injection
    if (context.crisisContext) {
      const { level } = context.crisisContext
      if (level !== 'none') {
        contextSections.push(`## Safety Note\nThe crisis handler has flagged this message at level "${level}". ${
          level === 'urgent' ? 'Please engage supportively and offer appropriate resources.' :
          level === 'concern' ? 'Please check in on their wellbeing.' :
          'Monitor for escalation.'
        }`)
      }
    }

    // Append context to system prompt
    if (contextSections.length > 0) {
      prompt += '\n\n---\n\n# Current Session Context\n\n' + contextSections.join('\n\n')
    }

    return prompt
  }

  private buildMessages(context: ContextWindow): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

    // Add conversation history — keep up to 50 messages so Remi maintains
    // context across longer conversations. The current user message is already
    // included in recentConversation (saved before context is built).
    for (const msg of context.recentConversation.slice(-50)) {
      if ((msg.role === 'user' || msg.role === 'assistant') && msg.content?.trim()) {
        messages.push({
          role: msg.role,
          content: msg.content
        })
      }
    }

    // If the current message isn't already the last message in the history
    // (e.g. greeting context where recentConversation is empty), add it
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.content !== context.currentMessage) {
      messages.push({
        role: 'user',
        content: context.currentMessage
      })
    }

    return messages
  }
}

// Singleton instance
let provider: AnthropicProvider | null = null

export function getAnthropicProvider(): AnthropicProvider {
  if (!provider) {
    provider = new AnthropicProvider()
  }
  return provider
}
