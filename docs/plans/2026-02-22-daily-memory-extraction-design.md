# Daily Memory Extraction Design

## Problem

Remi starts each session as a blank slate. Despite existing context infrastructure (7-day metrics, 2 session summaries, keyword-based memory search), Remi lacks persistent knowledge about the user — their triggers, preferences, life events, goals, and conversational history. Users experience this as Remi not knowing them.

## Solution

Login-triggered, LLM-powered memory extraction that processes all unmemorized activity into structured daily memories stored in the vault.

## Trigger & Flow

1. On vault unlock, query the most recent `DailyMemory` record
2. If none exists or its date is before today, extraction is needed
3. Kick off extraction **asynchronously** (non-blocking — user proceeds immediately)
4. Gather all activity since the last memory's date: chat sessions, journal entries, check-in metrics
5. Send to Claude with a structured extraction prompt, including previous `userFacts` for dedup
6. Persist result as a new encrypted `DailyMemory` in the vault

Remi's greeting uses existing memories. The new memory becomes available for subsequent messages in the same session.

## Data Model

```typescript
interface DailyMemory {
  id: string
  date: string              // YYYY-MM-DD when memory was created
  coveringFrom: string      // YYYY-MM-DD start of activity window
  coveringTo: string        // YYYY-MM-DD end of activity window

  // LLM-extracted narrative summaries
  conversationSummary?: string
  journalSummary?: string
  checkinSummary?: string

  // Structured extractions
  userFacts: string[]       // Durable facts: "Main trigger is work stress"
  followUps: string[]       // "Committed to trying meditation this week"
  emotionalState: string    // "Ended the day feeling hopeful"
  notablePatterns: string[] // "Third time mentioning Friday cravings"

  createdAt: number
}
```

`userFacts` accumulate over time — Remi's growing knowledge of the person. Summaries are day-specific narrative context.

## Extraction Input

The extraction prompt receives all raw activity in the `coveringFrom → coveringTo` window:

1. **Chat messages** — full user+assistant messages from all sessions
2. **Journal entries** — all entries with tags and content
3. **Daily metrics** — check-in data including mood, cravings, sleep, sobriety, and free-text notes
4. **Previous userFacts** — from the most recent DailyMemory, so the LLM can update/deduplicate

The prompt instructs Claude to:
- Summarize each activity type concisely
- Extract new user facts (note if previous facts should be updated/removed)
- Identify follow-up items
- Note emotional trajectory
- Flag patterns across the data

## How Remi Consumes Memories

### System prompt injection

Both `buildGreetingContext()` and `buildContextWindow()` load the most recent DailyMemory plus accumulated `userFacts` from recent memories. Injected as a `## What You Know About This User` section in the system prompt.

### Metrics always visible

Expand existing 7-day metrics injection to include `DailyMetric.notes` (currently omitted) so Remi sees free-text notes alongside numbers.

## Architectural Constraints

- All memory data encrypted at rest via vault (AES-GCM-256)
- Extraction is a single API call per login (when needed)
- API remains stateless — extraction happens client-side, result stored client-side
- Memory extraction does not block the UI
