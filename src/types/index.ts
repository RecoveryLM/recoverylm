// ============================================
// RecoveryLM TypeScript Type Definitions
// Based on System Design Specification v1.1
// ============================================

// ============================================
// User Identity & Profile
// ============================================

export type RecoveryPhilosophy = 'SMART' | 'RecoveryDharma' | '12Step' | 'Secular' | 'Other'
export type RecoveryStage = 'considering' | 'early' | 'established' | 'maintenance'
export type VulnerabilityPattern = 'craving' | 'rationalization' | 'both'

export interface UserProfile {
  id: string
  displayName: string
  createdAt: number
  philosophy: RecoveryPhilosophy
  substancesOfFocus: string[]
  recoveryStage: RecoveryStage
  vulnerabilityPattern: VulnerabilityPattern
  commitmentStatement: string
  onboardingComplete: boolean
  sobrietyStartDate?: string // YYYY-MM-DD
}

// ============================================
// Emergency & Support Contacts
// ============================================

export interface EmergencyContact {
  id: string
  name: string
  relationship: string
  phone: string
  email?: string
  canBeNotifiedInCrisis: boolean
}

export interface SupportPersonAuthority {
  canRequestDrugTest: boolean
  canShowUpUnannounced: boolean
  canInitiateGroupResponse: boolean
  canReceiveAutomatedAlerts: boolean
}

export interface SupportPerson {
  id: string
  name: string
  relationship: string
  contactMethod: 'phone' | 'email' | 'text'
  contactInfo: string
  grantedAuthority: SupportPersonAuthority
  tier: 1 | 2
}

export interface SupportNetwork {
  tier1: SupportPerson[] // Core Support - daily/weekly contact
  tier2: SupportPerson[] // Extended Support - aware, available as backup
  primaryPartner: string | null // ID of primary accountability partner
  backupPartner: string | null // ID of backup partner
}

// ============================================
// Daily Metrics & Tracking
// ============================================

export interface MetricDefinition {
  id: string          // Unique identifier (e.g., 'exercise', 'custom_xyz')
  label: string       // Display name
  icon: string        // Emoji icon for the metric
  type: 'boolean' | 'scale'  // Toggle or 1-10 scale
  min?: number        // For scale type (default: 1)
  max?: number        // For scale type (default: 10)
  isDefault: boolean  // Whether it's a built-in metric
  enabled: boolean    // Whether user has it enabled
}

export interface MetricsConfig {
  metrics: MetricDefinition[]
}

export const DEFAULT_METRICS: MetricDefinition[] = [
  { id: 'sobrietyMaintained', label: 'Sobriety', icon: '🎯', type: 'boolean', isDefault: true, enabled: true },
  { id: 'exercise', label: 'Exercise', icon: '💪', type: 'boolean', isDefault: true, enabled: true },
  { id: 'meditation', label: 'Meditation', icon: '🧘', type: 'boolean', isDefault: true, enabled: true },
  { id: 'study', label: 'Recovery Study', icon: '📚', type: 'boolean', isDefault: true, enabled: true },
  { id: 'healthyEating', label: 'Healthy Eating', icon: '🥗', type: 'boolean', isDefault: true, enabled: true },
  { id: 'connectionTime', label: 'Connection Time', icon: '👥', type: 'boolean', isDefault: true, enabled: true },
  { id: 'cbtPractice', label: 'CBT Practice', icon: '🧠', type: 'boolean', isDefault: true, enabled: true },
]

export interface DailyMetric {
  date: string // YYYY-MM-DD (primary key)
  sobrietyMaintained: boolean
  exercise: boolean
  meditation: boolean
  study: boolean
  healthyEating: boolean
  connectionTime: boolean
  cbtPractice: boolean
  moodScore: number // 1-10
  sleepQuality?: number // 1-10
  anxietyLevel?: number // 1-10
  cravingIntensity?: number // 0-10, 0 = none
  notes?: string
  customMetrics?: Record<string, boolean | number> // Values for custom metrics
}

export interface StreakInfo {
  type: string
  days: number
  startDate: string
}

// ============================================
// Journal Entries
// ============================================

