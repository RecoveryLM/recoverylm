<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Key, Lock, Eye, EyeOff, AlertCircle, ArrowLeft, Check } from 'lucide-vue-next'
import { useVault } from '@/composables/useVault'

const router = useRouter()
const { resetPasswordWithRecoveryPhrase, isLoading } = useVault()

const recoveryPhrase = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const error = ref('')
const phraseVerified = ref(false)

const phraseWords = computed(() => {
  return recoveryPhrase.value
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0)
})

const wordCount = computed(() => phraseWords.value.length)

const passwordStrength = ref(0)

const checkPasswordStrength = () => {
  let strength = 0
  if (newPassword.value.length >= 8) strength++
  if (newPassword.value.length >= 12) strength++
  if (/[A-Z]/.test(newPassword.value)) strength++
  if (/[0-9]/.test(newPassword.value)) strength++
  if (/[^A-Za-z0-9]/.test(newPassword.value)) strength++
  passwordStrength.value = strength
}

const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500']

const validatePhrase = () => {
  error.value = ''

  if (wordCount.value !== 12) {
    error.value = `Please enter exactly 12 words (you have ${wordCount.value})`
    return
  }

  phraseVerified.value = true
}

const resetPassword = async () => {
  error.value = ''

  if (newPassword.value.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  const success = await resetPasswordWithRecoveryPhrase(phraseWords.value, newPassword.value)

  if (success) {
    router.push({ name: 'dashboard' })
  } else {
    error.value = 'Invalid recovery phrase. Please check your words and try again.'
    phraseVerified.value = false
  }
}

const goBack = () => {
  if (phraseVerified.value) {
    phraseVerified.value = false
    error.value = ''
  } else {
    router.push({ name: 'unlock' })
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
    <div class="w-full max-w-sm space-y-8 animate-fade-in">
      <!-- Back Button -->
      <button
        @click="goBack"
        class="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft :size="18" />
        {{ phraseVerified ? 'Back' : 'Back to Login' }}
      </button>

      <!-- Header -->
      <div class="text-center">
        <div class="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Key class="text-white" :size="32" />
        </div>
        <h1 class="text-2xl font-bold text-white">Recover Your Account</h1>
        <p class="text-slate-400 mt-2">
          {{ phraseVerified ? 'Set a new password for your vault' : 'Enter your 12-word recovery phrase' }}
        </p>
      </div>

      <!-- Recovery Phrase Input -->
      <form v-if="!phraseVerified" @submit.prevent="validatePhrase" class="space-y-4">
        <div>
          <label class="text-slate-300 text-sm block mb-2">Recovery Phrase</label>
          <textarea
            v-model="recoveryPhrase"
            placeholder="Enter your 12 words separated by spaces..."
            rows="4"
            class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none font-mono text-sm"
          ></textarea>
          <p class="text-slate-500 text-xs mt-1">
            {{ wordCount }}/12 words entered
          </p>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle :size="16" />
          {{ error }}
        </div>

        <!-- Info Box -->
        <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <p class="text-slate-400 text-sm">
            Your recovery phrase was shown when you created your account.
            Enter all 12 words in the correct order, separated by spaces.
          </p>
        </div>

        <!-- Continue Button -->
        <button
          type="submit"
          :disabled="wordCount !== 12"
          class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
        >
          Verify Recovery Phrase
        </button>
      </form>

      <!-- New Password Form -->
      <form v-else @submit.prevent="resetPassword" class="space-y-4">
        <!-- New Password -->
        <div>
          <label class="text-slate-300 text-sm block mb-2">New Password</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock :size="18" class="text-slate-500" />
            </div>
            <input
              v-model="newPassword"
              @input="checkPasswordStrength"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Enter a new password"
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
          <div v-if="newPassword" class="mt-2">
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
          <label class="text-slate-300 text-sm block mb-2">Confirm New Password</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock :size="18" class="text-slate-500" />
            </div>
            <input
              v-model="confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Confirm your new password"
              class="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <div
              v-if="confirmPassword && confirmPassword === newPassword"
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

        <!-- Info Box -->
        <div class="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4">
          <p class="text-amber-200 text-sm">
            This will replace your current password. Your encrypted data will remain intact and will be re-encrypted with your new password.
          </p>
        </div>

        <!-- Reset Button -->
        <button
          type="submit"
          :disabled="isLoading || !newPassword || !confirmPassword"
          class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
        >
          {{ isLoading ? 'Resetting Password...' : 'Reset Password' }}
        </button>
      </form>
    </div>
  </div>
</template>
