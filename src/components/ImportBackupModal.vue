<script setup lang="ts">
import { ref, computed } from 'vue'
import { X, Upload, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, FileJson } from 'lucide-vue-next'
import { useVault } from '@/composables/useVault'
import type { BackupData } from '@/services/vault'

const emit = defineEmits<{
  close: []
  success: []
}>()

const { validateBackup, importBackup } = useVault()

type Step = 'select-file' | 'enter-password' | 'importing' | 'success' | 'error'

const step = ref<Step>('select-file')
const backupData = ref<BackupData | null>(null)
const backupFileName = ref('')
const password = ref('')
const showPassword = ref(false)
const errorMessage = ref('')

const fileInputRef = ref<HTMLInputElement | null>(null)

const backupInfo = computed(() => {
  if (!backupData.value) return null
  return {
    exportedAt: new Date(backupData.value.exportedAt).toLocaleString(),
    profileCount: backupData.value.userProfile.length,
    messagesCount: backupData.value.chatMessages.length,
    metricsCount: backupData.value.dailyMetrics.length,
    journalCount: backupData.value.journalEntries.length
  }
})

const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (!validateBackup(data)) {
      errorMessage.value = 'Invalid backup file format. Please select a valid RecoveryLM backup.'
      step.value = 'error'
      return
    }

    backupData.value = data
    backupFileName.value = file.name
    step.value = 'enter-password'
  } catch {
    errorMessage.value = 'Failed to read backup file. Please make sure it is a valid JSON file.'
    step.value = 'error'
  }
}

const handleImport = async () => {
  if (!backupData.value || !password.value) return

  step.value = 'importing'
  errorMessage.value = ''

  try {
    const success = await importBackup(backupData.value, password.value)

    if (success) {
      step.value = 'success'
      setTimeout(() => {
        emit('success')
      }, 1500)
    } else {
      errorMessage.value = 'Incorrect password. Please enter the password you used when you created this backup.'
      step.value = 'enter-password'
    }
  } catch (error) {
    console.error('Import error:', error)
    errorMessage.value = 'Failed to import backup. Please try again.'
    step.value = 'error'
  }
}

const reset = () => {
  step.value = 'select-file'
  backupData.value = null
  backupFileName.value = ''
  password.value = ''
  errorMessage.value = ''
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-md mx-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-slate-700">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-indigo-600/20 rounded-full flex items-center justify-center">
            <Upload :size="20" class="text-indigo-400" />
          </div>
          <h2 class="text-xl font-bold text-white">Import Backup</h2>
        </div>
        <button
          @click="emit('close')"
          class="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X :size="20" />
        </button>
      </div>

      <!-- Hidden File Input -->
      <input
        ref="fileInputRef"
        type="file"
        accept=".json"
        class="hidden"
        @change="handleFileSelect"
      />

      <!-- Step 1: Select File -->
      <div v-if="step === 'select-file'" class="p-6 space-y-4">
        <p class="text-slate-400 text-sm">
          Select a RecoveryLM backup file to restore your data. You'll need the password you used when the backup was created.
        </p>

        <button
          @click="triggerFileSelect"
          class="w-full p-8 border-2 border-dashed border-slate-600 hover:border-indigo-500 rounded-xl transition-colors group"
        >
          <div class="text-center">
            <div class="w-16 h-16 bg-slate-800 group-hover:bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
              <FileJson :size="32" class="text-slate-400 group-hover:text-indigo-400 transition-colors" />
            </div>
            <p class="text-white font-medium mb-1">Select Backup File</p>
            <p class="text-slate-500 text-sm">Click to browse for a .json backup file</p>
          </div>
        </button>

        <button
          @click="emit('close')"
          class="w-full py-3 rounded-lg font-medium bg-slate-700 hover:bg-slate-600 text-white transition-colors"
        >
          Cancel
        </button>
      </div>

      <!-- Step 2: Enter Password -->
      <div v-else-if="step === 'enter-password'" class="p-6 space-y-4">
        <!-- File Info -->
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div class="flex items-center gap-3 mb-3">
            <FileJson :size="20" class="text-indigo-400" />
            <span class="text-white font-medium truncate">{{ backupFileName }}</span>
          </div>
          <div v-if="backupInfo" class="text-slate-400 text-sm space-y-1">
            <p>Exported: {{ backupInfo.exportedAt }}</p>
            <p>{{ backupInfo.messagesCount }} messages, {{ backupInfo.metricsCount }} days of metrics</p>
          </div>
        </div>

        <!-- Error Alert -->
        <div v-if="errorMessage" class="flex items-center gap-3 p-4 bg-red-900/30 border border-red-600/30 rounded-lg">
          <AlertCircle :size="20" class="text-red-400 shrink-0" />
          <p class="text-red-200 text-sm">{{ errorMessage }}</p>
        </div>

        <!-- Password Input -->
        <div>
          <label class="text-slate-300 text-sm block mb-2">Backup Password</label>
          <div class="relative">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:border-indigo-500"
              placeholder="Enter your backup password"
              @keyup.enter="handleImport"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <Eye v-if="!showPassword" :size="20" />
              <EyeOff v-else :size="20" />
            </button>
          </div>
        </div>

        <!-- Warning -->
        <div class="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4 flex gap-3">
          <AlertCircle :size="20" class="text-amber-400 shrink-0 mt-0.5" />
          <p class="text-amber-200/70 text-sm">
            Importing a backup will replace all your current data. Make sure you have exported your current data first if needed.
          </p>
        </div>

        <!-- Buttons -->
        <div class="flex gap-3">
          <button
            @click="reset"
            class="flex-1 py-3 rounded-lg font-medium bg-slate-700 hover:bg-slate-600 text-white transition-colors"
          >
            Back
          </button>
          <button
            @click="handleImport"
            :disabled="!password"
            class="flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            :class="password
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'"
          >
            <Lock :size="18" />
            Import Backup
          </button>
        </div>
      </div>

      <!-- Step 3: Importing -->
      <div v-else-if="step === 'importing'" class="p-8 text-center">
        <Loader2 :size="48" class="text-indigo-400 animate-spin mx-auto mb-4" />
        <h3 class="text-lg font-semibold text-white mb-2">Importing Backup...</h3>
        <p class="text-slate-400 text-sm">Please wait while your data is being restored.</p>
      </div>

      <!-- Step 4: Success -->
      <div v-else-if="step === 'success'" class="p-8 text-center">
        <div class="w-16 h-16 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 :size="32" class="text-emerald-400" />
        </div>
        <h3 class="text-lg font-semibold text-white mb-2">Backup Restored!</h3>
        <p class="text-slate-400 text-sm">Your data has been successfully imported.</p>
      </div>

      <!-- Step 5: Error -->
      <div v-else-if="step === 'error'" class="p-6 space-y-4">
        <div class="text-center py-4">
          <div class="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle :size="32" class="text-red-400" />
          </div>
          <h3 class="text-lg font-semibold text-white mb-2">Import Failed</h3>
          <p class="text-slate-400 text-sm">{{ errorMessage }}</p>
        </div>

        <div class="flex gap-3">
          <button
            @click="emit('close')"
            class="flex-1 py-3 rounded-lg font-medium bg-slate-700 hover:bg-slate-600 text-white transition-colors"
          >
            Cancel
          </button>
          <button
            @click="reset"
            class="flex-1 py-3 rounded-lg font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
