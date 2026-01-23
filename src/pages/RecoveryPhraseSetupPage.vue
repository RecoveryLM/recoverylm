<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Key, Eye, EyeOff, AlertTriangle, ArrowRight, Shield } from 'lucide-vue-next'
import { useVault } from '@/composables/useVault'

const router = useRouter()
const { getRecoveryPhrase } = useVault()

// Phases: 'display' | 'verify' | 'complete'
const phase = ref<'display' | 'verify' | 'complete'>('display')

// Phrase state
const phrase = ref<string[] | null>(null)
const isRevealed = ref(false)
const isLoading = ref(true)

// Verification state
const verificationIndices = ref<number[]>([])
const verificationInputs = ref<string[]>(['', '', ''])
const verificationError = ref('')

// Get phrase from vault (always use secure storage, not history state)
onMounted(async () => {
  try {
    // Always get from vault to avoid sensitive data in history state
    phrase.value = await getRecoveryPhrase()

    if (!phrase.value) {
      // No phrase available, redirect back to setup
      router.replace({ name: 'setup' })
      return
    }

    // Generate 3 random indices for verification (sorted for display)
    const indices = new Set<number>()
    while (indices.size < 3) {
      indices.add(Math.floor(Math.random() * 12))
    }
    verificationIndices.value = Array.from(indices).sort((a, b) => a - b)
  } catch (error) {
    console.error('Failed to load recovery phrase:', error)
    router.replace({ name: 'setup' })
  } finally {
    isLoading.value = false
  }
})

// Clear phrase from memory on navigation
onUnmounted(() => {
  phrase.value = null
})

const proceedToVerify = () => {
  if (!isRevealed.value) return
  phase.value = 'verify'
}

const verifyWords = () => {
  if (!phrase.value) return

  verificationError.value = ''

  // Check each word
  for (let i = 0; i < 3; i++) {
    const expectedWord = phrase.value[verificationIndices.value[i]]
    const enteredWord = verificationInputs.value[i].toLowerCase().trim()

    if (enteredWord !== expectedWord) {
      verificationError.value = `Word #${verificationIndices.value[i] + 1} is incorrect. Please check and try again.`
      return
    }
  }

  // All words correct - clear phrase from memory immediately
  phrase.value = null
  phase.value = 'complete'
}

const continueToOnboarding = () => {
  router.push({ name: 'onboarding' })
}

const goBackToDisplay = () => {
  phase.value = 'display'
  verificationInputs.value = ['', '', '']
  verificationError.value = ''
}

const allVerificationFilled = computed(() => {
  return verificationInputs.value.every(input => input.trim().length > 0)
})
</script>

