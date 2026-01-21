# System Design Specification: RecoveryLM (v1.1)

A Progressive Web App (PWA) designed to operationalize the Independent Recovery Framework (IRF).

---

## 1. Architectural Overview

The system follows a **Local-First Hybrid Architecture**. The user's device is the Source of Truth (The Vault), and the Cloud API is treated as a stateless Processor (The Brain).

### 1.1 High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (PWA)                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │    UI    │──│ Encrypt  │──│ IndexedDB│  │  Crisis Handler  │ │
│  │  (React) │  │  Layer   │  │ (Vault)  │  │  (Pre-API Gate)  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
│        │                           │                │            │
│        └───────────┬───────────────┘                │            │
│                    │                                │            │
│              ┌─────▼─────┐                          │            │
│              │Orchestrator│◄─────────────────────────┘            │
│              │(Pre-frontal│                                       │
│              │  Cortex)   │                                       │
│              └─────┬─────┘                                       │
└────────────────────┼─────────────────────────────────────────────┘
                     │ Context Window
                     ▼
           ┌─────────────────┐
           │  Inference API  │
           │ (Zero Retention)│
           │ Claude/GPT/etc  │
           └─────────────────┘
```

### 1.2 Core Principles

1. **Privacy by Architecture**: All user data encrypted locally; cloud sees only inference requests
2. **Framework-Driven**: Every feature maps to Independent Recovery Framework principles
3. **Graceful Degradation**: System functions offline; AI enhances but isn't required
4. **Safety First**: Crisis detection happens before any API call

---

## 2. Component Specifications

### 2.1 Frontend Client (The Shell)

**Platform**: Progressive Web App (PWA) installable on Desktop (Windows/Mac) and Mobile (iOS/Android)

**Framework**: Vue 3 + TypeScript (Composition API)

**State Management**: Pinia for application state, Dexie.js (IndexedDB wrapper) for local-first persistence

**Key Modules**:
- `ChatInterface`: Primary interaction surface
- `WidgetRenderer`: Renders structured exercises from AI commands
- `MetricsTracker`: Daily habit tracking and visualization
- `CrisisHandler`: Safety gate before API transmission

### 2.2 Data Persistence Layer (The Vault)

All user data stored in browser's IndexedDB, encrypted at rest.

**Encryption**: 
- Algorithm: AES-GCM-256
- Key Derivation: PBKDF2 from user password (100,000 iterations)
- The server never receives the encryption key

**Recovery Options**:
- Optional recovery phrase (12-word mnemonic) generated at onboarding
- Clear warning: "If you lose your password and recovery phrase, your data cannot be recovered. This protects your privacy—no one, including us, can access your data."
- Optional encrypted cloud backup (user holds keys, server holds encrypted blob)

**Data Schema (Core Entities)**:

```typescript
// User identity and preferences
interface UserProfile {
  id: string;
  displayName: string;
  createdAt: number;
  philosophy: 'SMART' | 'RecoveryDharma' | '12Step' | 'Secular' | 'Other';
  substancesOfFocus: string[];
  recoveryStage: 'considering' | 'early' | 'established' | 'maintenance';
  vulnerabilityPattern: 'craving' | 'rationalization' | 'both';
  commitmentStatement: string;
  onboardingComplete: boolean;
}

// Emergency and support contacts
interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  canBeNotifiedInCrisis: boolean;
}

// Support network with IRF tier structure
interface SupportNetwork {
  tier1: SupportPerson[]; // Core Support - daily/weekly contact, intervention authority
  tier2: SupportPerson[]; // Extended Support - aware, available as backup
  primaryPartner: string | null; // ID of primary accountability partner
  backupPartner: string | null;  // ID of backup partner
}

interface SupportPerson {
  id: string;
  name: string;
  relationship: string;
  contactMethod: 'phone' | 'email' | 'text';
  contactInfo: string;
  grantedAuthority: {
    canRequestDrugTest: boolean;
    canShowUpUnannounced: boolean;
    canInitiateGroupResponse: boolean;
    canReceiveAutomatedAlerts: boolean;
  };
}

