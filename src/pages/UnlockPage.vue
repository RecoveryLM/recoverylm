<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Brain, Lock, Eye, EyeOff, AlertCircle, Shield, Sparkles, ArrowLeft } from 'lucide-vue-next'
import { useVault } from '@/composables/useVault'

const router = useRouter()
const { unlock: vaultUnlock, needsSetup, isUnlocked } = useVault()

const password = ref('')
const showPassword = ref(false)
const error = ref('')
const isLoading = ref(false)
const showLoginForm = ref(false)
const userClickedLogin = ref(false) // Track if user explicitly clicked "Log In"

// Redirect if already unlocked, or show login form for returning users
onMounted(() => {
  if (isUnlocked.value) {
    router.push({ name: 'dashboard' })
  } else if (!needsSetup.value) {
    // Existing account found - skip landing page, show login form
    showLoginForm.value = true
    userClickedLogin.value = false // Auto-shown, not user action
  }
})

const unlock = async () => {
  if (!password.value) {
    error.value = 'Please enter your password'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    const success = await vaultUnlock(password.value)

    if (success) {
      router.push({ name: 'dashboard' })
    } else {
      error.value = 'Incorrect password. Please try again.'
    }
  } catch (e) {
    console.error('Unlock error:', e)
    error.value = 'Incorrect password. Please try again.'
  } finally {
    isLoading.value = false
  }
}

const goToSetup = () => {
  router.push({ name: 'setup' })
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
    <!-- Landing Page with Login/Sign Up Options -->
    <div v-if="!showLoginForm" class="w-full max-w-md space-y-8 animate-fade-in">
      <!-- Logo -->
      <div class="text-center">
        <div class="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20">
          <Brain class="text-white" :size="40" />
        </div>
        <h1 class="text-3xl font-bold text-white">RecoveryLM</h1>
        <p class="text-slate-400 mt-3 text-lg">Your private recovery companion</p>
      </div>

      <!-- Features -->
      <div class="space-y-4 py-4">
        <div class="flex items-start gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
          <div class="w-10 h-10 bg-emerald-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield :size="20" class="text-emerald-400" />
          </div>
          <div>
            <h3 class="text-white font-medium">Secure Vault</h3>
            <p class="text-slate-400 text-sm mt-1">Your data is encrypted with AES-256 and never leaves your device. Only you can access it.</p>
          </div>
        </div>
        <div class="flex items-start gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
          <div class="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles :size="20" class="text-indigo-400" />
          </div>
          <div>
            <h3 class="text-white font-medium">AI-Powered Support</h3>
            <p class="text-slate-400 text-sm mt-1">Remi, your recovery companion, offers evidence-based tools and genuine conversation 24/7.</p>
          </div>
        </div>
      </div>

      <!-- Auth Buttons -->
      <div class="space-y-3">
        <button
          @click="goToSetup"
          class="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-semibold transition-colors text-lg shadow-lg shadow-indigo-600/20"
        >
          Create Account
        </button>
        <button
          @click="showLoginForm = true; userClickedLogin = true"
          class="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white py-4 rounded-xl font-semibold transition-colors text-lg"
        >
          Log In
        </button>
      </div>

      <!-- Privacy Note -->
      <p class="text-slate-500 text-xs text-center">
        No email required. No data uploaded. Everything stays on your device.
      </p>
    </div>

    <!-- Login Form -->
    <div v-else class="w-full max-w-sm space-y-8 animate-fade-in">
      <!-- Back Button - only show if user explicitly clicked "Log In" from landing -->
      <button
        v-if="userClickedLogin"
        @click="showLoginForm = false; userClickedLogin = false; error = ''; password = ''"
        class="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft :size="18" />
        Back
      </button>

      <!-- Logo -->
      <div class="text-center">
        <div class="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Brain class="text-white" :size="32" />
        </div>
        <h1 class="text-2xl font-bold text-white">Welcome Back</h1>
        <p class="text-slate-400 mt-2">Enter your password to unlock your vault</p>
      </div>

      <!-- No Vault Warning -->
      <div v-if="needsSetup" class="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-700/50 rounded-xl">
        <AlertCircle :size="20" class="text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p class="text-amber-200 text-sm">No vault found on this device.</p>
          <button
            @click="goToSetup"
            class="text-amber-400 hover:text-amber-300 text-sm mt-1 underline"
          >
            Create a new account instead
          </button>
        </div>
      </div>

      <!-- Unlock Form -->
      <form v-else @submit.prevent="unlock" class="space-y-4">
        <div>
          <label class="sr-only">Password</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock :size="18" class="text-slate-500" />
            </div>
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Enter your password"
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
        </div>

        <!-- Error Message -->
        <div v-if="error" class="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle :size="16" />
          {{ error }}
        </div>

        <!-- Unlock Button -->
        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
        >
          {{ isLoading ? 'Unlocking...' : 'Unlock' }}
        </button>
      </form>

      <!-- Recovery Link -->
      <div v-if="!needsSetup" class="text-center">
        <button
          @click="router.push({ name: 'recovery' })"
          class="text-slate-500 hover:text-slate-300 text-sm transition-colors"
        >
          Forgot password? Use recovery phrase
        </button>
      </div>

      <!-- Privacy Note -->
      <p class="text-slate-600 text-xs text-center">
        Your data is encrypted locally. We cannot access or recover your data without your password.
      </p>
    </div>
  </div>
</template>
