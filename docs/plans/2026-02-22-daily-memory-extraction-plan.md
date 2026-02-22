# Daily Memory Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add login-triggered LLM memory extraction so Remi accumulates persistent knowledge about the user across sessions.

**Architecture:** On vault unlock, check if a memory extraction is needed (last memory is before today). If so, asynchronously gather all activity since the last memory, send to Claude for structured extraction, and persist as an encrypted `DailyMemory` record. Both `buildGreetingContext()` and `buildContextWindow()` inject accumulated memories into the system prompt.

**Tech Stack:** Vue 3 composables, Dexie.js (IndexedDB), Anthropic SDK (claude-haiku-4-5), AES-GCM-256 encryption via vault

---

### Task 1: Add DailyMemory Type

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add the DailyMemory interface**

Add after the `MemoryItem` interface (~line 354):

```typescript
export interface DailyMemory {
  id: string
  date: string              // YYYY-MM-DD when this memory was created
  coveringFrom: string      // YYYY-MM-DD start of activity window
  coveringTo: string        // YYYY-MM-DD end of activity window
  conversationSummary?: string
  journalSummary?: string
  checkinSummary?: string
  userFacts: string[]
  followUps: string[]
  emotionalState: string
  notablePatterns: string[]
  createdAt: number
}
```

**Step 2: Add DailyMemory to the ContextWindow interface**

Add to `ContextWindow` interface (~line 356) a new optional field:

```typescript
  dailyMemories?: DailyMemory[]
```

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(memory): add DailyMemory type and ContextWindow field"
```

---

### Task 2: Add DailyMemory Table to Database

**Files:**
- Modify: `src/services/database.ts`

**Step 1: Add the encrypted storage type**

Add after `EncryptedDailyPracticeConfig` (~line 84):

```typescript
export interface EncryptedDailyMemory {
  id: string
  date: string           // YYYY-MM-DD, indexed for queries
  coveringTo: string     // indexed for finding latest
  data: EncryptedPayload // Encrypted DailyMemory
  createdAt: number
}
```

**Step 2: Add table declaration to RecoveryLMDatabase class**

Add to the class properties (~line 112):

```typescript
dailyMemories!: Table<EncryptedDailyMemory>
```

**Step 3: Add version 5 migration**

Add after the `this.version(4)` block (~line 174). Copy all existing stores from version 4 and add `dailyMemories`:

```typescript
this.version(5).stores({
  userProfile: 'id, updatedAt',
  emergencyContacts: 'id, updatedAt',
  supportNetwork: 'id, tier, updatedAt',
  dailyMetrics: 'date, updatedAt',
  journalEntries: 'id, sessionId, timestamp, *tags',
  chatMessages: 'id, sessionId, timestamp, role',
  therapistGuidance: 'id, category, active, updatedAt',
  metricsConfig: 'id, updatedAt',
  activityLogs: 'id, activityId, completedAt',
  dailyPracticeConfig: 'id, updatedAt',
  dailyMemories: 'id, date, coveringTo, createdAt',
  settings: 'key',
  metadata: 'key'
})
```

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/database.ts
git commit -m "feat(memory): add dailyMemories table to database schema"
```

---

### Task 3: Add Vault CRUD for DailyMemory

**Files:**
- Modify: `src/services/vault.ts`

**Step 1: Add import for DailyMemory type**

Add `DailyMemory` to the import from `@/types` at the top of the file (~line 8).

**Step 2: Add vault functions**

Add a new section after the Activity Logs section. Follow the existing patterns in the file (e.g. `getMetrics`, `saveMetric`):

