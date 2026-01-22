import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'

const app = express()
const PORT = process.env.PORT || 8080

// CORS configuration - update for production
// Supports comma or semicolon as delimiter for env var
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(/[,;]/).map(s => s.trim()) || [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://recoverylm.com',
  'https://www.recoverylm.com'
]

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true)
    }
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true
}))

app.use(express.json({ limit: '1mb' }))

// Rate limiting state (simple in-memory, use Redis for production scaling)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30 // 30 requests per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  record.count++
  return true
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip)
    }
  }
}, RATE_LIMIT_WINDOW_MS)

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Streaming messages endpoint
app.post('/v1/messages', async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown'

  // Rate limiting
  if (!checkRateLimit(clientIp)) {
    res.status(429).json({ error: 'Too many requests. Please wait a moment.' })
    return
  }

  const { model, max_tokens, system, messages, tools, stream } = req.body

  // Validate required fields
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'messages array is required' })
    return
  }

  // Force streaming for this proxy (non-streaming can be added if needed)
  if (stream === false) {
    res.status(400).json({ error: 'This proxy only supports streaming requests' })
    return
  }

  try {
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering
    res.flushHeaders()

    // Create streaming request to Anthropic using raw stream
    // This preserves the exact event order expected by the SDK
    const streamParams: Anthropic.MessageCreateParamsStreaming = {
      model: model || 'claude-sonnet-4-5',
      max_tokens: Math.min(max_tokens || 2048, 4096), // Cap max tokens
      messages,
      stream: true
    }

    if (system) {
      streamParams.system = system
    }

    if (tools && Array.isArray(tools)) {
      streamParams.tools = tools
    }

    // Use the raw streaming API to get SSE events in correct order
    const stream = await anthropic.messages.create(streamParams)

    // Forward each event exactly as received
    for await (const event of stream) {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
    }

    res.end()

  } catch (error) {
    console.error('Proxy error:', error)

    // If headers already sent, send error as SSE event
    if (res.headersSent) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      res.write(`event: error\ndata: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`)
      res.end()
    } else {
      const statusCode = (error as { status?: number })?.status || 500
      const errorMessage = error instanceof Error ? error.message : 'Internal server error'
      res.status(statusCode).json({ error: errorMessage })
    }
  }
})

// Handle client disconnect
app.use((_req, res, next) => {
  res.on('close', () => {
    // Client disconnected, cleanup if needed
  })
  next()
})

app.listen(PORT, () => {
  console.log(`RecoveryLM proxy server running on port ${PORT}`)
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`)
})