export type JournalTag =
  | 'craving'
  | 'rationalization'
  | 'trigger'
  | 'gratitude'
  | 'relapse'
  | 'victory'
  | 'therapy-prep'
  | 'urge-surfed'
  | 'distortion-caught'

export type Sentiment = 'positive' | 'neutral' | 'negative' | 'crisis'

export interface JournalEntry {
  id: string
  timestamp: number
  sessionId: string // Groups entries within a conversation session
  content: string // Encrypted
  entryType: 'user' | 'assistant' | 'system'
  tags: JournalTag[]
  sentiment?: Sentiment
  exerciseCompleted?: string // Widget ID if an exercise was completed
}

// ============================================
// Therapist Integration
// ============================================

export type GuidanceCategory = 'boundary' | 'technique' | 'warning' | 'goal'

export interface TherapistGuidance {
  id: string
  addedAt: number
  source: string // e.g., "Dr. Smith, session 12/15"
  guidance: string
  category: GuidanceCategory
  active: boolean
}

// ============================================
// Crisis Handling
// ============================================

export type CrisisLevel = 'none' | 'monitor' | 'concern' | 'urgent' | 'emergency'

export type CrisisAction =
  | 'proceed' // No concerns, continue to API
  | 'inject-context' // Add safety context to prompt
  | 'gentle-checkin' // AI should check in about wellbeing
  | 'show-resources' // Display crisis resources before proceeding
  | 'pause-and-connect' // Pause, show resources, offer to notify contact
  | 'emergency-protocol' // Immediate intervention

export interface CrisisAssessment {
  level: CrisisLevel
  triggers: string[]
  recommendedAction: CrisisAction
  timestamp: number
}

export interface CrisisResources {
  nationalSuicidePrevention: string
  crisisTextLine: string
  samhsaHelpline: string
  emergencyContact?: EmergencyContact
}

// ============================================
// Widget System
// ============================================

export type WidgetId =
  | 'W_DENTS'
  | 'W_TAPE'
  | 'W_STOIC'
  | 'W_EVIDENCE'
  | 'W_URGESURF'
  | 'W_CHECKIN'
  | 'W_COMMITMENT'
  | 'W_NETWORK'
  | 'W_THOUGHTLOG'
  | 'W_GRATITUDE'
  | 'W_SELFAPPRECIATION'

export interface WidgetCompletionState {
  completedAt: number
  result: Record<string, unknown>
}

export interface WidgetCommand {
  id: WidgetId
  params: Record<string, unknown>
  completionState?: WidgetCompletionState
}

export interface ParsedResponse {
  text: string
  widgets: WidgetCommand[]
  errors: string[]
}

// Widget-specific parameter types
export interface DentsWidgetParams {
  trigger: string
  intensity: number // 1-10
}

export interface TapeWidgetParams {
  trigger: string
  currentThought: string
}

export interface StoicWidgetParams {
  situation: string
}

export interface EvidenceWidgetParams {
  thought: string
  distortion?: string
}

export interface UrgeSurfWidgetParams {
  duration: number // seconds
}

export interface CheckinWidgetParams {
  date: string
}

export interface CommitmentWidgetParams {
  mode: 'view' | 'edit'
}

export interface NetworkWidgetParams {
  action: 'view' | 'notify' | 'edit'
}

export interface ThoughtLogParams {
  situation?: string
}

export interface GratitudeParams {
  // All params optional - widget can be opened without context
}

export interface SelfAppreciationParams {
  // All params optional - widget can be opened without context
}

// ============================================
// Activity Tracking
// ============================================

export interface ActivityLog {
  id: string
  activityId: WidgetId
  completedAt: number
  durationSeconds?: number // How long the activity took
  result?: Record<string, unknown> // Optional activity-specific result data
}

// ============================================
// Chat & Messaging
// ============================================

export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  sessionId: string
  role: MessageRole
  content: string
  timestamp: number
  widgets?: WidgetCommand[]
  crisisLevel?: CrisisLevel
}

export interface ChatSession {
  id: string
  startedAt: number
  endedAt?: number
  messageCount: number
  tags: JournalTag[]
}

// ============================================
// Onboarding
// ============================================

export type OnboardingStep =
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
  | 'complete'

