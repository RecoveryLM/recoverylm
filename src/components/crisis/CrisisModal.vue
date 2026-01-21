<script setup lang="ts">
import { ref } from 'vue'
import { Phone, MessageSquare, Heart, ExternalLink } from 'lucide-vue-next'
import { useCrisis } from '@/composables/useCrisis'

const { dismissModal, getResources } = useCrisis()
const resources = getResources()

const hasAcknowledged = ref(false)

const callNumber = (number: string) => {
  window.location.href = `tel:${number.replace(/\D/g, '')}`
}

const handleDismiss = () => {
  if (hasAcknowledged.value) {
    dismissModal(true)
  }
}
</script>

<template>
  <div
    class="crisis-overlay animate-fade-in"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="crisis-title"
    aria-describedby="crisis-description"
  >
    <div class="w-full max-w-lg mx-4 bg-slate-900 border-2 border-red-600 rounded-2xl shadow-2xl overflow-hidden">
      <!-- Header -->
      <div class="bg-red-900/30 border-b border-red-600/50 p-6">
        <h2 id="crisis-title" class="text-2xl font-bold text-white flex items-center gap-3">
          <Heart class="text-red-500" :size="28" />
          You're Not Alone
        </h2>
        <p id="crisis-description" class="text-red-200 mt-2">
          If you're in crisis or having thoughts of self-harm, please reach out for help right now.
        </p>
      </div>

      <!-- Crisis Resources -->
      <div class="p-6 space-y-4">
        <!-- 988 Suicide & Crisis Lifeline -->
        <button
          @click="callNumber('988')"
          class="w-full bg-red-600 hover:bg-red-500 text-white p-4 rounded-xl flex items-center gap-4 transition-colors shadow-lg"
        >
          <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Phone :size="24" />
          </div>
          <div class="text-left flex-1">
            <div class="font-bold text-lg">Call 988</div>
            <div class="text-red-100 text-sm">Suicide & Crisis Lifeline - 24/7</div>
          </div>
          <ExternalLink :size="20" class="text-red-200" />
        </button>

        <!-- Crisis Text Line -->
        <a
          href="sms:741741&body=HOME"
          class="w-full bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl flex items-center gap-4 transition-colors border border-slate-700"
        >
          <div class="w-12 h-12 bg-indigo-600/30 rounded-full flex items-center justify-center">
            <MessageSquare :size="24" class="text-indigo-400" />
          </div>
          <div class="text-left flex-1">
            <div class="font-bold">Text HOME to 741741</div>
            <div class="text-slate-400 text-sm">Crisis Text Line - 24/7</div>
          </div>
        </a>

        <!-- SAMHSA Helpline -->
        <button
          @click="callNumber('1-800-662-4357')"
          class="w-full bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl flex items-center gap-4 transition-colors border border-slate-700"
        >
          <div class="w-12 h-12 bg-emerald-600/30 rounded-full flex items-center justify-center">
            <Phone :size="24" class="text-emerald-400" />
          </div>
          <div class="text-left flex-1">
            <div class="font-bold">SAMHSA Helpline</div>
            <div class="text-slate-400 text-sm">1-800-662-4357 - 24/7</div>
          </div>
        </button>

        <!-- Emergency Contact (if available) -->
        <div v-if="resources.emergencyContact" class="mt-6 pt-4 border-t border-slate-700">
          <p class="text-slate-400 text-sm mb-3">Your Emergency Contact</p>
          <button
            @click="callNumber(resources.emergencyContact!.phone)"
            class="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-xl flex items-center gap-4 transition-colors"
          >
            <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Phone :size="24" />
            </div>
            <div class="text-left flex-1">
              <div class="font-bold">{{ resources.emergencyContact.name }}</div>
              <div class="text-indigo-200 text-sm">{{ resources.emergencyContact.relationship }}</div>
            </div>
          </button>
        </div>
      </div>

      <!-- Acknowledgment & Dismiss -->
      <div class="p-6 bg-slate-800/50 border-t border-slate-700">
        <label class="flex items-start gap-3 cursor-pointer mb-4">
          <input
            v-model="hasAcknowledged"
            type="checkbox"
            class="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
          />
          <span class="text-slate-300 text-sm">
            I understand that if I'm in immediate danger, I should call 911 or go to my nearest emergency room.
          </span>
        </label>

        <button
          @click="handleDismiss"
          :disabled="!hasAcknowledged"
          class="w-full p-3 rounded-lg text-sm font-medium transition-all"
          :class="hasAcknowledged
            ? 'bg-slate-700 hover:bg-slate-600 text-white'
            : 'bg-slate-800 text-slate-500 cursor-not-allowed'"
        >
          I'm feeling safer now, close this
        </button>
      </div>
    </div>
  </div>
</template>
