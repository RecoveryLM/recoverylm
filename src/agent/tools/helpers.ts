/**
 * Tool Helpers for RecoveryLM Agent
 *
 * SDK-aligned helper functions for defining and working with tools.
 * Uses Zod for input validation and type safety.
 */

import { z } from 'zod'
import type { ToolDefinition, ToolOutput, AnthropicTool } from '../types'

/**
 * Create a tool definition with Zod schema validation.
 * This is the primary way to define tools in the agent system.
 *
 * @example
 * ```ts
 * const myTool = tool({
 *   name: 'my_tool',
 *   description: 'Does something useful',
 *   inputSchema: z.object({
 *     query: z.string().describe('The search query'),
 *     limit: z.number().optional().default(10).describe('Max results')
 *   }),
 *   execute: async (input) => {
 *     // input is fully typed based on the schema
 *     return { success: true, data: results }
 *   }
 * })
 * ```
 */
export function tool<T extends z.ZodType>(config: {
  name: string
  description: string
  inputSchema: T
  execute: (input: z.infer<T>) => Promise<ToolOutput>
}): ToolDefinition<T> {
  return {
    name: config.name,
    description: config.description,
    inputSchema: config.inputSchema,
    execute: async (rawInput: z.infer<T>) => {
      // Validate and parse input through Zod
      const parseResult = config.inputSchema.safeParse(rawInput)
      if (!parseResult.success) {
        return {
          success: false,
          error: `Invalid input: ${parseResult.error.message}`
        }
      }
      return config.execute(parseResult.data)
    }
  }
}

/**
 * Get the Zod type name from a schema's internal definition
 */
function getZodTypeName(schema: z.ZodTypeAny): string {
  // Access the internal _def.typeName property
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (schema as any)._def?.typeName ?? 'ZodUnknown'
}

/**
 * Unwrap optional, nullable, and default wrappers from a Zod type
 */
function unwrapZodType(schema: z.ZodTypeAny): z.ZodTypeAny {
  const typeName = getZodTypeName(schema)

  if (typeName === 'ZodOptional' || typeName === 'ZodNullable') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return unwrapZodType((schema as any)._def.innerType)
  }

  if (typeName === 'ZodDefault') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return unwrapZodType((schema as any)._def.innerType)
  }

  return schema
}

/**
 * Convert a Zod schema to JSON Schema for Anthropic API.
 * Handles common Zod types and their descriptions.
 */
function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const typeName = getZodTypeName(schema)

  // Handle ZodObject (the main case)
  if (typeName === 'ZodObject') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shape = (schema as any)._def.shape() as Record<string, z.ZodTypeAny>
    const properties: Record<string, unknown> = {}
    const required: string[] = []

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodTypeToProperty(value)

      // Check if required (not optional, not nullable, has no default)
      if (!isOptional(value)) {
        required.push(key)
      }
    }

    return {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {})
    }
  }

  // Fallback for non-object schemas
  return zodTypeToProperty(schema)
}

/**
 * Convert a Zod type to a JSON Schema property
 */
function zodTypeToProperty(zodType: z.ZodTypeAny): Record<string, unknown> {
  const description = zodType.description

  // Unwrap optional/nullable/default wrappers
  const innerType = unwrapZodType(zodType)
  const typeName = getZodTypeName(innerType)

  // String
  if (typeName === 'ZodString') {
    return {
      type: 'string',
      ...(description ? { description } : {})
    }
  }

  // Number
  if (typeName === 'ZodNumber') {
    return {
      type: 'number',
      ...(description ? { description } : {})
    }
  }

  // Boolean
  if (typeName === 'ZodBoolean') {
    return {
      type: 'boolean',
      ...(description ? { description } : {})
    }
  }

  // Array
  if (typeName === 'ZodArray') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemType = (innerType as any)._def.type
    return {
      type: 'array',
      items: zodTypeToProperty(itemType),
      ...(description ? { description } : {})
    }
  }

  // Enum
  if (typeName === 'ZodEnum') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options = (innerType as any)._def.values
    return {
      type: 'string',
      enum: options,
      ...(description ? { description } : {})
    }
  }

  // Literal
  if (typeName === 'ZodLiteral') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (innerType as any)._def.value
    return {
      type: typeof value,
      enum: [value],
      ...(description ? { description } : {})
    }
  }

  // Union (for simple string unions)
  if (typeName === 'ZodUnion') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options = (innerType as any)._def.options as z.ZodTypeAny[]
    if (options.every(opt => getZodTypeName(opt) === 'ZodLiteral')) {
      return {
        type: 'string',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        enum: options.map(opt => (opt as any)._def.value),
        ...(description ? { description } : {})
      }
    }
  }

  // Fallback to string
  return {
    type: 'string',
    ...(description ? { description } : {})
  }
}

/**
 * Check if a Zod type is optional (has default, is optional, or is nullable)
 */
function isOptional(zodType: z.ZodTypeAny): boolean {
  const typeName = getZodTypeName(zodType)
  return (
    typeName === 'ZodOptional' ||
    typeName === 'ZodNullable' ||
    typeName === 'ZodDefault'
  )
}

/**
 * Convert a ToolDefinition to Anthropic API format
 */
export function toAnthropicTool(def: ToolDefinition): AnthropicTool {
  const jsonSchema = zodToJsonSchema(def.inputSchema)

  return {
    name: def.name,
    description: def.description,
    input_schema: jsonSchema as AnthropicTool['input_schema']
  }
}

/**
 * Create a success result
 */
export function success<T>(data: T): ToolOutput {
  return { success: true, data }
}

/**
 * Create an error result
 */
export function failure(error: string): ToolOutput {
  return { success: false, error }
}

/**
 * Format a tool result for sending back to the API
 */
export function formatToolResult(result: ToolOutput): string {
  if (!result.success) {
    return `Error: ${result.error}`
  }
  return JSON.stringify(result.data, null, 2)
}