// Daily metrics tracking
interface DailyMetric {
  date: string; // YYYY-MM-DD
  sobrietyMaintained: boolean;
  exercise: boolean;
  meditation: boolean;
  study: boolean;
  healthyEating: boolean;
  connectionTime: boolean;
  cbtPractice: boolean;
  moodScore: number; // 1-10
  notes?: string;
}

// Journal entries with semantic tagging
interface JournalEntry {
  id: string;
  timestamp: number;
  sessionId: string; // Groups entries within a conversation session
  content: string; // Encrypted
  entryType: 'user' | 'assistant' | 'system';
  tags: JournalTag[];
  sentiment?: 'positive' | 'neutral' | 'negative' | 'crisis';
  exerciseCompleted?: string; // Widget ID if an exercise was completed
}

type JournalTag = 
  | 'craving' 
  | 'rationalization' 
  | 'trigger' 
  | 'gratitude' 
  | 'relapse' 
  | 'victory'
  | 'therapy-prep'
  | 'urge-surfed'
  | 'distortion-caught';

// Therapist/professional integration
interface TherapistGuidance {
  id: string;
  addedAt: number;
  source: string; // e.g., "Dr. Smith, session 12/15"
  guidance: string;
  category: 'boundary' | 'technique' | 'warning' | 'goal';
  active: boolean;
}
```

### 2.3 Crisis Handler (Safety Gate)

The Crisis Handler operates **before** any API call, ensuring safety checks happen client-side.

**Two-Stage Detection**:

```typescript
interface CrisisAssessment {
  level: 'none' | 'monitor' | 'concern' | 'urgent' | 'emergency';
  triggers: string[];
  recommendedAction: CrisisAction;
}

type CrisisAction = 
  | 'proceed'           // No concerns, continue to API
  | 'inject-context'    // Add safety context to prompt
  | 'gentle-checkin'    // AI should check in about wellbeing
  | 'show-resources'    // Display crisis resources before proceeding
  | 'pause-and-connect' // Pause, show resources, offer to notify contact
  | 'emergency-protocol'; // Immediate intervention
```

**Stage 1: Pattern Matching** (instant, no API)
- Keyword/phrase detection for explicit self-harm language
- Recent message velocity (many messages in short time may indicate crisis)
- Time-of-day patterns (if user's history shows 2am as high-risk)

**Stage 2: AI Classification** (fast, dedicated safety call)
- If Stage 1 flags concern, make a separate, lightweight API call specifically for safety assessment
- Prompt: "Assess the following message for self-harm risk. Respond with JSON: {level, reasoning}"
- This runs in parallel with context building, minimizing latency

**Response Protocol by Level**:

| Level | Response |
|-------|----------|
| `none` | Proceed normally |
| `monitor` | Inject "user may be struggling" into system context |
| `concern` | AI response includes gentle check-in; log for pattern detection |
| `urgent` | Show resources modal; AI engages supportively; offer to notify emergency contact |
| `emergency` | Block normal flow; display crisis resources prominently; offer one-click notification to emergency contact; provide crisis line numbers |

**Critical Distinction**:
- "I'm having thoughts about self-harm" → `urgent`: Engage supportively, provide resources, offer contact notification
- "I'm about to hurt myself" → `emergency`: Immediate resources, strong encouragement to call crisis line or notify contact
- Never abandon the user. Even in `emergency`, maintain connection while providing resources.

### 2.4 AI Orchestrator (The Pre-frontal Cortex)

The Orchestrator assembles the context window for each API request.

**Context Injection Strategy**:

```typescript
interface ContextWindow {
  // 1. Static Context (from UserProfile)
  systemPrompt: string;           // RecoveryLM personality and IRF framework
  commitmentStatement: string;    // User's personal commitment
  vulnerabilityPattern: string;   // Craving vs rationalization focus
  therapistGuidance: string[];    // Active professional guidance
  
  // 2. Dynamic Context (queried from Vault)
  recentMetrics: DailyMetric[];   // Last 7 days of metrics
  leadingIndicators: string[];    // Calculated warnings from metrics
  recentConversation: Message[];  // Current session history
  relevantHistory: JournalEntry[]; // Semantically similar past entries
  temporalContext: TemporalContext;
  
  // 3. User Input
  currentMessage: string;
}

