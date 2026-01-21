<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { X, Key, Eye, EyeOff, Copy, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-vue-next'
import { useVault } from '@/composables/useVault'

const emit = defineEmits<{
  close: []
}>()

const { getRecoveryPhrase } = useVault()

const phrase = ref<string[] | null>(null)
const isLoading = ref(true)
const isRevealed = ref(false)
const copied = ref(false)
const hasNoPhrase = ref(false)

onMounted(async () => {
  try {
    phrase.value = await getRecoveryPhrase()
    hasNoPhrase.value = phrase.value === null
  } catch (error) {
    console.error('Failed to load recovery phrase:', error)
    hasNoPhrase.value = true
  } finally {
    isLoading.value = false
  }
})

const copyToClipboard = async () => {
  if (!phrase.value) return

  try {
    await navigator.clipboard.writeText(phrase.value.join(' '))
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy:', error)
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-lg mx-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-slate-700">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-amber-600/20 rounded-full flex items-center justify-center">
            <Key :size="20" class="text-amber-400" />
          </div>
          <h2 class="text-xl font-bold text-white">Recovery Phrase</h2>
        </div>
        <button
          @click="emit('close')"
          class="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X :size="20" />
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="p-8 flex items-center justify-center">
        <Loader2 :size="32" class="text-slate-400 animate-spin" />
      </div>

      <!-- No Phrase Available -->
      <div v-else-if="hasNoPhrase" class="p-6">
        <div class="text-center py-4">
          <div class="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle :size="32" class="text-slate-500" />
          </div>
          <h3 class="text-lg font-semibold text-white mb-2">No Recovery Phrase</h3>
          <p class="text-slate-400 text-sm max-w-sm mx-auto">
            Your account was created before recovery phrases were implemented.
            To get a recovery phrase, you would need to create a new account and restore your data from a backup.
          </p>
        </div>
        <button
          @click="emit('close')"
          class="w-full mt-4 py-3 rounded-lg font-medium bg-slate-700 hover:bg-slate-600 text-white transition-colors"
        >
          Close
        </button>
      </div>

      <!-- Phrase Display -->
      <div v-else class="p-6 space-y-4">
        <!-- Warning -->
        <div class="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4 flex gap-3">
          <AlertTriangle :size="20" class="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 class="font-medium text-amber-200 mb-1">Keep this phrase secure</h4>
            <p class="text-amber-200/70 text-sm">
              Anyone with this phrase can access your encrypted data. Write it down on paper and store it in a safe place. Never share it online.
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
        <div class="flex gap-3">
          <button
            v-if="isRevealed"
            @click="isRevealed = false"
            class="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium bg-slate-700 hover:bg-slate-600 text-white transition-colors"
          >
            <EyeOff :size="18" />
            Hide
          </button>
          <button
            @click="copyToClipboard"
            :disabled="!isRevealed"
            class="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors"
            :class="isRevealed
              ? copied
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'"
          >
            <CheckCircle2 v-if="copied" :size="18" />
            <Copy v-else :size="18" />
            {{ copied ? 'Copied!' : 'Copy to Clipboard' }}
          </button>
        </div>

        <!-- Close Button -->
        <button
          @click="emit('close')"
          class="w-full py-3 rounded-lg font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>
