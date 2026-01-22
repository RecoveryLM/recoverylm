import type { WidgetId, WidgetCommand, ParsedResponse } from '@/types'

// Widget command format: [WIDGET:WIDGET_ID|{json_params}]
const WIDGET_PATTERN = /\[WIDGET:(\w+)\|(\{[^}]*\})\]/g

// Widget registry with parameter validators
const WIDGET_REGISTRY: Record<WidgetId, {
  validateParams: (params: Record<string, unknown>) => boolean
}> = {
  W_DENTS: {
    validateParams: (p) =>
      typeof p.trigger === 'string' &&
      typeof p.intensity === 'number' &&
      p.intensity >= 1 &&
      p.intensity <= 10
  },
  W_TAPE: {
    validateParams: (p) =>
      typeof p.trigger === 'string' &&
      (p.currentThought === undefined || typeof p.currentThought === 'string')
  },
  W_STOIC: {
    validateParams: (p) => typeof p.situation === 'string'
  },
  W_EVIDENCE: {
    validateParams: (p) =>
      typeof p.thought === 'string' &&
      (p.distortion === undefined || typeof p.distortion === 'string')
  },
  W_URGESURF: {
    validateParams: (p) =>
      typeof p.duration === 'number' &&
      p.duration > 0 &&
      p.duration <= 3600
  },
  W_CHECKIN: {
    validateParams: (p) =>
      p.date === undefined || typeof p.date === 'string'
  },
  W_COMMITMENT: {
    validateParams: (p) =>
      p.mode === 'view' || p.mode === 'edit'
  },
  W_NETWORK: {
    validateParams: (p) =>
      p.action === 'view' || p.action === 'notify' || p.action === 'edit'
  },
  W_THOUGHTLOG: {
    validateParams: (p) =>
      p.situation === undefined || typeof p.situation === 'string'
  },
  W_GRATITUDE: {
    validateParams: () => true // All params optional
  },
  W_SELFAPPRECIATION: {
    validateParams: () => true // All params optional
  }
}

/**
 * Parse widget commands from AI response text
 */
export function parseWidgetCommands(response: string): ParsedResponse {
  const widgets: WidgetCommand[] = []
  const errors: string[] = []
  let text = response

  // Reset regex lastIndex
  WIDGET_PATTERN.lastIndex = 0

  let match
  while ((match = WIDGET_PATTERN.exec(response)) !== null) {
    const [fullMatch, widgetId, paramsJson] = match

    try {
      // Check if widget exists
      if (!WIDGET_REGISTRY[widgetId as WidgetId]) {
        errors.push(`Unknown widget: ${widgetId}`)
        continue
      }

      // Parse parameters
      const params = JSON.parse(paramsJson)
      const registry = WIDGET_REGISTRY[widgetId as WidgetId]

      // Validate parameters
      if (!registry.validateParams(params)) {
        errors.push(`Invalid params for ${widgetId}: ${JSON.stringify(params)}`)
        continue
      }

      // Add to widgets array
      widgets.push({
        id: widgetId as WidgetId,
        params
      })

      // Remove widget command from text
      text = text.replace(fullMatch, '')

    } catch (e) {
      errors.push(`Failed to parse widget command: ${fullMatch}`)
    }
  }

  // Log errors for debugging
  if (errors.length > 0) {
    console.warn('Widget parsing errors:', errors)
  }

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n').trim()

  return { text, widgets, errors }
}

/**
 * Render a widget command to a string (for AI context)
 */
export function renderWidgetCommand(widget: WidgetCommand): string {
  return `[WIDGET:${widget.id}|${JSON.stringify(widget.params)}]`
}

/**
 * Check if a widget ID is valid
 */
export function isValidWidgetId(id: string): id is WidgetId {
  return id in WIDGET_REGISTRY
}