interface TemporalContext {
  localTime: string;           // "Tuesday, 11:47 PM"
  daysSober: number;
  currentStreak: StreakInfo;
  timePatterns: TimePattern[]; // e.g., "User often struggles on Sunday evenings"
}
```

**Leading Indicator Detection**:

```typescript
function detectLeadingIndicators(metrics: DailyMetric[]): string[] {
  const indicators: string[] = [];
  
  // Check for consecutive missed habits
  const last3Days = metrics.slice(-3);
  const missedExercise = last3Days.filter(d => !d.exercise).length;
  const missedMeditation = last3Days.filter(d => !d.meditation).length;
  
  if (missedExercise >= 2) {
    indicators.push("Exercise missed 2+ days - potential drift indicator");
  }
  if (missedMeditation >= 2) {
    indicators.push("Meditation missed 2+ days - potential drift indicator");
  }
  
  // Check mood trajectory
  const moodTrend = calculateMoodTrend(metrics.slice(-7));
  if (moodTrend === 'declining') {
    indicators.push("Mood trending downward over past week");
  }
  
  // Check for metric tracking gaps (not logging = warning sign)
  const daysSinceLastLog = daysBetween(metrics[metrics.length - 1]?.date, today());
  if (daysSinceLastLog >= 2) {
    indicators.push(`No metrics logged for ${daysSinceLastLog} days`);
  }
  
  return indicators;
}
```

**Semantic History Retrieval**:

When the user mentions a trigger, person, or situation, query past journal entries for relevant context:

```typescript
async function getRelevantHistory(
  currentMessage: string, 
  vault: Vault,
  limit: number = 3
): Promise<JournalEntry[]> {
  // Extract key entities/topics from current message
  const topics = await extractTopics(currentMessage);
  
  // Search journal entries by tag and content similarity
  const relevant = await vault.journalEntries
    .filter(entry => 
      entry.tags.some(tag => topics.includes(tag)) ||
      calculateSimilarity(entry.content, currentMessage) > 0.7
    )
    .sortBy('relevanceScore')
    .limit(limit);
    
  return relevant;
}
```

### 2.5 Provider Abstraction Layer

Abstract the inference provider to allow swapping between services:

```typescript
interface InferenceProvider {
  name: string;
  sendMessage(context: ContextWindow): Promise<InferenceResponse>;
  checkHealth(): Promise<boolean>;
}

interface InferenceResponse {
  text: string;
  widgets: WidgetCommand[];
  metadata: {
    tokensUsed: number;
    latencyMs: number;
  };
}

// Implementations
class AnthropicProvider implements InferenceProvider { ... }
class OpenAIProvider implements InferenceProvider { ... }
class LocalModelProvider implements InferenceProvider { ... }
```

---

## 3. The Generative UI Engine

The AI returns structured commands that render pre-built Vue components, ensuring reliability while allowing contextual customization.

### 3.1 Command Protocol

AI responses are parsed for widget commands embedded in the text.

**Format**: `[WIDGET:<WIDGET_ID>|<JSON_PARAMETERS>]`

**Example**:
```
I hear that you're feeling a strong urge right now. Let's work through this together using the DENTS protocol.

[WIDGET:W_DENTS|{"trigger":"stress from work deadline","intensity":7}]

Remember, this urge will pass. You've surfed urges before and you can do it again.
```

### 3.2 Widget Library

Pre-built components mapped to IRF exercises:

| Widget ID | Name | IRF Source | Description | Parameters |
|-----------|------|------------|-------------|------------|
| `W_DENTS` | DENTS Protocol | Urge Management | Timer-based checklist for acute cravings: Deny/Delay, Escape, Neutralize, Tasks, Swap | `trigger: string`, `intensity: number` |
| `W_TAPE` | Play the Tape | Rationalization Defense | Stepper form walking through consequences | `trigger: string`, `currentThought: string` |
| `W_STOIC` | Dichotomy of Control | Stoic Practice | Two-column exercise: "In My Control" vs "Not In My Control" | `situation: string` |
| `W_EVIDENCE` | Evidence Examination | CBT | 4-quadrant grid: Thought / Evidence For / Evidence Against / Balanced View | `thought: string`, `distortion?: string` |
| `W_URGESURF` | Urge Surfing | Distress Tolerance | Guided meditation with timer for riding out urges | `duration: number` |
| `W_CHECKIN` | Daily Check-in | Metrics | Quick entry form for daily metrics | `date: string` |
| `W_COMMITMENT` | Commitment Review | IRF Foundation | Display and reflect on personal commitment statement | `mode: 'view' | 'edit'` |
| `W_NETWORK` | Support Network | Accountability | View/manage support network contacts | `action: 'view' | 'notify' | 'edit'` |

### 3.3 Widget Rendering with Error Handling

```typescript
interface WidgetCommand {
  id: string;
  params: Record<string, unknown>;
}