export interface OnboardingState {
  currentStep: OnboardingStep
  collectedData: Partial<UserProfile & {
    emergencyContact: EmergencyContact
    primarySupport: SupportPerson
    backupSupport: SupportPerson
  }>
  canSkip: boolean
}

// ============================================
// AI Context & Orchestration
// ============================================

export interface TemporalContext {
  localTime: string // "Tuesday, 11:47 PM"
  dayOfWeek: string
  daysSober: number
  daysSinceSignup: number
  currentStreak: StreakInfo
  timePatterns: string[] // e.g., "User often struggles on Sunday evenings"
}

export interface MemoryItem {
  source: 'journal' | 'chat'
  date: string
  content: string
  relevanceScore: number
  tags?: JournalTag[]
  sessionThemes?: string[]
}

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

export interface ContextWindow {
  // Static Context (from UserProfile)
  systemPrompt: string
  commitmentStatement: string
  vulnerabilityPattern: string
  substancesOfFocus: string[]
  therapistGuidance: string[]

  // Dynamic Context (queried from Vault)
  recentMetrics: DailyMetric[]
  leadingIndicators: string[]
  recentConversation: ChatMessage[]
  relevantHistory: MemoryItem[]
  temporalContext: TemporalContext
  recentSessionSummaries?: SessionSummary[]
  supportNetwork?: SupportNetwork
  activityInsights?: ActivityInsightsResult
  dailyMemories?: DailyMemory[]

  // User Input
  currentMessage: string

  // Crisis context (if applicable)
  crisisContext?: {
    level: CrisisLevel
    action: CrisisAction
  }
}

export interface InferenceResponse {
  text: string
  widgets: WidgetCommand[]
  metadata: {
    tokensUsed: number
    latencyMs: number
    model: string
  }
}

// ============================================
// Encryption & Security
// ============================================

export interface EncryptedData {
  iv: string // Base64 encoded
  ciphertext: string // Base64 encoded
  salt: string // Base64 encoded (for key derivation)
}

export interface VaultSettings {
  encryptionEnabled: boolean
  autoLockMinutes: number
  recoveryPhraseSet: boolean
}

// ============================================
// Application Settings
// ============================================

export interface AppSettings {
  theme: 'dark' // Only dark mode supported
  includeNamesInContext: boolean // Whether to send real names to AI
  notificationsEnabled: boolean
  dailyReminderTime?: string // HH:mm format
  autoLockMinutes: number
}

// ============================================
// Therapist Dump / Reports
// ============================================

export interface TherapistSummary {
  periodCovered: string
  themes: string[]
  moodTrend: 'improving' | 'stable' | 'declining'
  significantEvents: string[]
  suggestedTopics: string[]
  rawMetricsSummary: {
    exerciseDays: number
    meditationDays: number
    avgMoodScore: number
    cravingIncidents: number
  }
}

export interface StatusReport {
  generatedAt: string
  sobrietyStreak: number
  weeklyMetrics: {
    exerciseDays: number
    meditationDays: number
    avgMoodScore: number
  }
  highlights: string[]
  concerns: string[]
  message?: string // Optional personal note from user
}

// ============================================
// Daily Practice Configuration
// ============================================

export type DailyPracticeItemType = 'widget' | 'journal'

export interface DailyPracticeItem {
  id: string                    // e.g., 'journal_morning-stoic' or 'widget_W_STOIC'
  type: DailyPracticeItemType
  widgetId?: WidgetId           // For widget items
  journalTemplateId?: string    // For journal items
  label: string
  description: string
  enabled: boolean
  order: number
  startHour?: number            // 0-23, undefined = anytime
  endHour?: number              // 0-23, undefined = anytime
}

export interface DailyPracticeConfig {
  items: DailyPracticeItem[]
}

