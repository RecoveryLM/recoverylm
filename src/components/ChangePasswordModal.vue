<script setup lang="ts">
import { ref } from 'vue'
import { X, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-vue-next'
import { useVault } from '@/composables/useVault'

const emit = defineEmits<{
  close: []
}>()

const { changePassword } = useVault()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const isChanging = ref(false)
const error = ref<string | null>(null)
const success = ref(false)

const passwordStrength = ref<'weak' | 'medium' | 'strong'>('weak')
const passwordsMatch = ref(true)

const validatePassword = (password: string): 'weak' | 'medium' | 'strong' => {
  if (password.length < 8) return 'weak'

  let score = 0
  if (password.length >= 12) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score >= 4) return 'strong'
  if (score >= 2) return 'medium'
  return 'weak'
}

const onNewPasswordInput = () => {
  passwordStrength.value = validatePassword(newPassword.value)
  passwordsMatch.value = confirmPassword.value === '' || confirmPassword.value === newPassword.value
}

const onConfirmPasswordInput = () => {
  passwordsMatch.value = confirmPassword.value === newPassword.value
}

const canSubmit = () => {
  return (
    currentPassword.value.length > 0 &&
    newPassword.value.length >= 8 &&
    confirmPassword.value === newPassword.value &&
    !isChanging.value
  )
}

const handleSubmit = async () => {
  if (!canSubmit()) return

  error.value = null
  isChanging.value = true

  try {
    const result = await changePassword(currentPassword.value, newPassword.value)

    if (result) {
      success.value = true
      setTimeout(() => {
        emit('close')
      }, 1500)
    } else {
      error.value = 'Current password is incorrect'
    }
  } catch (e) {
    console.error('Change password error:', e)
    error.value = 'Failed to change password. Please try again.'
  } finally {
    isChanging.value = false
  }
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
            <Lock :size="20" class="text-indigo-400" />
          </div>
          <h2 class="text-xl font-bold text-white">Change Password</h2>
        </div>
        <button
          @click="emit('close')"
          class="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X :size="20" />
        </button>
      </div>

      <!-- Success State -->
      <div v-if="success" class="p-6 text-center">
        <div class="w-16 h-16 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 :size="32" class="text-emerald-400" />
        </div>
        <h3 class="text-lg font-semibold text-white mb-2">Password Changed!</h3>
        <p class="text-slate-400">Your vault password has been updated successfully.</p>
      </div>

      <!-- Form -->
      <form v-else @submit.prevent="handleSubmit" class="p-6 space-y-4">
        <!-- Error Alert -->
        <div v-if="error" class="flex items-center gap-3 p-4 bg-red-900/30 border border-red-600/30 rounded-lg">
          <AlertCircle :size="20" class="text-red-400 shrink-0" />
          <p class="text-red-200 text-sm">{{ error }}</p>
        </div>

        <!-- Current Password -->
        <div>
          <label class="text-slate-300 text-sm block mb-2">Current Password</label>
          <div class="relative">
            <input
              v-model="currentPassword"
              :type="showCurrentPassword ? 'text' : 'password'"
              class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:border-indigo-500"
              placeholder="Enter current password"
            />
            <button
              type="button"
              @click="showCurrentPassword = !showCurrentPassword"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <Eye v-if="!showCurrentPassword" :size="20" />
              <EyeOff v-else :size="20" />
            </button>
          </div>
        </div>

        <!-- New Password -->
        <div>
          <label class="text-slate-300 text-sm block mb-2">New Password</label>
          <div class="relative">
            <input
              v-model="newPassword"
              @input="onNewPasswordInput"
              :type="showNewPassword ? 'text' : 'password'"
              class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:border-indigo-500"
              placeholder="Enter new password (min. 8 characters)"
            />
            <button
              type="button"
              @click="showNewPassword = !showNewPassword"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <Eye v-if="!showNewPassword" :size="20" />
              <EyeOff v-else :size="20" />
            </button>
          </div>
          <!-- Password Strength Indicator -->
          <div v-if="newPassword.length > 0" class="mt-2 flex items-center gap-2">
            <div class="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div
                class="h-full transition-all duration-300"
                :class="{
                  'w-1/3 bg-red-500': passwordStrength === 'weak',
                  'w-2/3 bg-yellow-500': passwordStrength === 'medium',
                  'w-full bg-emerald-500': passwordStrength === 'strong'
                }"
              ></div>
            </div>
            <span
              class="text-xs"
              :class="{
                'text-red-400': passwordStrength === 'weak',
                'text-yellow-400': passwordStrength === 'medium',
                'text-emerald-400': passwordStrength === 'strong'
              }"
            >
              {{ passwordStrength === 'weak' ? 'Weak' : passwordStrength === 'medium' ? 'Medium' : 'Strong' }}
            </span>
          </div>
        </div>

        <!-- Confirm Password -->
        <div>
          <label class="text-slate-300 text-sm block mb-2">Confirm New Password</label>
          <div class="relative">
            <input
              v-model="confirmPassword"
              @input="onConfirmPasswordInput"
              :type="showConfirmPassword ? 'text' : 'password'"
              class="w-full bg-slate-800 border rounded-lg px-4 py-3 pr-12 text-white focus:outline-none"
              :class="!passwordsMatch && confirmPassword.length > 0
                ? 'border-red-500 focus:border-red-500'
                : 'border-slate-600 focus:border-indigo-500'"
              placeholder="Confirm new password"
            />
            <button
              type="button"
              @click="showConfirmPassword = !showConfirmPassword"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <Eye v-if="!showConfirmPassword" :size="20" />
              <EyeOff v-else :size="20" />
            </button>
          </div>
          <p v-if="!passwordsMatch && confirmPassword.length > 0" class="text-red-400 text-sm mt-1">
            Passwords do not match
          </p>
        </div>

        <!-- Info Note -->
        <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <p class="text-slate-400 text-sm">
            Changing your password will re-encrypt all your data. This may take a moment depending on how much data you have.
          </p>
        </div>

        <!-- Buttons -->
        <div class="flex gap-3 pt-2">
          <button
            type="button"
            @click="emit('close')"
            class="flex-1 py-3 rounded-lg font-medium bg-slate-700 hover:bg-slate-600 text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="!canSubmit()"
            class="flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            :class="canSubmit()
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'"
          >
            <Loader2 v-if="isChanging" :size="18" class="animate-spin" />
            {{ isChanging ? 'Changing...' : 'Change Password' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