function parseWidgetCommands(response: string): {
  text: string;
  widgets: WidgetCommand[];
  errors: string[];
} {
  const widgetPattern = /\[WIDGET:(\w+)\|({.*?})\]/g;
  const widgets: WidgetCommand[] = [];
  const errors: string[] = [];
  
  let text = response;
  let match;
  
  while ((match = widgetPattern.exec(response)) !== null) {
    const [fullMatch, widgetId, paramsJson] = match;
    
    try {
      // Validate widget exists
      if (!WIDGET_REGISTRY[widgetId]) {
        errors.push(`Unknown widget: ${widgetId}`);
        continue;
      }
      
      // Parse and validate parameters
      const params = JSON.parse(paramsJson);
      const validation = WIDGET_REGISTRY[widgetId].validateParams(params);
      
      if (!validation.valid) {
        errors.push(`Invalid params for ${widgetId}: ${validation.error}`);
        continue;
      }
      
      widgets.push({ id: widgetId, params });
      text = text.replace(fullMatch, ''); // Remove command from display text
      
    } catch (e) {
      errors.push(`Failed to parse widget command: ${fullMatch}`);
    }
  }
  
  // Log errors for debugging but don't fail—always show text response
  if (errors.length > 0) {
    console.warn('Widget parsing errors:', errors);
  }
  
  return { text: text.trim(), widgets, errors };
}
```

**Graceful Fallback**: If widget rendering fails, the text response is always displayed. Users never see a blank screen.

---

## 4. Onboarding Flow

Onboarding establishes the relationship, collects essential information, and introduces the framework. It must feel conversational, not like a form.

### 4.1 Onboarding State Machine

```typescript
type OnboardingStep = 
  | 'welcome'
  | 'disclaimer'
  | 'name'
  | 'philosophy'
  | 'substance'
  | 'stage'
  | 'vulnerability'
  | 'emergency-contact'
  | 'primary-support'
  | 'backup-support'
  | 'commitment'
  | 'security-setup'
  | 'complete';

interface OnboardingState {
  currentStep: OnboardingStep;
  collectedData: Partial<UserProfile & SupportNetwork>;
  canSkip: boolean; // Some steps are required, some optional
}
```

### 4.2 Conversational Flow

Each step is driven by Remmi (the AI persona) with natural conversation.

**Step 1: Welcome**
```
Remmi: Hello. I'm Remmi, and I'm here to support you in your recovery journey. 
       What would you like me to call you?

[Text input]
```

**Step 2: Disclaimer**
```
Remmi: Hello, {name}. Before we begin, I want to be clear about what I am 
       and what I'm not.

       I am not a doctor, therapist, or replacement for professional help. 
       I'm a supportive tool—think of me as a knowledgeable companion who's 
       always available to help you practice the skills that support recovery.

       If I ever sense you may be in danger, I may suggest reaching out to 
       your support network or provide crisis resources. Your safety comes first.

       Does that make sense?

[Continue button]
```

**Step 3: Philosophy**
```
Remmi: Different people connect with different approaches to recovery. 
       Which of these resonates most with you?

       • SMART Recovery — Science-based, focuses on self-empowerment and 
         cognitive-behavioral techniques
       • Recovery Dharma — Buddhist-inspired, meditation-focused
       • 12-Step Programs — AA/NA tradition, spiritual foundation
       • Secular/Independent — Non-affiliated, evidence-based
       • I'm not sure yet — We can explore together

[Selection cards]
```

**Step 4: Substance Focus**
```
Remmi: What substance or behavior are you working on? 
       You can share as much or as little as you're comfortable with.

       This helps me understand your journey, but we can always adjust this later.

[Text input with common suggestions: Alcohol, Cannabis, Opioids, Stimulants, 
 Gambling, Other]