```typescript
// ============================================
// Daily Memories
// ============================================

export async function getDailyMemories(options: {
  after?: string
  limit?: number
} = {}): Promise<DailyMemory[]> {
  const { key } = requireUnlocked()
  const db = getDatabase()

  let query = db.dailyMemories.orderBy('date').reverse()

  if (options.after) {
    query = query.filter(m => m.date >= options.after!)
  }
  if (options.limit) {
    query = query.limit(options.limit)
  }

  const entries = await query.toArray()
  const memories: DailyMemory[] = []

  for (const entry of entries) {
    const memory = await decryptObject<DailyMemory>(entry.data, key)
    memories.push(memory)
  }

  return memories
}

export async function getLatestDailyMemory(): Promise<DailyMemory | null> {
  const { key } = requireUnlocked()
  const db = getDatabase()

  const entry = await db.dailyMemories.orderBy('date').reverse().first()
  if (!entry) return null

  return decryptObject<DailyMemory>(entry.data, key)
}

export async function saveDailyMemory(memory: DailyMemory): Promise<void> {
  const { key, salt } = requireUnlocked()
  const db = getDatabase()

  const encrypted = await encryptObject(memory, key, salt)
  await db.dailyMemories.put({
    id: memory.id,
    date: memory.date,
    coveringTo: memory.coveringTo,
    data: encrypted,
    createdAt: memory.createdAt
  })
}

export async function getAllUserFacts(): Promise<string[]> {
  const memories = await getDailyMemories({ limit: 30 })
  // Accumulate facts, newer memories take priority (they already contain updated facts)
  if (memories.length === 0) return []
  // The most recent memory's userFacts should be the canonical set
  // since the extraction prompt includes previous facts for dedup
  return memories[0].userFacts
}
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/services/vault.ts
git commit -m "feat(memory): add vault CRUD for daily memories"
```

---

### Task 4: Create Memory Extraction Service

**Files:**
- Create: `src/services/memoryExtraction.ts`

**Step 1: Create the extraction service**

This service gathers raw activity data and sends it to Claude for structured extraction. It uses the Anthropic SDK directly (not the orchestrator/inference provider) since this is a background utility call, not a user-facing chat.

```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { DailyMemory, DailyMetric, JournalEntry, ChatMessage } from '@/types'
import { generateId, today } from '@/types'
import * as vault from './vault'

const EXTRACTION_MODEL = 'claude-haiku-4-5-20251001'

const PROXY_URL = import.meta.env.VITE_API_PROXY_URL as string | undefined
const USE_PROXY = !!PROXY_URL

function getClient(): Anthropic {
  if (USE_PROXY) {
    return new Anthropic({
      baseURL: PROXY_URL,
      apiKey: 'proxy-managed',
      dangerouslyAllowBrowser: true
    })
  }
  return new Anthropic({
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY as string,
    dangerouslyAllowBrowser: true
  })
}

interface RawActivity {
  chatMessages: ChatMessage[]
  journalEntries: JournalEntry[]
  metrics: DailyMetric[]
  previousFacts: string[]
}

async function gatherActivity(since: string): Promise<RawActivity> {
  const sinceTimestamp = new Date(since).getTime()

  const [metrics, journalEntries, recentSessionIds, previousFacts] = await Promise.all([
    vault.getMetrics({ after: since }),
    vault.getJournalEntries({ after: sinceTimestamp }),
    vault.getRecentSessions(20),
    vault.getAllUserFacts()
  ])

  // Load chat messages from sessions that started after the cutoff
  const chatMessages: ChatMessage[] = []
  for (const sessionId of recentSessionIds) {
    // Session IDs contain timestamp: session_{timestamp}_{random}
    const parts = sessionId.split('_')
    const sessionTimestamp = parseInt(parts[1], 10)
    if (sessionTimestamp >= sinceTimestamp) {
      const messages = await vault.getChatHistory(sessionId)
      chatMessages.push(...messages)
    }
  }

  return { chatMessages, journalEntries, metrics, previousFacts }
}

function buildExtractionPrompt(activity: RawActivity): string {
  const sections: string[] = []

  // Chat conversations
  if (activity.chatMessages.length > 0) {
    const chatLines = activity.chatMessages
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(m => `[${m.role}]: ${m.content.slice(0, 500)}`)
      .join('\n')
    sections.push(`## Conversations with Remi\n${chatLines}`)
  }

  // Journal entries
  if (activity.journalEntries.length > 0) {
    const journalLines = activity.journalEntries
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(e => `[${new Date(e.timestamp).toLocaleDateString()}] (tags: ${e.tags.join(', ') || 'none'}) ${e.content.slice(0, 400)}`)
      .join('\n')
    sections.push(`## Journal Entries\n${journalLines}`)
  }

  // Metrics
  if (activity.metrics.length > 0) {
    const metricLines = activity.metrics
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(m => {
        const parts = [`Date: ${m.date}`, `Mood: ${m.moodScore}/10`, `Sober: ${m.sobrietyMaintained}`]
        if (m.cravingIntensity !== undefined) parts.push(`Cravings: ${m.cravingIntensity}/10`)
        if (m.sleepQuality !== undefined) parts.push(`Sleep: ${m.sleepQuality}/10`)
        if (m.anxietyLevel !== undefined) parts.push(`Anxiety: ${m.anxietyLevel}/10`)
        if (m.notes) parts.push(`Notes: ${m.notes}`)
        const habits = [
          m.exercise && 'exercise', m.meditation && 'meditation',
          m.study && 'study', m.healthyEating && 'healthy eating',
          m.connectionTime && 'social connection', m.cbtPractice && 'CBT practice'
        ].filter(Boolean)
        if (habits.length > 0) parts.push(`Habits: ${habits.join(', ')}`)
        return parts.join(' | ')
      })
      .join('\n')
    sections.push(`## Daily Check-ins\n${metricLines}`)
  }

  // Previous facts for dedup
  if (activity.previousFacts.length > 0) {
    sections.push(`## Previously Known Facts About This User\n${activity.previousFacts.map(f => `- ${f}`).join('\n')}`)
  }

  return sections.join('\n\n')
}

