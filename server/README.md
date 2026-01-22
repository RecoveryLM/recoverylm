# RecoveryLM API Proxy

A lightweight streaming proxy that sits between the RecoveryLM frontend and the Anthropic API. This allows the hosted version of RecoveryLM to work without users needing their own API keys.

## Why a Proxy?

The RecoveryLM frontend is a static site that runs entirely in the browser. To call the Anthropic API, it needs an API key. For self-hosters, they provide their own key. For the hosted version at recoverylm.com, this proxy holds the API key server-side and forwards requests.

## Features

- **Streaming support** — Full SSE streaming passthrough for real-time responses
- **Rate limiting** — Basic per-IP rate limiting (30 requests/minute)
- **CORS protection** — Only allows requests from configured origins
- **Minimal footprint** — Stateless, scales to zero on Cloud Run

## Local Development

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your Anthropic API key

# Run in development mode (with hot reload)
npm run dev
```

The server runs on `http://localhost:8080` by default.

## Deployment to Cloud Run

### Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed and authenticated
- A project created in GCP

### Deploy

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Build and deploy
gcloud run deploy recoverylm-proxy \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "ANTHROPIC_API_KEY=your_key_here,ALLOWED_ORIGINS=https://recoverylm.com,https://www.recoverylm.com"
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `PORT` | No | Server port (default: 8080) |
| `ALLOWED_ORIGINS` | No | Comma-separated allowed origins for CORS |

## API

### POST /v1/messages

Proxies requests to the Anthropic Messages API with streaming.

**Request body:** Same as [Anthropic Messages API](https://docs.anthropic.com/en/api/messages), with `stream: true` (required).

**Response:** Server-Sent Events (SSE) stream matching Anthropic's streaming format.

### GET /health

Returns `{ "status": "ok" }` for health checks.

## Security Notes

- The API key is stored as an environment variable, never in code
- CORS restricts which origins can make requests
- Rate limiting prevents abuse (adjust limits for production traffic)
- No user data is logged or stored — the proxy is stateless