```

**Step 5: Recovery Stage**
```
Remmi: Where would you say you are in your recovery journey right now?

       • Considering — Thinking about making a change
       • Early Recovery — Days to weeks, building foundation
       • Established — Months in, working on maintenance
       • Long-term — Years of recovery, deepening the work

[Selection cards]
```

**Step 6: Vulnerability Pattern**
```
Remmi: People tend to struggle in different ways. Which sounds more like you?

       • Acute Cravings — Intense urges that demand immediate relief. 
         The challenge is riding them out.
       
       • Rationalization — You handle urges okay, but persuasive internal 
         arguments ("I've earned this," "Just this once") emerge when 
         things are going well.
       
       • Both — You experience both patterns

       Understanding your pattern helps me support you more effectively.

[Selection cards with descriptions]
```

**Step 7: Emergency Contact** (Required)
```
Remmi: I need one emergency contact—someone I can suggest you reach out to 
       if I'm ever concerned about your safety.

       This person should be someone you trust who knows about your recovery.
       I won't contact them without your knowledge except in a true emergency,
       and even then, I'll let you know.

       Who should this be?

[Form: Name, Relationship, Phone, Email (optional)]
```

**Step 8: Primary Support Partner** (Recommended)
```
Remmi: In the Independent Recovery Framework, a primary support partner is 
       someone who checks in regularly and has your permission to ask hard 
       questions.

       This could be a spouse, close friend, sponsor, or anyone you trust 
       to hold you accountable.

       Would you like to add a primary support partner now?

[Form or "Skip for now"]
```

**Step 9: Backup Support** (Optional)
```
Remmi: A backup partner shares the accountability load when your primary 
       partner isn't available. They provide a second perspective.

       Would you like to add a backup support partner?

[Form or "Skip for now"]
```

**Step 10: Commitment Statement**
```
Remmi: Let's create your commitment statement. This is a personal declaration 
       of why you're doing this and what you're committing to.

       I'll help you write it. Let's start here:

       Why does recovery matter to you? Who are you doing this for? 
       What future are you building toward?

[Large text area with guided prompts]

Remmi: [After user writes] Here's what I heard in your words:
       [AI summarizes and structures into commitment statement]
       
       Does this capture it? We can refine it together.
```

**Step 11: Security Setup**
```
Remmi: One more important step: protecting your privacy.

       Everything you share with me is encrypted on your device. 
       I can't read it, and neither can anyone else—including the company 
       that made me.

       To protect your data, you'll create a password. If you ever forget it, 
       a recovery phrase can help you get back in.

       Important: If you lose both your password and recovery phrase, 
       your data cannot be recovered. This is a feature, not a bug—it means 
       no one can ever access your most personal thoughts.

[Password creation + optional recovery phrase generation]
```

**Step 12: Complete**
```
Remmi: You're all set, {name}.

       Here's what we've established:
       • Your recovery philosophy: {philosophy}
       • Your primary focus: {substance}
       • Your vulnerability pattern: {pattern}
       • Emergency contact: {contact_name}
       • Primary support: {support_name or "Not yet added"}
       
       Your commitment:
       "{commitment_statement}"

       I'm here whenever you need to talk, work through an urge, 
       practice a skill, or just check in.

       What would you like to do first?

[Suggested actions: "Just chat", "Log today's metrics", "Learn about DENTS", 
 "Explore the tools"]
