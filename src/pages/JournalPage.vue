<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  BookOpen,
  Sun,
  Moon,
  Brain,
  PenLine,
  Send,
  Clock,
  Tag,
  Check,
  AlertCircle
} from 'lucide-vue-next'
import { useVault } from '@/composables/useVault'
import { generateId, generateSessionId } from '@/types'
import type { JournalEntry, JournalTag } from '@/types'

const router = useRouter()
const route = useRoute()
const { saveJournalEntry, getJournalEntries }  = useVault()

// Feedback state
const saveSuccess = ref(false)
const saveError = ref<string | null>(null)

// Tabs
type TabId = 'write' | 'history'
const activeTab = ref<TabId>('write')

// Journal templates
interface JournalTemplate {
  id: string
  name: string
  icon: typeof Sun
  prompt: string
  description: string
  suggestedTags: JournalTag[]
}

const templates: JournalTemplate[] = [
  {
    id: 'morning-stoic',
    name: 'Morning Stoic Prep',
    icon: Sun,
    prompt: 'What challenges might I face today? What is within my control, and what must I accept? How will I respond with virtue?',
    description: 'Prepare for the day ahead with Stoic reflection',
    suggestedTags: ['gratitude']
  },
  {
    id: 'evening-review',
    name: 'Evening Review',
    icon: Moon,
    prompt: 'What went well today? Where did I fall short of my values? What can I do better tomorrow?',
    description: 'Reflect on your day and extract lessons',
    suggestedTags: ['victory', 'gratitude']
  },
  {
    id: 'cbt-analysis',
    name: 'CBT Analysis',
    icon: Brain,
    prompt: 'What thought is troubling me? What evidence supports it? What evidence contradicts it? What would I tell a friend in this situation?',
    description: 'Challenge negative thoughts with structured analysis',
    suggestedTags: ['distortion-caught']
  },
  {
    id: 'freeform',
    name: 'Freeform',
    icon: PenLine,
    prompt: 'Write freely about whatever is on your mind...',
    description: 'No structure, just write',
    suggestedTags: []
  }
]

// Editor state
const selectedTemplate = ref<JournalTemplate>(templates[0])
const entryContent = ref('')
const isSaving = ref(false)

// History state
const journalEntries = ref<JournalEntry[]>([])
const isLoadingHistory = ref(true)

// Select template
const selectTemplate = (template: JournalTemplate) => {
  selectedTemplate.value = template
  entryContent.value = ''
}

// Save and analyze with Remi
const analyzeWithRemi = async () => {
  if (!entryContent.value.trim()) return

  isSaving.value = true
  saveError.value = null

  try {
    const entry: JournalEntry = {
      id: generateId(),
      timestamp: Date.now(),
      sessionId: generateSessionId(),
      content: entryContent.value,
      entryType: 'user',
      tags: [...selectedTemplate.value.suggestedTags],
      sentiment: 'neutral'
    }

    await saveJournalEntry(entry)

    // Navigate to chat with context
    router.push({
      name: 'chat',
      query: {
        journalEntry: entry.id,
        template: selectedTemplate.value.name,
        content: entryContent.value
      }
    })
  } catch (error) {
    console.error('Failed to save journal entry:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    saveError.value = `Failed to save entry: ${errorMessage}`
    setTimeout(() => {
      saveError.value = null
    }, 5000)
  } finally {
    isSaving.value = false
  }
}

// Save entry without analysis
const saveEntry = async () => {
  if (!entryContent.value.trim()) return

  isSaving.value = true
  saveError.value = null
  saveSuccess.value = false

  try {
    const entry: JournalEntry = {
      id: generateId(),
      timestamp: Date.now(),
      sessionId: generateSessionId(),
      content: entryContent.value,
      entryType: 'user',
      tags: [...selectedTemplate.value.suggestedTags],
      sentiment: 'neutral'
    }

    await saveJournalEntry(entry)

    // Refresh history
    journalEntries.value = await getJournalEntries({ limit: 50 })

    // Show success feedback and switch to history tab
    saveSuccess.value = true
    activeTab.value = 'history'
    entryContent.value = ''

    setTimeout(() => {
      saveSuccess.value = false
    }, 3000)
  } catch (error) {
    console.error('Failed to save journal entry:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    saveError.value = `Failed to save entry: ${errorMessage}`
    setTimeout(() => {
      saveError.value = null
    }, 5000)
  } finally {
    isSaving.value = false
  }
}

// Format date for display
const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Format time for display
const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  })
}

// Get template name from entry (stored in tags or inferred)
const getTemplateName = (entry: JournalEntry): string => {
  // Try to infer from tags
  if (entry.tags.includes('distortion-caught')) return 'CBT Analysis'
  if (entry.tags.includes('gratitude') && entry.tags.includes('victory')) return 'Evening Review'
  if (entry.tags.includes('gratitude')) return 'Morning Stoic Prep'
  return 'Freeform'
}

// Analyze an existing entry from history
const analyzeExistingEntry = (entry: JournalEntry) => {
  router.push({
    name: 'chat',
    query: {
      journalEntry: entry.id,
      template: getTemplateName(entry),
      content: entry.content
    }
  })
}

