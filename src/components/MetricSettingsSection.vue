<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Activity, Plus, Trash2, CheckCircle2 } from 'lucide-vue-next'
import { useVault } from '@/composables/useVault'
import type { MetricDefinition, MetricsConfig } from '@/types'
import { DEFAULT_METRICS, generateId } from '@/types'

const { getMetricsConfig, saveMetricsConfig } = useVault()

const isLoading = ref(true)
const isSaving = ref(false)
const saveSuccess = ref(false)
const config = ref<MetricsConfig>({ metrics: [] })

// New metric form
const showAddForm = ref(false)
const newMetric = ref({
  label: '',
  icon: '',
  type: 'boolean' as 'boolean' | 'scale'
})

const commonEmojis = ['✅', '🏃', '💧', '📖', '🎨', '🎵', '🏋️', '🧘', '😴', '💊', '🍎', '🧩']

const enabledMetrics = computed(() => config.value.metrics.filter(m => m.enabled))
const disabledMetrics = computed(() => config.value.metrics.filter(m => !m.enabled))

onMounted(async () => {
  try {
    const storedConfig = await getMetricsConfig()
    if (storedConfig.metrics.length === 0) {
      // Initialize with defaults if empty
      config.value = { metrics: [...DEFAULT_METRICS] }
    } else {
      config.value = storedConfig
    }
  } catch (error) {
    console.error('Failed to load metrics config:', error)
    config.value = { metrics: [...DEFAULT_METRICS] }
  } finally {
    isLoading.value = false
  }
})

const toggleMetric = (metricId: string) => {
  const metric = config.value.metrics.find(m => m.id === metricId)
  if (metric) {
    metric.enabled = !metric.enabled
  }
}

const addCustomMetric = () => {
  if (!newMetric.value.label.trim() || !newMetric.value.icon) return

  const metric: MetricDefinition = {
    id: `custom_${generateId()}`,
    label: newMetric.value.label.trim(),
    icon: newMetric.value.icon,
    type: newMetric.value.type,
    isDefault: false,
    enabled: true,
    ...(newMetric.value.type === 'scale' ? { min: 1, max: 10 } : {})
  }

  config.value.metrics.push(metric)

  // Reset form
  newMetric.value = { label: '', icon: '', type: 'boolean' }
  showAddForm.value = false
}

const deleteMetric = (metricId: string) => {
  const index = config.value.metrics.findIndex(m => m.id === metricId)
  if (index !== -1) {
    config.value.metrics.splice(index, 1)
  }
}

const saveChanges = async () => {
  isSaving.value = true
  saveSuccess.value = false

  try {
    await saveMetricsConfig(config.value)
    saveSuccess.value = true
    setTimeout(() => {
      saveSuccess.value = false
    }, 3000)
  } catch (error) {
    console.error('Failed to save metrics config:', error)
  } finally {
    isSaving.value = false
  }
}

const selectEmoji = (emoji: string) => {
  newMetric.value.icon = emoji
}
</script>

