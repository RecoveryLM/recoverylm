# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm run dev           # Start Vite dev server with HMR (localhost:5173)
npm run build         # Production build (TypeScript + Vite)
npm run typecheck     # Check TypeScript types without emitting
npm run preview       # Preview production build locally
```

Always run `npm run typecheck` before committing changes.

## Environment Setup

Create `.env.local` with:
```
VITE_ANTHROPIC_API_KEY=your_api_key_here
```

## Architecture Overview

RecoveryLM is a privacy-first PWA for addiction recovery support. It uses a **local-first hybrid architecture** where the client (browser) is the source of truth and the cloud API is a stateless processor.

### Core Data Flow

```
User Input → Vue Component → useChat composable
    → useCrisis (pattern matching - MUST happen before API call)
    → [CRISIS CHECK: block/inject context/proceed]
    → useVault (encrypt & persist)
    → Orchestrator (build context window)
    → Anthropic Claude API (streaming)
    → widgetParser (extract [WIDGET:*] commands)
    → WidgetRenderer → useVault (persist response)
```

### Key Architectural Constraints

1. **Crisis detection runs BEFORE any API call** - Never bypass `useCrisis` assessment
2. **All user data is encrypted at rest** - Use vault service methods, never raw IndexedDB
3. **Client holds encryption key in memory** - API never receives decryption keys
4. **Widgets are embedded in AI responses** - Format: `[WIDGET:W_NAME|{json_params}]`

### Layer Responsibilities

- **`/src/composables/`**: State management hooks (useChat, useVault, useCrisis)
- **`/src/services/`**: Business logic (vault encryption, orchestrator context building, crisis detection)
- **`/src/services/inference/`**: Anthropic API integration (streaming, model config)
- **`/src/components/widgets/`**: Interactive CBT/SMART technique components
- **`/src/prompts/remmi.ts`**: AI companion system prompt

### Widget System

AI responses can include widget commands that render interactive components:
- `W_DENTS` - Urge surfing protocol
- `W_TAPE` - Play the tape through (consequences)
- `W_STOIC` - Dichotomy of control exercise
- `W_EVIDENCE` - CBT evidence examination
- `W_URGESURF` - Guided urge meditation
- `W_CHECKIN` - Daily metrics check-in
- `W_COMMITMENT` - View/edit commitment statement
- `W_NETWORK` - Support network management

### Type Definitions

All data models are in `/src/types/index.ts`. Key types:
- `UserProfile`: User settings, recovery stage, vulnerability pattern
- `DailyMetric`: Habit tracking (sobriety, exercise, mood, etc.)
- `ChatMessage`: Conversation messages with optional widgets and crisis level
- `CrisisAssessment`: Detection result with level and triggers

### Crisis Levels

- **EMERGENCY**: Suicidal ideation, self-harm → blocks flow, shows modal
- **URGENT**: Hopelessness → injects safety context
- **CONCERN**: Relapse indicators → adds context
- **MONITOR**: Urges, cravings → flags but allows

### Routing Guards

- `requiresAuth`: Redirects to `/unlock` if vault locked
- `requiresOnboarding`: Redirects to `/onboarding` if profile incomplete

## Tech Stack

- Vue 3.5 (Composition API) + TypeScript 5.6 (strict mode)
- Vite 6 + PWA plugin
- Pinia for state management
- Dexie.js for IndexedDB
- AES-GCM-256 encryption with PBKDF2 key derivation
- Anthropic SDK (claude-haiku-4-5 model)
- Tailwind CSS 3.4