// Load journal entries on mount and handle template query param
onMounted(async () => {
  try {
    journalEntries.value = await getJournalEntries({ limit: 50 })
  } catch (error) {
    console.error('Failed to load journal entries:', error)
  } finally {
    isLoadingHistory.value = false
  }

  // Handle ?template= query param for pre-selection
  const templateId = route.query.template as string | undefined
  if (templateId) {
    const matchingTemplate = templates.find(t => t.id === templateId)
    if (matchingTemplate) {
      selectedTemplate.value = matchingTemplate
      activeTab.value = 'write'
    }
  }
})
</script>

<template>
  <div class="h-full overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto">
    <div class="space-y-6 animate-fade-in">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen :size="24" class="text-indigo-400" />
            Journal
          </h1>
          <p class="text-slate-400 text-sm mt-1">Guided reflection and self-examination</p>
        </div>

        <!-- Tab Switcher -->
        <div class="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
          <button
            @click="activeTab = 'write'"
            class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            :class="activeTab === 'write'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'"
          >
            New Entry
          </button>
          <button
            @click="activeTab = 'history'"
            class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            :class="activeTab === 'history'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'"
          >
            Past Entries
          </button>
        </div>
      </div>

      <!-- Write Tab -->
      <div v-if="activeTab === 'write'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Template Selector -->
        <div class="lg:col-span-1 space-y-3">
          <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wide">Template</h2>
          <div class="space-y-2">
            <button
              v-for="template in templates"
              :key="template.id"
              @click="selectTemplate(template)"
              class="w-full p-4 rounded-lg border text-left transition-all"
              :class="selectedTemplate.id === template.id
                ? 'bg-indigo-900/20 border-indigo-500/50 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'"
            >
              <div class="flex items-center gap-3">
                <component
                  :is="template.icon"
                  :size="20"
                  :class="selectedTemplate.id === template.id ? 'text-indigo-400' : 'text-slate-500'"
                />
                <div>
                  <div class="font-medium">{{ template.name }}</div>
                  <div class="text-xs text-slate-500 mt-0.5">{{ template.description }}</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Editor Area -->
        <div class="lg:col-span-2 space-y-4">
          <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wide">Write</h2>

          <!-- Prompt Header -->
          <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <p class="text-slate-300 text-sm italic">{{ selectedTemplate.prompt }}</p>
          </div>

          <!-- Text Area -->
          <textarea
            v-model="entryContent"
            placeholder="Begin writing..."
            class="w-full h-64 bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent leading-relaxed"
          ></textarea>

          <!-- Actions -->
          <div class="flex gap-3">
            <button
              @click="saveEntry"
              :disabled="!entryContent.trim() || isSaving"
              class="flex-1 py-3 px-4 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ isSaving ? 'Saving...' : 'Save Entry' }}
            </button>
            <button
              @click="analyzeWithRemi"
              :disabled="!entryContent.trim() || isSaving"
              class="flex-1 py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Send :size="18" />
              {{ isSaving ? 'Saving...' : 'Analyze with Remi' }}
            </button>
          </div>

          <!-- Success Message -->
          <div
            v-if="saveSuccess"
            class="flex items-center gap-2 p-3 rounded-lg bg-emerald-900/20 border border-emerald-600/30 text-emerald-400"
          >
            <Check :size="18" />
            <span>Entry saved successfully! Check your Past Entries.</span>
          </div>

          <!-- Error Message -->
          <div
            v-if="saveError"
            class="flex items-center gap-2 p-3 rounded-lg bg-red-900/20 border border-red-600/30 text-red-400"
          >
            <AlertCircle :size="18" />
            <span>{{ saveError }}</span>
          </div>
        </div>
      </div>

      <!-- History Tab -->
      <div v-else-if="activeTab === 'history'">
        <div v-if="isLoadingHistory" class="flex items-center justify-center h-64">
          <div class="animate-pulse text-slate-400">Loading entries...</div>
        </div>

        <div v-else-if="journalEntries.length === 0" class="text-center py-16">
          <BookOpen :size="48" class="mx-auto text-slate-600 mb-4" />
          <p class="text-slate-400">No journal entries yet</p>
          <p class="text-slate-500 text-sm mt-1">Start writing to build your reflection history</p>
        </div>

        <!-- Masonry-style Grid -->
        <div v-else class="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          <div
            v-for="entry in journalEntries"
            :key="entry.id"
            class="break-inside-avoid bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
          >
            <!-- Header -->
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs text-slate-500 font-mono flex items-center gap-1">
                <Clock :size="12" />
                {{ formatDate(entry.timestamp) }}
              </span>
              <span class="text-xs text-indigo-400">{{ getTemplateName(entry) }}</span>
            </div>

            <!-- Content Preview -->
            <p class="text-slate-300 text-sm line-clamp-4 mb-3">
              {{ entry.content }}
            </p>

            <!-- Tags -->
            <div v-if="entry.tags.length > 0" class="flex flex-wrap gap-1">
              <span
                v-for="tag in entry.tags"
                :key="tag"
                class="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-400 flex items-center gap-1"
              >
                <Tag :size="10" />
                {{ tag }}
              </span>
            </div>

            <!-- Time -->
            <div class="text-xs text-slate-600 mt-3">
              {{ formatTime(entry.timestamp) }}
            </div>

            <!-- Analyze Button -->
            <button
              @click="analyzeExistingEntry(entry)"
              class="mt-3 w-full py-2 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-400 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Send :size="14" />
              Analyze with Remi
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