```

### 4.3 Onboarding Data Validation

```typescript
interface OnboardingValidation {
  required: {
    displayName: true;
    emergencyContact: true;
    securitySetup: true;
  };
  recommended: {
    philosophy: true;
    vulnerabilityPattern: true;
    primarySupport: true;
    commitmentStatement: true;
  };
  optional: {
    substancesOfFocus: true;
    recoveryStage: true;
    backupSupport: true;
  };
}
```

---

## 5. Workflows & Algorithms

### 5.1 The Triage Algorithm

When the user submits text, the system follows this logic path:

```
┌─────────────────┐
│  User Message   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Crisis Handler  │────►│ Emergency Modal │ (if emergency)
│ (Stage 1: Local)│     │ + Resources     │
└────────┬────────┘     └─────────────────┘
         │ (if not emergency)
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Crisis Handler  │────►│ Inject Safety   │ (if concern)
│ (Stage 2: AI)   │     │ Context         │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│ Leading Indicator│
│ Detection        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Build Context   │
│ Window          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Inference API   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Parse Response  │
│ (Text + Widgets)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Render UI       │
└─────────────────┘
```

### 5.2 Intent Classification (AI-Side)

The system prompt instructs the AI to classify user intent and respond appropriately:

| Intent | Indicators | Response Pattern |
|--------|------------|------------------|
| Acute Craving | "I want to use", "craving", "can't stop thinking about" | Empathize → Offer `W_DENTS` → Support through |
| Rationalization | "I've earned it", "just once", "I can control it now" | Name the pattern → Offer `W_TAPE` → Challenge gently |
| Distress/Venting | Emotional language, life stressors | Validate → Listen → Offer `W_STOIC` if appropriate |
| Cognitive Distortion | Catastrophizing, all-or-nothing, mind reading | Identify distortion → Offer `W_EVIDENCE` |
| Check-in | "How am I doing", metrics questions | Review recent data → Highlight patterns → Encourage |
| Information | Questions about techniques, framework | Explain clearly → Offer to practice together |
| Therapy Prep | "I have a session", "preparing for therapist" | Trigger Therapist Dump workflow |

### 5.3 The Therapist Dump Workflow

A feature to bridge the app with professional support.

```typescript
async function generateTherapistSummary(
  vault: Vault, 
  daysBack: number = 7
): Promise<TherapistSummary> {
  // 1. Retrieve recent data
  const entries = await vault.getJournalEntries({ 
    after: daysAgo(daysBack) 
  });
  const metrics = await vault.getDailyMetrics({ 
    after: daysAgo(daysBack) 
  });
  
  // 2. Build summary prompt
  const summaryPrompt = `
    Summarize the following journal entries and metrics for a therapy session.
    Focus on:
    - Key themes and patterns
    - Significant events or triggers
    - Progress and challenges
    - Mood trajectory
    - Questions or topics worth discussing
    
    Keep it concise—this is a starting point for conversation, not a report.
    Do not include raw journal content; summarize themes only.
  `;
  
  // 3. Generate summary via AI
  const summary = await inferenceProvider.sendMessage({
    systemPrompt: summaryPrompt,
    content: formatForSummary(entries, metrics)
  });
  
  // 4. Return structured output
  return {
    periodCovered: `${daysBack} days`,
    themes: summary.themes,
    moodTrend: calculateMoodTrend(metrics),
    significantEvents: summary.events,
    suggestedTopics: summary.topics,
    rawMetricsSummary: summarizeMetrics(metrics)
  };
}
```

**Output**: Clean text block or PDF for user to share with therapist.

### 5.4 Status Report for Support Network

Export a summary for accountability partners:

```typescript
interface StatusReport {
  generatedAt: string;
  sobrietyStreak: number;
  weeklyMetrics: {
    exerciseDays: number;
    meditationDays: number;
    avgMoodScore: number;
  };
  highlights: string[];  // Positive patterns
  concerns: string[];    // Leading indicators, if any
  message?: string;      // Optional personal note from user
}
```

Shareable via:
- Copy to clipboard
- Email (opens native email client)
- SMS (opens native messaging)

---

## 6. Security & Privacy Controls

### 6.1 Zero Data Retention

- Inference API configured with `retention=0` / no-logging policy
- No user data transmitted except for inference context
- Context window is ephemeral—not stored by provider

### 6.2 Local Encryption

- AES-GCM-256 encryption for all stored data
- Key derived from user password via PBKDF2
- Optional recovery phrase for password reset
- If user loses password and recovery phrase, data is unrecoverable by design

### 6.3 User Controls

| Control | Description |
|---------|-------------|
| Delete Conversation | Remove specific chat sessions |
| Delete All Data | Complete wipe of local storage |
| Pause History | Temporarily stop logging (useful for sensitive conversations) |
| Export Data | Download encrypted backup |
| Panic Button | One-click complete data wipe |

### 6.4 Anonymization

- No PII sent to inference API by default
- Names replaced with placeholders in context: "[Partner]", "[Therapist]", "[Friend1]"
- User can toggle "Include names" for more natural conversation

---

## 7. Notification System (Future)

For accountability features, optional server-side component:

```typescript
interface NotificationConfig {
  enabled: boolean;
  triggers: {
    noLoginDays: number;      // Notify after N days without app use
    missedMetricsDays: number; // Notify after N days without logging
    userRequested: boolean;    // User can request check-in notifications
  };
  recipients: {
    self: boolean;             // Push notification to user
    primarySupport: boolean;   // Alert primary support partner
  };
}
```

**Privacy Consideration**: This requires a server component that knows enough to send notifications. Could be implemented as:
- Optional feature, disabled by default
- Minimal server-side: only stores notification preferences and last-seen timestamp
- User-controlled: can enable/disable per notification type

---

## 8. Technical Stack Summary

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Frontend Framework | Vue 3 + TypeScript | Clean syntax, Composition API, AI agents fluent |
| State Management | Pinia | Official Vue state management, TypeScript-native |
| Local Storage | Dexie.js (IndexedDB) | Simple, powerful, local-first |
| Encryption | Web Crypto API (AES-GCM) | Native browser support, no dependencies |
| Styling | Tailwind CSS | Rapid development, consistent design |
| PWA | Vite PWA Plugin | Service worker management, offline support |
| Inference | Anthropic Claude API (primary) | Best reasoning, safety-aware |
| Build | Vite | Fast development, Vue-native, optimized production |

---

## 9. File Structure

```
recoverylm/
├── public/
│   ├── manifest.json          # PWA manifest
│   └── icons/                  # App icons
├── src/
│   ├── components/
│   │   ├── chat/               # Chat interface components
│   │   │   ├── ChatWindow.vue
│   │   │   ├── MessageBubble.vue
│   │   │   └── InputBar.vue
│   │   ├── widgets/            # IRF exercise widgets
│   │   │   ├── DentsWidget.vue
│   │   │   ├── TapeWidget.vue
│   │   │   ├── StoicWidget.vue
│   │   │   └── EvidenceWidget.vue
│   │   ├── onboarding/         # Onboarding flow components
│   │   ├── metrics/            # Daily tracking components
│   │   │   ├── StreakCard.vue
│   │   │   ├── RiskAnalysis.vue
│   │   │   └── DailyChecklist.vue
│   │   ├── dashboard/          # Command Center components
│   │   └── common/             # Shared UI components
│   ├── composables/
│   │   ├── useVault.ts         # IndexedDB + encryption
│   │   ├── useChat.ts          # Chat state and logic
│   │   ├── useMetrics.ts       # Metrics tracking
│   │   └── useWidgets.ts       # Widget parsing + registry
│   ├── services/
│   │   ├── vault.ts            # IndexedDB + encryption implementation
│   │   ├── orchestrator.ts     # Context window assembly
│   │   ├── crisisHandler.ts    # Safety gate
│   │   └── inference/          # Provider implementations
│   │       ├── types.ts
│   │       ├── anthropic.ts
│   │       └── openai.ts
│   ├── stores/
│   │   ├── user.ts             # User profile store (Pinia)
│   │   ├── chat.ts             # Chat state store
│   │   └── metrics.ts          # Metrics store
│   ├── views/
│   │   ├── CommandCenter.vue
│   │   ├── ChatView.vue
│   │   ├── OnboardingView.vue
│   │   └── SettingsView.vue
│   ├── prompts/
│   │   └── system.ts           # RecoveryLM system prompt
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces
│   ├── router/
│   │   └── index.ts            # Vue Router config
│   ├── App.vue
│   └── main.ts
├── scripts/
│   └── generate-recovery-phrase.ts
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## 10. Success Metrics

How we know RecoveryLM is working:

**Engagement**
- Daily active users returning consistently
- Average session length indicating meaningful engagement
- Completion rate of exercises/widgets

**Efficacy Indicators** (user-reported, private)
- Sobriety streak lengths over time
- Urges successfully surfed (tagged entries)
- Leading indicator frequency decreasing

**Safety**
- Crisis protocol activations (should be rare but functional)
- Zero harmful outcomes from app use

**User Satisfaction**
- Qualitative feedback
- Continued use over months

---

*Document Version: 1.1*  
*Framework: Independent Recovery Framework (IRF)*  
*Last Updated: January 2025*
