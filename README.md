# RecoveryLM

**Privacy-first AI companion for addiction recovery**

![Privacy First](https://img.shields.io/badge/Privacy-First-green)
![Vue 3](https://img.shields.io/badge/Vue-3.5-42b883)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![PWA](https://img.shields.io/badge/PWA-Ready-purple)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## What is RecoveryLM?

RecoveryLM is a **privacy-first Progressive Web App** that provides AI-powered support for people in addiction recovery. It operationalizes the **Independent Recovery Framework (IRF)**, which integrates:

- **SMART Recovery** principles - Self-empowerment and evidence-based techniques
- **Cognitive Behavioral Therapy (CBT)** - Identifying automatic thoughts and cognitive distortions
- **Stoic Philosophy** - The dichotomy of control and the impression-to-assent gap
- **Structured Accountability** - Support networks and leading indicator tracking

The app features **Remi**, a warm but direct AI companion who helps users practice evidence-based skills, process difficult moments, and maintain awareness of their patterns—without the platitudes or toxic positivity.

---

## Why RecoveryLM Exists

### The Privacy Problem

Mental health and recovery apps handle the most sensitive data imaginable: your struggles, your triggers, your darkest moments. Most apps store this on their servers, creating a permanent record that could be breached, subpoenaed, or sold.

### Our Philosophy: Local-First, Zero-Knowledge

RecoveryLM takes a different approach:

- **Client as source of truth** - Your browser is the database. All data lives on your device.
- **Cloud as stateless processor** - The AI API receives only what's needed for the current conversation, processes it, and forgets it.
- **Zero-knowledge design** - We can't access your data because we never have it. Not encrypted on our servers—*not on our servers at all*.

Your encryption key exists only in your browser's memory. When you close the app, it's gone. Only your password (or recovery phrase) can bring it back.

---

## Key Features

### Crisis Detection
Safety checks run **before** any AI call. The system recognizes concerning patterns and responds appropriately:
- **Emergency** - Suicidal ideation → immediate intervention with resources
- **Urgent** - Hopelessness → injects safety context
- **Concern** - Relapse indicators → adds support context
- **Monitor** - Urges/cravings → flags but proceeds

### Interactive Widgets
Evidence-based CBT and SMART techniques embedded directly in the conversation:

| Widget | Purpose |
|--------|---------|
| **DENTS Protocol** | Deny/Delay, Escape, Neutralize, Tasks, Swap - for acute cravings |
| **Play the Tape** | Trace the full chain of consequences for rationalization |
| **Dichotomy of Control** | Distinguish what you can and can't control |
| **Evidence Examination** | Challenge cognitive distortions with evidence |
| **Urge Surfing** | Guided meditation for riding out urges |
| **Daily Check-In** | Track mood, habits, and sobriety |
| **Commitment Statement** | View and edit your personal commitment |
| **Support Network** | Manage and contact your accountability partners |

### Encrypted Vault
- **AES-GCM-256** encryption with **PBKDF2** key derivation (100,000 iterations)
- All data encrypted at rest in IndexedDB
- Key held in memory only—never persisted

### Recovery Phrase
- **12-word BIP39-style mnemonic** for self-sovereign data recovery
- If you forget your password, your recovery phrase restores access
- No "forgot password" email—*you* hold the keys

### Metrics Tracking
- Daily habit tracking (exercise, meditation, study, connection time, CBT practice)
- Mood and craving intensity monitoring
- Leading indicator detection for relapse prevention
- Sobriety streak tracking

### Support Network
- **Two-tier accountability system** - Core support (daily/weekly contact) and extended support (backup)
- Configurable authorities (drug tests, unannounced visits, automated alerts)
- Quick-contact integration during difficult moments

---

## Privacy Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Your Device                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │ Vue App     │ ←→ │ Encryption  │ ←→ │ IndexedDB       │ │
│  │ (Memory)    │    │ Layer       │    │ (Encrypted)     │ │
│  │             │    │ AES-GCM-256 │    │                 │ │
│  │ Key: 🔑     │    │             │    │ Ciphertext only │ │
│  └─────────────┘    └─────────────┘    └─────────────────┘ │
│         │                                                   │
│         │ Current conversation only (no decryption keys)   │
│         ▼                                                   │
└─────────────────────────────────────────────────────────────┘
          │
          │ HTTPS (conversation context only)
          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Anthropic API                             │
│                                                             │
│   • Stateless processing                                    │
│   • No conversation storage                                 │
│   • No decryption keys received                            │
│   • Processes request → returns response → forgets         │
└─────────────────────────────────────────────────────────────┘
```

**What the API never sees:**
- Your encryption password or recovery phrase
- Your decryption keys
- Your historical data (unless you explicitly search for it)
- Your personal identifiers (configurable)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Vue 3.5 (Composition API) |
| Language | TypeScript 5.6 (strict mode) |
| Build | Vite 6 + PWA plugin |
| State | Pinia |
| Database | Dexie.js (IndexedDB wrapper) |
| AI | Anthropic Claude API (claude-haiku-4-5) |
| Encryption | Web Crypto API (AES-GCM-256, PBKDF2) |
| Styling | Tailwind CSS 3.4 |
| Validation | Zod |

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- An [Anthropic API key](https://console.anthropic.com/)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/recoverylm.git
cd recoverylm

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
```

### Environment Setup

Edit `.env.local` with your Anthropic API key:

```
VITE_ANTHROPIC_API_KEY=your_api_key_here
```

### Running in Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build (TypeScript + Vite) |
| `npm run typecheck` | Check TypeScript types without emitting |
| `npm run preview` | Preview production build locally |

Always run `npm run typecheck` before committing changes.

---

## Contributing

Contributions are welcome. Please ensure:

1. TypeScript types are correct (`npm run typecheck` passes)
2. Code follows existing patterns and conventions
3. Privacy principles are maintained—no changes that would expose user data

---

## Disclaimer

**RecoveryLM is not a replacement for professional treatment.**

This app is designed to supplement—not replace—professional mental health care, therapy, or medical treatment. It is not a crisis line, therapist, or medical professional.

**If you are in immediate danger or experiencing a mental health emergency:**
- **National Suicide Prevention Lifeline**: 988 (US)
- **Crisis Text Line**: Text HOME to 741741
- **SAMHSA National Helpline**: 1-800-662-4357
- **Emergency Services**: 911

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with care for those doing the hard work of recovery.
