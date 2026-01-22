<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { CalendarCheck, CheckCircle2, BookOpen, Zap } from 'lucide-vue-next'
import { useVault } from '@/composables/useVault'
import type { DailyPracticeConfig } from '@/types'
import { DEFAULT_DAILY_PRACTICE_ITEMS } from '@/types'

const { getDailyPracticeConfig, saveDailyPracticeConfig } = useVault()

const isLoading = ref(true)
const isSaving = ref(false)
const saveSuccess = ref(false)
const config = ref<DailyPracticeConfig>({ items: [] })

// Computed: separate journal and widget items
const journalItems = computed(() =>
  config.value.items.filter(item => item.type === 'journal').sort((a, b) => a.order - b.order)
)

const widgetItems = computed(() =>
  config.value.items.filter(item => item.type === 'widget').sort((a, b) => a.order - b.order)
)

const enabledCount = computed(() => config.value.items.filter(item => item.enabled).length)

onMounted(async () => {
  try {
    const storedConfig = await getDailyPracticeConfig()
    if (storedConfig.items.length === 0) {
      // Initialize with defaults if empty
      config.value = { items: [...DEFAULT_DAILY_PRACTICE_ITEMS] }
    } else {
      config.value = storedConfig
    }
  } catch (error) {
    console.error('Failed to load daily practice config:', error)
    config.value = { items: [...DEFAULT_DAILY_PRACTICE_ITEMS] }
  } finally {
    isLoading.value = false
  }
})

const toggleItem = (itemId: string) => {
  const item = config.value.items.find(i => i.id === itemId)
  if (item) {
    item.enabled = !item.enabled
  }
}

const saveChanges = async () => {
  isSaving.value = true
  saveSuccess.value = false

  try {
    await saveDailyPracticeConfig(config.value)
    saveSuccess.value = true
    setTimeout(() => {
      saveSuccess.value = false
    }, 3000)
  } catch (error) {
    console.error('Failed to save daily practice config:', error)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="bg-slate-800 rounded-lg border border-slate-700 p-6">
    <div class="flex items-center gap-2 mb-4">
      <CalendarCheck :size="20" class="text-indigo-400" />
      <h2 class="text-lg font-semibold text-white">Today's Practice Items</h2>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-slate-400 text-center py-4">
      Loading practice items...
    </div>

    <div v-else class="space-y-4">
      <p class="text-slate-400 text-sm">
        Choose which activities appear in your "Today's Practice" section on the dashboard.
        <span class="text-indigo-400">{{ enabledCount }} items</span> currently enabled.
      </p>

      <!-- Journal Templates Section -->
      <div class="space-y-2">
        <h3 class="text-sm font-medium text-slate-300 flex items-center gap-2">
          <BookOpen :size="14" class="text-amber-400" />
          Journal Templates
        </h3>
        <div class="space-y-2">
          <div
            v-for="item in journalItems"
            :key="item.id"
            class="flex items-center justify-between p-3 rounded-lg border transition-colors"
            :class="item.enabled
              ? 'bg-slate-700/30 border-slate-600'
              : 'bg-slate-800/50 border-slate-700'"
          >
            <div class="flex-1" :class="{ 'opacity-50': !item.enabled }">
              <span class="text-slate-200">{{ item.label }}</span>
              <p class="text-xs text-slate-500 mt-0.5">{{ item.description }}</p>
            </div>
            <div
              role="switch"
              :aria-checked="item.enabled"
              :aria-label="`Toggle ${item.label}`"
              tabindex="0"
              class="relative w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ml-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800"
              :class="item.enabled ? 'bg-emerald-600' : 'bg-slate-600'"
              @click="toggleItem(item.id)"
              @keydown.enter="toggleItem(item.id)"
              @keydown.space.prevent="toggleItem(item.id)"
            >
              <div
                class="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                :class="item.enabled ? 'translate-x-5' : 'translate-x-1'"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recovery Activities Section -->
      <div class="space-y-2">
        <h3 class="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Zap :size="14" class="text-emerald-400" />
          Recovery Activities
        </h3>
        <div class="space-y-2">
          <div
            v-for="item in widgetItems"
            :key="item.id"
            class="flex items-center justify-between p-3 rounded-lg border transition-colors"
            :class="item.enabled
              ? 'bg-slate-700/30 border-slate-600'
              : 'bg-slate-800/50 border-slate-700'"
          >
            <div class="flex-1" :class="{ 'opacity-50': !item.enabled }">
              <span class="text-slate-200">{{ item.label }}</span>
              <p class="text-xs text-slate-500 mt-0.5">{{ item.description }}</p>
            </div>
            <div
              role="switch"
              :aria-checked="item.enabled"
              :aria-label="`Toggle ${item.label}`"
              tabindex="0"
              class="relative w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ml-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800"
              :class="item.enabled ? 'bg-emerald-600' : 'bg-slate-600'"
              @click="toggleItem(item.id)"
              @keydown.enter="toggleItem(item.id)"
              @keydown.space.prevent="toggleItem(item.id)"
            >
              <div
                class="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                :class="item.enabled ? 'translate-x-5' : 'translate-x-1'"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Preview Section -->
      <div class="pt-4 border-t border-slate-700">
        <h3 class="text-sm font-medium text-slate-400 mb-2">Dashboard Preview</h3>
        <div class="bg-slate-900/50 rounded-lg p-3 space-y-1.5">
          <template v-for="item in config.items.filter(i => i.enabled).sort((a, b) => a.order - b.order)" :key="item.id">
            <div class="flex items-center gap-2 text-sm text-slate-300">
              <div class="w-4 h-4 rounded border border-slate-600"></div>
              <span>{{ item.label }}</span>
            </div>
          </template>
          <div v-if="enabledCount === 0" class="text-slate-500 text-sm italic">
            No items enabled. Enable at least one practice item.
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <button
        @click="saveChanges"
        :disabled="isSaving"
        class="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors"
        :class="saveSuccess
          ? 'bg-emerald-600 text-white'
          : 'bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white'"
      >
        <CheckCircle2 v-if="saveSuccess" :size="18" />
        {{ isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes' }}
      </button>
    </div>
  </div>
</template>
