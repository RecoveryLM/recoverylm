<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Brain, Lock, Eye, EyeOff, AlertCircle, AlertTriangle, Check } from 'lucide-vue-next'
import { useVault } from '@/composables/useVault'
import * as vault from '@/services/vault'

const router = useRouter()
const { create } = useVault()

const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const error = ref('')
const isLoading = ref(false)
const existingDataWarning = ref(false)
const confirmedOverwrite = ref(false)

const passwordStrength = ref(0)

onMounted(async () => {
  existingDataWarning.value = await vault.hasExistingData()
})

const checkPasswordStrength = () => {
  let strength = 0
  if (password.value.length >= 8) strength++
  if (password.value.length >= 12) strength++
  if (/[A-Z]/.test(password.value)) strength++
  if (/[0-9]/.test(password.value)) strength++
  if (/[^A-Za-z0-9]/.test(password.value)) strength++
  passwordStrength.value = strength
}

const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500']

const createAccount = async () => {
  error.value = ''

  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  if (existingDataWarning.value && !confirmedOverwrite.value) {
    error.value = 'Please confirm that you want to overwrite existing data'
    return
  }

  isLoading.value = true

  try {
    // Create the encrypted vault with the password
    const result = await create(password.value)

    if (result.success) {
      // Go to recovery phrase setup (phrase will be loaded from vault)
      router.push({ name: 'setup-recovery-phrase' })
    } else {
      error.value = 'Failed to create vault. Please try again.'
    }
  } catch (e) {
    console.error('Vault creation error:', e)
    error.value = 'Failed to create account. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
    <div class="w-full max-w-sm space-y-8 animate-fade-in">
      <!-- Logo -->
      <div class="text-center">
        <div class="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Brain class="text-white" :size="32" />
        </div>
        <h1 class="text-2xl font-bold text-white">Create Your Vault</h1>
        <p class="text-slate-400 mt-2">
          Your password encrypts all your data locally.
          <span class="text-amber-400">We cannot recover it if lost.</span>
        </p>
      </div>

      <!-- Setup Form -->
      <form @submit.prevent="createAccount" class="space-y-4">
        <!-- Password -->
        <div>
          <label class="text-slate-300 text-sm block mb-2">Create Password</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock :size="18" class="text-slate-500" />
            </div>
            <input
              v-model="password"
              @input="checkPasswordStrength"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Enter a strong password"
              class="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
            >
              <EyeOff v-if="showPassword" :size="18" />
              <Eye v-else :size="18" />
            </button>
          </div>

          <!-- Password Strength -->
          <div v-if="password" class="mt-2">
            <div class="flex gap-1 mb-1">
              <div
                v-for="i in 5"
                :key="i"
                class="h-1 flex-1 rounded-full transition-colors"
                :class="i <= passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-slate-700'"
              ></div>
            </div>
            <p class="text-xs" :class="passwordStrength >= 3 ? 'text-emerald-400' : 'text-slate-500'">
              {{ strengthLabels[passwordStrength - 1] || 'Too short' }}
            </p>
          </div>
        </div>

        <!-- Confirm Password -->
        <div>
          <label class="text-slate-300 text-sm block mb-2">Confirm Password</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock :size="18" class="text-slate-500" />
            </div>
            <input
              v-model="confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Confirm your password"
              class="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <div
              v-if="confirmPassword && confirmPassword === password"
              class="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <Check :size="18" class="text-emerald-500" />
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle :size="16" />
          {{ error }}
        </div>

        <!-- Existing Data Warning -->
        <div v-if="existingDataWarning" class="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <AlertTriangle :size="20" class="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p class="text-red-200 text-sm font-medium">Existing data found on this device</p>
              <p class="text-red-300/70 text-sm mt-1">
                Creating a new vault will permanently delete all existing recovery data, including
                journal entries, chat history, and check-in records. This cannot be undone.
              </p>
              <label class="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="confirmedOverwrite"
                  class="w-4 h-4 rounded border-red-600 bg-slate-800 text-red-600 focus:ring-red-500"
                />
                <span class="text-red-200 text-sm">I understand, overwrite my existing data</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Info Box -->
        <div class="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4">
          <p class="text-amber-200 text-sm">
            <strong>Important:</strong> Your password encrypts your data using AES-256.
            If you forget your password, you will need your recovery phrase to access your data.
            Without both, your data is permanently unrecoverable. This is by design for your privacy.
          </p>
        </div>

        <!-- Create Button -->
        <button
          type="submit"
          :disabled="isLoading || !password || !confirmPassword"
          class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
        >
          {{ isLoading ? 'Creating Vault...' : 'Create Secure Vault' }}
        </button>
      </form>

      <!-- Back to Login -->
      <div class="text-center">
        <button
          @click="router.push({ name: 'unlock' })"
          class="text-slate-500 hover:text-slate-300 text-sm transition-colors"
        >
          Already have an account? Unlock vault
        </button>
      </div>
    </div>
  </div>
</template>
