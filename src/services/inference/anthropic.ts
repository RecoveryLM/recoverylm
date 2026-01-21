import Anthropic from '@anthropic-ai/sdk'
import type { ContextWindow } from '@/types'
import type { InferenceProvider, InferenceResponse, StreamCallbacks, AgenticStreamCallbacks, AgenticMessage } from './types'
import { parseWidgetCommands } from '../widgetParser'
import { REMMI_SYSTEM_PROMPT } from '@/prompts/remmi'
import type { AgentTool, ToolUseBlock, ToolResultMessage } from '@/types/agent'

const MODEL = 'claude-sonnet-4-5'

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
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
      if (!apiKey) {
        throw new Error('VITE_ANTHROPIC_API_KEY is not set')
      }
      this.client = new Anthropic({
        apiKey,
        dangerouslyAllowBrowser: true // Required for browser usage
      })
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

    // Recent metrics summary
    if (context.recentMetrics.length > 0) {
      const metrics = context.recentMetrics.slice(0, 7)
      const soberDays = metrics.filter(m => m.sobrietyMaintained).length
      const exerciseDays = metrics.filter(m => m.exercise).length
      const meditationDays = metrics.filter(m => m.meditation).length
      const avgMood = metrics.reduce((sum, m) => sum + m.moodScore, 0) / metrics.length
      contextSections.push(`## Recent Metrics (last ${metrics.length} days)\n- Sober: ${soberDays}/${metrics.length} days\n- Exercise: ${exerciseDays}/${metrics.length} days\n- Meditation: ${meditationDays}/${metrics.length} days\n- Average mood: ${avgMood.toFixed(1)}/10`)
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

    // Add recent conversation history (last 10 messages)
    for (const msg of context.recentConversation.slice(-10)) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content
        })
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: context.currentMessage
    })

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
