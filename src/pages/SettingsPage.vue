<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Settings,
  Shield,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Lock,
  CheckCircle2
} from 'lucide-vue-next'
import { useVault } from '@/composables/useVault'
import { useAutoLock } from '@/composables/useAutoLock'
import type { AppSettings } from '@/types'
import MetricSettingsSection from '@/components/MetricSettingsSection.vue'
import ChangePasswordModal from '@/components/ChangePasswordModal.vue'
import RecoveryPhraseModal from '@/components/RecoveryPhraseModal.vue'
import ImportBackupModal from '@/components/ImportBackupModal.vue'

const router = useRouter()
const { exportBackup, wipe, lock, getAppSettings, saveAppSettings } = useVault()
const { updateAutoLockMinutes } = useAutoLock()

const settings = ref<AppSettings>({
  theme: 'dark',
  includeNamesInContext: false,
  notificationsEnabled: false,
  autoLockMinutes: 5,
})

const isLoadingSettings = ref(true)
const showChangePasswordModal = ref(false)
const showRecoveryPhraseModal = ref(false)
const showImportBackupModal = ref(false)

// Load settings on mount
onMounted(async () => {
  try {
    const loadedSettings = await getAppSettings()
    settings.value = loadedSettings
  } finally {
    isLoadingSettings.value = false
  }
})