<template>
  <div class="bg-slate-800 rounded-lg border border-slate-700 p-6">
    <div class="flex items-center gap-2 mb-4">
      <Activity :size="20" class="text-indigo-400" />
      <h2 class="text-lg font-semibold text-white">Daily Check-In Metrics</h2>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-slate-400 text-center py-4">
      Loading metrics...
    </div>

    <div v-else class="space-y-4">
      <p class="text-slate-400 text-sm">
        Customize which metrics appear in your daily check-in. Toggle metrics on/off or add custom ones.
      </p>

      <!-- Enabled Metrics -->
      <div class="space-y-2">
        <h3 class="text-sm font-medium text-slate-300">Active Metrics</h3>
        <div class="space-y-2">
          <div
            v-for="metric in enabledMetrics"
            :key="metric.id"
            class="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600"
          >
            <div class="flex items-center gap-3">
              <span class="text-xl">{{ metric.icon }}</span>
              <div>
                <span class="text-slate-200">{{ metric.label }}</span>
                <span v-if="metric.type === 'scale'" class="text-xs text-slate-500 ml-2">(1-10 scale)</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="!metric.isDefault"
                @click="deleteMetric(metric.id)"
                class="p-1 text-red-400 hover:text-red-300 transition-colors"
                title="Delete metric"
              >
                <Trash2 :size="16" />
              </button>
              <div
                class="relative w-10 h-5 rounded-full transition-colors cursor-pointer bg-emerald-600"
                @click="toggleMetric(metric.id)"
              >
                <div class="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform translate-x-5"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Disabled Metrics -->
      <div v-if="disabledMetrics.length > 0" class="space-y-2">
        <h3 class="text-sm font-medium text-slate-400">Disabled Metrics</h3>
        <div class="space-y-2">
          <div
            v-for="metric in disabledMetrics"
            :key="metric.id"
            class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700"
          >
            <div class="flex items-center gap-3 opacity-50">
              <span class="text-xl">{{ metric.icon }}</span>
              <div>
                <span class="text-slate-300">{{ metric.label }}</span>
                <span v-if="metric.type === 'scale'" class="text-xs text-slate-500 ml-2">(1-10 scale)</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="!metric.isDefault"
                @click="deleteMetric(metric.id)"
                class="p-1 text-red-400 hover:text-red-300 transition-colors"
                title="Delete metric"
              >
                <Trash2 :size="16" />
              </button>
              <div
                class="relative w-10 h-5 rounded-full transition-colors cursor-pointer bg-slate-600"
                @click="toggleMetric(metric.id)"
              >
                <div class="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform translate-x-1"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Custom Metric -->
      <div class="pt-4 border-t border-slate-700">
        <button
          v-if="!showAddForm"
          @click="showAddForm = true"
          class="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
        >
          <Plus :size="16" />
          Add Custom Metric
        </button>

        <div v-else class="space-y-3 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
          <h4 class="text-sm font-medium text-slate-200">Add Custom Metric</h4>

          <!-- Label Input -->
          <div>
            <label class="text-xs text-slate-400 block mb-1">Name</label>
            <input
              v-model="newMetric.label"
              type="text"
              placeholder="e.g., Water Intake"
              class="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <!-- Icon Picker -->
          <div>
            <label class="text-xs text-slate-400 block mb-1">Icon</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="emoji in commonEmojis"
                :key="emoji"
                @click="selectEmoji(emoji)"
                class="w-8 h-8 flex items-center justify-center rounded border transition-colors"
                :class="newMetric.icon === emoji
                  ? 'border-indigo-500 bg-indigo-500/20'
                  : 'border-slate-600 hover:border-slate-500'"
              >
                {{ emoji }}
              </button>
              <input
                v-model="newMetric.icon"
                type="text"
                placeholder="Or type emoji"
                maxlength="2"
                class="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-center text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <!-- Type Selection -->
          <div>
            <label class="text-xs text-slate-400 block mb-1">Type</label>
            <div class="flex gap-2">
              <button
                @click="newMetric.type = 'boolean'"
                class="flex-1 p-2 rounded-lg border text-sm transition-colors"
                :class="newMetric.type === 'boolean'
                  ? 'bg-indigo-900/30 border-indigo-500/50 text-indigo-400'
                  : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'"
              >
                Toggle (Yes/No)
              </button>
              <button
                @click="newMetric.type = 'scale'"
                class="flex-1 p-2 rounded-lg border text-sm transition-colors"
                :class="newMetric.type === 'scale'
                  ? 'bg-indigo-900/30 border-indigo-500/50 text-indigo-400'
                  : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'"
              >
                Scale (1-10)
              </button>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="flex gap-2 pt-2">
            <button
              @click="showAddForm = false"
              class="flex-1 px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              @click="addCustomMetric"
              :disabled="!newMetric.label.trim() || !newMetric.icon"
              class="flex-1 px-3 py-2 text-sm rounded-lg transition-colors"
              :class="newMetric.label.trim() && newMetric.icon
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'"
            >
              Add Metric
            </button>
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