<template>
  <div class="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
    <div class="w-full max-w-lg space-y-6 animate-fade-in">
      <!-- Header -->
      <div class="text-center">
        <div class="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Key class="text-white" :size="32" />
        </div>
        <h1 class="text-2xl font-bold text-white">
          {{ phase === 'display' ? 'Save Your Recovery Phrase' : phase === 'verify' ? 'Verify Your Phrase' : 'You\'re All Set!' }}
        </h1>
        <p class="text-slate-400 mt-2">
          {{ phase === 'display'
            ? 'Write down these 12 words in order and keep them safe'
            : phase === 'verify'
              ? 'Confirm you\'ve saved your phrase by entering the words below'
              : 'Your recovery phrase has been verified' }}
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <!-- Display Phase -->
      <template v-else-if="phase === 'display'">
        <!-- Warning -->
        <div class="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4 flex gap-3">
          <AlertTriangle :size="20" class="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 class="font-medium text-amber-200 mb-1">Keep this phrase secure</h4>
            <p class="text-amber-200/70 text-sm">
              Anyone with this phrase can access your encrypted data. Write it down on paper and store it in a safe place. Never share it online or store it digitally.
            </p>
          </div>
        </div>

        <!-- Phrase Grid -->
        <div class="relative">
          <div
            class="grid grid-cols-3 gap-2 p-4 bg-slate-800 rounded-lg border border-slate-700 transition-all"
            :class="!isRevealed ? 'blur-md select-none' : ''"
          >
            <div
              v-for="(word, index) in phrase"
              :key="index"
              class="bg-slate-700 rounded px-3 py-2 text-center"
            >
              <span class="text-slate-500 text-xs">{{ index + 1 }}.</span>
              <span class="text-white text-sm ml-1">{{ word }}</span>
            </div>
          </div>

          <!-- Reveal Overlay -->
          <div
            v-if="!isRevealed"
            class="absolute inset-0 flex items-center justify-center bg-slate-800/50 rounded-lg cursor-pointer"
            @click="isRevealed = true"
          >
            <div class="text-center">
              <div class="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-2">
                <Eye :size="24" class="text-slate-300" />
              </div>
              <p class="text-slate-300 font-medium">Click to reveal</p>
              <p class="text-slate-500 text-sm">Make sure no one is watching</p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div v-if="isRevealed" class="flex gap-3">
          <button
            @click="isRevealed = false"
            class="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium bg-slate-700 hover:bg-slate-600 text-white transition-colors"
          >
            <EyeOff :size="18" />
            Hide
          </button>
        </div>

        <!-- Continue Button -->
        <button
          @click="proceedToVerify"
          :disabled="!isRevealed"
          class="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors"
          :class="isRevealed
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
            : 'bg-indigo-800 text-indigo-300 cursor-not-allowed'"
        >
          I've saved my phrase
          <ArrowRight :size="18" />
        </button>
      </template>

      <!-- Verify Phase -->
      <template v-else-if="phase === 'verify'">
        <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <p class="text-slate-400 text-sm">
            Enter the following words from your recovery phrase to confirm you've saved it correctly.
          </p>
        </div>

        <div class="space-y-4">
          <div v-for="(index, i) in verificationIndices" :key="index">
            <label class="text-slate-300 text-sm block mb-2">
              Word #{{ index + 1 }}
            </label>
            <input
              v-model="verificationInputs[i]"
              type="text"
              :placeholder="`Enter word #${index + 1}`"
              class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
            />
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="verificationError" class="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-600/30 rounded-lg p-3">
          <AlertTriangle :size="16" class="shrink-0" />
          {{ verificationError }}
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <button
            @click="goBackToDisplay"
            class="flex-1 py-3 rounded-lg font-medium bg-slate-700 hover:bg-slate-600 text-white transition-colors"
          >
            Back
          </button>
          <button
            @click="verifyWords"
            :disabled="!allVerificationFilled"
            class="flex-1 py-3 rounded-lg font-semibold transition-colors"
            :class="allVerificationFilled
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-indigo-800 text-indigo-300 cursor-not-allowed'"
          >
            Verify
          </button>
        </div>
      </template>

      <!-- Complete Phase -->
      <template v-else-if="phase === 'complete'">
        <div class="text-center py-4">
          <div class="w-20 h-20 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield :size="40" class="text-emerald-400" />
          </div>
          <h3 class="text-lg font-semibold text-white mb-2">Recovery Phrase Verified</h3>
          <p class="text-slate-400 text-sm">
            Your account is now protected. If you ever forget your password, you can use your recovery phrase to regain access to your data.
          </p>
        </div>

        <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <h4 class="font-medium text-white mb-2">Remember:</h4>
          <ul class="text-slate-400 text-sm space-y-1 list-disc list-inside">
            <li>Keep your recovery phrase in a safe place</li>
            <li>Never share it with anyone</li>
            <li>We cannot recover your data without it</li>
          </ul>
        </div>

        <button
          @click="continueToOnboarding"
          class="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          Continue to Setup
          <ArrowRight :size="18" />
        </button>
      </template>
    </div>
  </div>
</template>