// Debounced auto-save when settings change
let saveTimeout: ReturnType<typeof setTimeout> | null = null
watch(settings, async (newSettings) => {
  if (isLoadingSettings.value) return

  // Update auto-lock timer immediately when setting changes
  updateAutoLockMinutes(newSettings.autoLockMinutes)

  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(async () => {
    try {
      await saveAppSettings(newSettings)
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }, 500)
}, { deep: true })

const showDangerZone = ref(false)
const confirmWipe = ref('')
const isExporting = ref(false)
const exportSuccess = ref(false)
const isWiping = ref(false)

const exportData = async () => {
  isExporting.value = true
  exportSuccess.value = false

  try {
    const blob = await exportBackup()

    // Create download link
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recoverylm-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    exportSuccess.value = true
    setTimeout(() => {
      exportSuccess.value = false
    }, 3000)
  } catch (error) {
    console.error('Export failed:', error)
    alert('Failed to export data. Please try again.')
  } finally {
    isExporting.value = false
  }
}

const importData = () => {
  showImportBackupModal.value = true
}

const onImportSuccess = () => {
  showImportBackupModal.value = false
  router.push({ name: 'dashboard' })
}

const wipeAllData = async () => {
  if (confirmWipe.value !== 'DELETE ALL DATA') return

  isWiping.value = true

  try {
    await wipe()
    router.push({ name: 'setup' })
  } catch (error) {
    console.error('Wipe failed:', error)
    alert('Failed to delete data. Please try again.')
  } finally {
    isWiping.value = false
    confirmWipe.value = ''
  }
}

const lockVault = () => {
  lock()
  router.push({ name: 'unlock' })
}
</script>

<template>
  <div class="h-full overflow-y-auto p-4 md:p-8 max-w-3xl mx-auto">
    <div class="space-y-6 animate-fade-in">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Settings :size="24" class="text-indigo-400" />
          <h1 class="text-xl font-bold text-white">Settings</h1>
        </div>
        <button
          @click="lockVault"
          class="flex items-center gap-2 text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded hover:bg-slate-700 transition-colors"
        >
          <Lock :size="16" />
          Lock Vault
        </button>
      </div>

      <!-- Privacy Settings -->
      <div class="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <div class="flex items-center gap-2 mb-4">
          <Shield :size="20" class="text-indigo-400" />
          <h2 class="text-lg font-semibold text-white">Privacy</h2>
        </div>

        <div class="space-y-4">
          <label class="flex items-center justify-between cursor-pointer">
            <div>
              <div class="text-slate-200">Include names in AI context</div>
              <div class="text-slate-500 text-sm">
                When off, names are replaced with placeholders like [Partner]
              </div>
            </div>
            <div
              class="relative w-12 h-6 rounded-full transition-colors cursor-pointer"
              :class="settings.includeNamesInContext ? 'bg-indigo-600' : 'bg-slate-600'"
              @click="settings.includeNamesInContext = !settings.includeNamesInContext"
            >
              <div
                class="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
                :class="settings.includeNamesInContext ? 'translate-x-7' : 'translate-x-1'"
              ></div>
            </div>
          </label>
        </div>
      </div>

      <!-- Security Settings -->
      <div class="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <div class="flex items-center gap-2 mb-4">
          <Lock :size="20" class="text-indigo-400" />
          <h2 class="text-lg font-semibold text-white">Security</h2>
        </div>

        <div class="space-y-4">
          <div>
            <label class="text-slate-200 block mb-2">Auto-lock after inactivity</label>
            <select
              v-model="settings.autoLockMinutes"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            >
              <option :value="1">1 minute</option>
              <option :value="5">5 minutes</option>
              <option :value="15">15 minutes</option>
              <option :value="30">30 minutes</option>
              <option :value="0">Never</option>
            </select>
          </div>

          <button
            @click="showChangePasswordModal = true"
            class="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-medium transition-colors"
          >
            Change Password
          </button>

          <button
            @click="showRecoveryPhraseModal = true"
            class="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-medium transition-colors"
          >
            View Recovery Phrase
          </button>
        </div>
      </div>

      <!-- Metrics Customization -->
      <MetricSettingsSection />

      <!-- Data Management -->
      <div class="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <div class="flex items-center gap-2 mb-4">
          <Download :size="20" class="text-indigo-400" />
          <h2 class="text-lg font-semibold text-white">Data Management</h2>
        </div>

        <div class="space-y-3">
          <button
            @click="exportData"
            :disabled="isExporting"
            class="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors"
            :class="exportSuccess
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-white'"
          >
            <Download v-if="!exportSuccess" :size="18" />
            <CheckCircle2 v-else :size="18" />
            {{ isExporting ? 'Exporting...' : exportSuccess ? 'Downloaded!' : 'Export Encrypted Backup' }}
          </button>

          <button
            @click="importData"
            class="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-medium transition-colors"
          >
            <Upload :size="18" />
            Import Backup
          </button>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="bg-red-900/20 border border-red-600/30 rounded-lg p-6">
        <button
          @click="showDangerZone = !showDangerZone"
          class="w-full flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            <AlertTriangle :size="20" class="text-red-500" />
            <h2 class="text-lg font-semibold text-red-400">Danger Zone</h2>
          </div>
          <span class="text-slate-500 text-sm">{{ showDangerZone ? 'Hide' : 'Show' }}</span>
        </button>

        <Transition
          enter-active-class="transition-all duration-200"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-96"
          leave-active-class="transition-all duration-200"
          leave-from-class="opacity-100 max-h-96"
          leave-to-class="opacity-0 max-h-0"
        >
          <div v-if="showDangerZone" class="mt-4 space-y-4 overflow-hidden">
            <p class="text-slate-400 text-sm">
              This will permanently delete all your data. This action cannot be undone.
              Your data is encrypted locally and cannot be recovered.
            </p>

            <div>
              <label class="text-slate-300 text-sm block mb-2">
                Type "DELETE ALL DATA" to confirm:
              </label>
              <input
                v-model="confirmWipe"
                type="text"
                class="w-full bg-slate-800 border border-red-600/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
                placeholder="DELETE ALL DATA"
              />
            </div>

            <button
              @click="wipeAllData"
              :disabled="confirmWipe !== 'DELETE ALL DATA' || isWiping"
              class="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors"
              :class="confirmWipe === 'DELETE ALL DATA'
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'"
            >
              <Trash2 :size="18" />
              {{ isWiping ? 'Deleting...' : 'Permanently Delete All Data' }}
            </button>
          </div>
        </Transition>
      </div>

      <!-- Version Info -->
      <div class="text-center text-slate-500 text-sm">
        <p>RecoveryLM v0.1.0</p>
        <p class="mt-1">Local-First | Zero Data Retention | Your Data, Your Control</p>
      </div>
    </div>

    <!-- Modals -->
    <ChangePasswordModal
      v-if="showChangePasswordModal"
      @close="showChangePasswordModal = false"
    />
    <RecoveryPhraseModal
      v-if="showRecoveryPhraseModal"
      @close="showRecoveryPhraseModal = false"
    />
    <ImportBackupModal
      v-if="showImportBackupModal"
      @close="showImportBackupModal = false"
      @success="onImportSuccess"
    />
  </div>
</template>