const SYSTEM_PROMPT = `You are a memory extraction system for a recovery support app. Your job is to analyze a user's recent activity and extract structured memories.

You will receive the user's conversations with their AI companion Remi, journal entries, and daily check-in metrics.

Respond with ONLY valid JSON matching this schema:
{
  "conversationSummary": "Brief summary of what was discussed (or null if no conversations)",
  "journalSummary": "Brief summary of journal entries (or null if no entries)",
  "checkinSummary": "Brief summary of check-in trends (or null if no check-ins)",
  "userFacts": ["Durable facts about this person, e.g. 'Main trigger is work stress', 'Has a brother named Mike'. Include ALL previous facts that are still true, plus any new ones. Remove any that are now contradicted."],
  "followUps": ["Things to follow up on, e.g. 'Committed to trying meditation this week', 'Has therapy appointment on Thursday'"],
  "emotionalState": "How the user seemed emotionally during this period",
  "notablePatterns": ["Any patterns noticed, e.g. 'Cravings spike on weekends', 'Mood improves after exercise days'"]
}

Guidelines:
- Be concise. Each summary should be 1-3 sentences.
- userFacts should be durable truths, not transient states. Include the full updated list (previous facts + new - contradicted).
- followUps are time-sensitive items Remi should bring up.
- notablePatterns should only include clear patterns, not speculation.
- If a section has no data, use null for summaries and empty arrays for lists.`

export async function extractDailyMemory(coveringFrom: string): Promise<DailyMemory> {
  const coveringTo = today()
  const activity = await gatherActivity(coveringFrom)

  const hasActivity = activity.chatMessages.length > 0 ||
    activity.journalEntries.length > 0 ||
    activity.metrics.length > 0

  if (!hasActivity) {
    // No activity to extract — return a minimal memory preserving previous facts
    return {
      id: generateId(),
      date: coveringTo,
      coveringFrom,
      coveringTo,
      userFacts: activity.previousFacts,
      followUps: [],
      emotionalState: 'No activity recorded during this period',
      notablePatterns: [],
      createdAt: Date.now()
    }
  }

  const userContent = buildExtractionPrompt(activity)
  const client = getClient()

  const response = await client.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }]
  })

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => block.type === 'text' ? block.text : '')
    .join('')

  const extracted = JSON.parse(text)

  return {
    id: generateId(),
    date: coveringTo,
    coveringFrom,
    coveringTo,
    conversationSummary: extracted.conversationSummary ?? undefined,
    journalSummary: extracted.journalSummary ?? undefined,
    checkinSummary: extracted.checkinSummary ?? undefined,
    userFacts: extracted.userFacts ?? activity.previousFacts,
    followUps: extracted.followUps ?? [],
    emotionalState: extracted.emotionalState ?? 'Unknown',
    notablePatterns: extracted.notablePatterns ?? [],
    createdAt: Date.now()
  }
}