export const DEFAULT_DAILY_PRACTICE_ITEMS: DailyPracticeItem[] = [
  // Journal Templates
  {
    id: 'journal_morning-stoic',
    type: 'journal',
    journalTemplateId: 'morning-stoic',
    label: 'Morning Reflection',
    description: 'Morning Stoic Prep journal template',
    enabled: true,
    order: 1,
    startHour: 5,
    endHour: 10
  },
  {
    id: 'journal_evening-review',
    type: 'journal',
    journalTemplateId: 'evening-review',
    label: 'Evening Review',
    description: 'Reflect on your day and extract lessons',
    enabled: false,
    order: 2,
    startHour: 18,
    endHour: 22
  },
  {
    id: 'journal_cbt-analysis',
    type: 'journal',
    journalTemplateId: 'cbt-analysis',
    label: 'CBT Analysis',
    description: 'Challenge negative thoughts with structured analysis',
    enabled: false,
    order: 3
  },
  {
    id: 'journal_freeform',
    type: 'journal',
    journalTemplateId: 'freeform',
    label: 'Freeform Journal',
    description: 'No structure, just write',
    enabled: false,
    order: 4
  },
  // Widget Activities
  {
    id: 'widget_W_CHECKIN',
    type: 'widget',
    widgetId: 'W_CHECKIN',
    label: 'Daily Check-In',
    description: 'Track your sobriety, mood, and habits',
    enabled: true,
    order: 5
  },
  {
    id: 'widget_W_EVIDENCE',
    type: 'widget',
    widgetId: 'W_EVIDENCE',
    label: 'Evening CBT Review',
    description: 'Evidence examination exercise',
    enabled: true,
    order: 6,
    startHour: 18,
    endHour: 22
  },
  {
    id: 'widget_W_STOIC',
    type: 'widget',
    widgetId: 'W_STOIC',
    label: 'Stoic Exercise',
    description: 'Dichotomy of Control exercise',
    enabled: false,
    order: 7
  },
  {
    id: 'widget_W_URGESURF',
    type: 'widget',
    widgetId: 'W_URGESURF',
    label: 'Urge Surfing',
    description: 'Guided urge meditation',
    enabled: false,
    order: 8
  },
  {
    id: 'widget_W_DENTS',
    type: 'widget',
    widgetId: 'W_DENTS',
    label: 'DENTS Protocol',
    description: 'Urge surfing protocol',
    enabled: false,
    order: 9
  },
  {
    id: 'widget_W_TAPE',
    type: 'widget',
    widgetId: 'W_TAPE',
    label: 'Play the Tape',
    description: 'Play the tape through (consequences)',
    enabled: false,
    order: 10
  },
  {
    id: 'widget_W_THOUGHTLOG',
    type: 'widget',
    widgetId: 'W_THOUGHTLOG',
    label: 'Thought Log',
    description: 'Work through difficult thoughts using the ABCDE model',
    enabled: false,
    order: 11
  },
  {
    id: 'widget_W_GRATITUDE',
    type: 'widget',
    widgetId: 'W_GRATITUDE',
    label: 'Gratitude Journal',
    description: 'Record three good things from your day',
    enabled: false,
    order: 12
  },
  {
    id: 'widget_W_SELFAPPRECIATION',
    type: 'widget',
    widgetId: 'W_SELFAPPRECIATION',
    label: 'Self Appreciation',
    description: 'Celebrate your wins and recognize your strengths',
    enabled: false,
    order: 13
  }
]

// ============================================
// Session Summary & Activity Insights
// ============================================

export type EmotionalArc = 'improving' | 'stable' | 'declining' | 'crisis-managed' | 'unknown'
export type SessionEndState = 'resolved' | 'unresolved' | 'open-ended'

export interface SessionSummary {
  sessionId: string
  date: string
  themes: string[]
  emotionalArc: EmotionalArc
  widgetsUsed: WidgetId[]
  endState: SessionEndState
  userIntentions?: string[]
  messageCount: number
}

export interface ActivityInsight {
  widgetId: WidgetId
  totalCompletions: number
  lastUsedRelative: string  // "today", "yesterday", "3 days ago", "never"
  lastUsedTimestamp?: number
  isEnabledInDailyPractice: boolean
  completedToday: boolean
}

export interface ActivityInsightsResult {
  insights: ActivityInsight[]
  suggestedActivities: WidgetId[]
  practiceGaps: WidgetId[]  // Enabled but not used in 2+ weeks
}

// ============================================
// Utility Types
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function today(): string {
  return formatDate(new Date())
}