/**
 * Check if memory extraction is needed and run it if so.
 * Returns immediately — extraction runs asynchronously.
 */
export async function runMemoryExtractionIfNeeded(): Promise<void> {
  try {
    const latest = await vault.getLatestDailyMemory()
    const todayStr = today()

    if (latest && latest.date === todayStr) {
      // Already extracted today
      return
    }

    // Determine the start date for extraction
    const coveringFrom = latest ? latest.coveringTo : todayStr

    if (coveringFrom === todayStr) {
      // Nothing to extract (first day, no previous activity)
      return
    }

    const memory = await extractDailyMemory(coveringFrom)
    await vault.saveDailyMemory(memory)
    console.log(`Memory extraction complete: covering ${memory.coveringFrom} to ${memory.coveringTo}`)
  } catch (error) {
    // Non-blocking — log but don't disrupt the user
    console.error('Memory extraction failed:', error)
  }
}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/services/memoryExtraction.ts
git commit -m "feat(memory): add LLM-powered daily memory extraction service"
```

---

### Task 5: Trigger Extraction on Login

**Files:**
- Modify: `src/composables/useVault.ts`

**Step 1: Import the extraction function**

Add at the top of the file:

```typescript
import { runMemoryExtractionIfNeeded } from '@/services/memoryExtraction'
```

**Step 2: Fire extraction after unlock**

In the `unlock` function (~line 72-93), after `userProfile.value = await vault.getProfile()` on line 81, add the async extraction call. It must be fire-and-forget (non-blocking):

```typescript
        // Load user profile
        userProfile.value = await vault.getProfile()
        // Async memory extraction (non-blocking)
        runMemoryExtractionIfNeeded()
```

Note: no `await` — this runs in the background.

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/composables/useVault.ts
git commit -m "feat(memory): trigger async memory extraction on vault unlock"
```

---

### Task 6: Inject Memories into Orchestrator Context

**Files:**
- Modify: `src/services/orchestrator.ts`

**Step 1: Add vault import for daily memories**

The orchestrator already imports `* as vault from '@/services/vault'`. No new import needed, just use `vault.getDailyMemories()` and `vault.getAllUserFacts()`.

**Step 2: Add memory loading to `buildGreetingContext()`**

In the `Promise.all` block (~line 171), add two more parallel fetches:

```typescript
const [profile, metrics, guidance, recentSessionIds, activityData, previousSession, supportNetwork, dailyMemories, userFacts] = await Promise.all([
  vault.getProfile(),
  vault.getMetrics({ limit: 7 }),
  vault.getActiveGuidance(),
  vault.getRecentSessions(5),
  getActivityInsights(),
  getPreviousSessionSummary(),
  vault.getSupportNetwork(),
  vault.getDailyMemories({ limit: 5 }),
  vault.getAllUserFacts()
])
```

**Step 3: Add memory data to the returned ContextWindow**

In the return statement (~line 261), add the `dailyMemories` field:

```typescript
  return {
    ...existingFields,
    dailyMemories
  }
```

**Step 4: Add memory loading to `buildContextWindow()`**

Same pattern — add `vault.getDailyMemories({ limit: 5 })` and `vault.getAllUserFacts()` to the `Promise.all` block (~line 287). Add `dailyMemories` to the return object.

**Step 5: Add user facts to the greeting instruction**

In the greeting instruction string (~line 235), add a section for user facts if they exist:

```typescript
const userFactsSection = userFacts.length > 0
  ? `\n--- WHAT YOU KNOW ABOUT THIS USER ---\n${userFacts.map(f => `- ${f}`).join('\n')}\n`
  : ''
```

Insert `${userFactsSection}` into the greeting instruction between the activity section and the greeting guidelines.

**Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 7: Commit**

```bash
git add src/services/orchestrator.ts
git commit -m "feat(memory): inject daily memories and user facts into orchestrator context"
```

---

### Task 7: Render Memories in System Prompt

**Files:**
- Modify: `src/services/inference/anthropic.ts`

**Step 1: Add a daily memories section to `buildSystemPrompt()`**

After the recent session history section and before the support network section, add:

```typescript
// Daily memories and user facts
if (context.dailyMemories && context.dailyMemories.length > 0) {
  const memoryLines: string[] = ['## What You Know About This User']

  // User facts (from most recent memory)
  const latestMemory = context.dailyMemories[0]
  if (latestMemory.userFacts.length > 0) {
    memoryLines.push('### Key Facts')
    memoryLines.push(...latestMemory.userFacts.map(f => `- ${f}`))
  }

  // Follow-ups
  if (latestMemory.followUps.length > 0) {
    memoryLines.push('### Follow-ups')
    memoryLines.push(...latestMemory.followUps.map(f => `- ${f}`))
  }

  // Recent daily summaries (last 3 days with content)
  const recentSummaries = context.dailyMemories
    .filter(m => m.conversationSummary || m.journalSummary || m.checkinSummary)
    .slice(0, 3)

  if (recentSummaries.length > 0) {
    memoryLines.push('### Recent Activity Summaries')
    for (const mem of recentSummaries) {
      memoryLines.push(`**${mem.coveringFrom} to ${mem.coveringTo}:**`)
      if (mem.conversationSummary) memoryLines.push(`- Chat: ${mem.conversationSummary}`)
      if (mem.journalSummary) memoryLines.push(`- Journal: ${mem.journalSummary}`)
      if (mem.checkinSummary) memoryLines.push(`- Check-in: ${mem.checkinSummary}`)
      if (mem.emotionalState) memoryLines.push(`- Emotional state: ${mem.emotionalState}`)
    }
  }

  // Notable patterns
  if (latestMemory.notablePatterns.length > 0) {
    memoryLines.push('### Patterns')
    memoryLines.push(...latestMemory.notablePatterns.map(p => `- ${p}`))
  }

  contextSections.push(memoryLines.join('\n'))
}
```

**Step 2: Add metric notes to the existing metrics section**

In the metrics rendering section (~line 348), after the existing metric formatting, add daily notes:

```typescript
// Include daily notes
const withNotes = metrics.filter(m => m.notes)
if (withNotes.length > 0) {
  lines.push('Daily notes:')
  for (const m of withNotes) {
    lines.push(`- ${m.date}: ${m.notes}`)
  }
}
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/services/inference/anthropic.ts
git commit -m "feat(memory): render daily memories and metric notes in system prompt"
```

---

### Task 8: Update Remi's System Prompt About Memory

**Files:**
- Modify: `src/prompts/remmi.ts`

**Step 1: Update the memory instructions**

Find the `## CRITICAL: Memory and Tools` section (~line 169). Replace the blanket "You have NO persistent memory" statement with an accurate description:

```typescript
## CRITICAL: Memory and Context

You have a persistent memory system. Your context includes:
- **Key facts** you've learned about this user across all sessions
- **Recent activity summaries** (conversations, journal entries, check-ins)
- **Follow-up items** from previous sessions
- **Notable patterns** observed over time
- **Last 7 days of metrics** with daily notes

This context is automatically provided — you don't need to search for it. Use it naturally to show you know and remember the user.

For OLDER history beyond what's in your context, use the search tools:
- search_conversations: Find past chat messages by keyword
- get_metrics: Get metrics beyond the last 7 days
- search_journal: Find journal entries by tag

When the user references something not in your current context, use these tools proactively.
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/prompts/remmi.ts
git commit -m "feat(memory): update Remi system prompt to reflect persistent memory"
```

---

### Task 9: Manual Integration Test

**Step 1: Run the dev server**

Run: `npm run dev`

**Step 2: Test the full flow**

1. Open the app in a browser, create or unlock a vault
2. Complete onboarding (if new) or go to chat
3. Have a conversation with Remi mentioning some specific personal details (e.g. "My main trigger is work stress" or "I have a therapy appointment on Thursday")
4. Do a check-in with notes
5. Lock and re-unlock the vault (simulates next-day login)
6. Check browser console for `Memory extraction complete` log
7. Start a new chat — verify Remi's greeting reflects the extracted context
8. Ask Remi "What do you know about me?" — verify it references extracted facts

**Step 3: Run typecheck one final time**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Final commit if any fixes needed**
