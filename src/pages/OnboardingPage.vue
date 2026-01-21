<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { OnboardingStep, RecoveryPhilosophy, RecoveryStage, VulnerabilityPattern } from '@/types'
import { generateId, today } from '@/types'
import { useVault } from '@/composables/useVault'

const router = useRouter()
const { saveProfile, saveEmergencyContact: saveEmergencyContactToVault } = useVault()

// Onboarding state
const currentStep = ref<OnboardingStep>('welcome')
const collectedData = ref<{
  displayName?: string
  philosophy?: RecoveryPhilosophy
  substancesOfFocus?: string[]
  recoveryStage?: RecoveryStage
  vulnerabilityPattern?: VulnerabilityPattern
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelationship?: string
  commitmentStatement?: string
}>({})

const STEP_ORDER: OnboardingStep[] = [
  'welcome', 'disclaimer', 'name', 'philosophy', 'substance',
  'stage', 'vulnerability', 'emergency-contact', 'commitment', 'complete'
]

const currentStepIndex = computed(() => STEP_ORDER.indexOf(currentStep.value))
const progress = computed(() => ((currentStepIndex.value) / (STEP_ORDER.length - 1)) * 100)

const next = () => {
  const nextIndex = currentStepIndex.value + 1
  if (nextIndex < STEP_ORDER.length) {
    currentStep.value = STEP_ORDER[nextIndex]
  }
}

const back = () => {
  const prevIndex = currentStepIndex.value - 1
  if (prevIndex >= 0) {
    currentStep.value = STEP_ORDER[prevIndex]
  }
}

const complete = async () => {
  const isSaving = ref(true)

  try {
    // Save user profile to vault
    await saveProfile({
      id: generateId(),
      displayName: collectedData.value.displayName ?? 'User',
      createdAt: Date.now(),
      philosophy: collectedData.value.philosophy ?? 'Secular',
      substancesOfFocus: collectedData.value.substancesOfFocus ?? [],
      recoveryStage: collectedData.value.recoveryStage ?? 'early',
      vulnerabilityPattern: collectedData.value.vulnerabilityPattern ?? 'both',
      commitmentStatement: collectedData.value.commitmentStatement ?? '',
      onboardingComplete: true,
      sobrietyStartDate: today()
    })

    // Save emergency contact if provided
    if (collectedData.value.emergencyContactName && collectedData.value.emergencyContactPhone) {
      await saveEmergencyContactToVault({
        id: generateId(),
        name: collectedData.value.emergencyContactName,
        relationship: collectedData.value.emergencyContactRelationship ?? 'Emergency Contact',
        phone: collectedData.value.emergencyContactPhone,
        canBeNotifiedInCrisis: true
      })
    }

    // Redirect to dashboard
    router.push({ name: 'dashboard' })
  } catch (error) {
    console.error('Failed to save onboarding data:', error)
    // Still navigate but log the error
    router.push({ name: 'dashboard' })
  } finally {
    isSaving.value = false
  }
}

// Form values
const nameInput = ref('')
const substanceInput = ref('')
const commitmentInput = ref('')
const emergencyName = ref('')
const emergencyPhone = ref('')
const emergencyRelationship = ref('')

const philosophyOptions = [
  { value: 'SMART', label: 'SMART Recovery', description: 'Science-based, focuses on self-empowerment and cognitive-behavioral techniques' },
  { value: 'RecoveryDharma', label: 'Recovery Dharma', description: 'Buddhist-inspired, meditation-focused' },
  { value: '12Step', label: '12-Step Programs', description: 'AA/NA tradition, spiritual foundation' },
  { value: 'Secular', label: 'Secular/Independent', description: 'Non-affiliated, evidence-based' },
  { value: 'Other', label: 'Exploring', description: 'Not sure yet, want to explore together' },
]

const stageOptions = [
  { value: 'considering', label: 'Considering', description: 'Thinking about making a change' },
  { value: 'early', label: 'Early Recovery', description: 'Days to weeks, building foundation' },
  { value: 'established', label: 'Established', description: 'Months in, working on maintenance' },
  { value: 'maintenance', label: 'Long-term', description: 'Years of recovery, deepening the work' },
]

const vulnerabilityOptions = [
  { value: 'craving', label: 'Acute Cravings', description: 'Intense urges that demand immediate relief. The challenge is riding them out.' },
  { value: 'rationalization', label: 'Rationalization', description: 'You handle urges okay, but persuasive internal arguments emerge when things are going well.' },
  { value: 'both', label: 'Both', description: 'You experience both acute cravings and rationalization patterns.' },
]

const saveName = () => {
  if (nameInput.value.trim()) {
    collectedData.value.displayName = nameInput.value.trim()
    next()
  }
}

const savePhilosophy = (value: RecoveryPhilosophy) => {
  collectedData.value.philosophy = value
  next()
}

const saveSubstance = () => {
  if (substanceInput.value.trim()) {
    collectedData.value.substancesOfFocus = [substanceInput.value.trim()]
  }
  next()
}

const saveStage = (value: RecoveryStage) => {
  collectedData.value.recoveryStage = value
  next()
}

const saveVulnerability = (value: VulnerabilityPattern) => {
  collectedData.value.vulnerabilityPattern = value
  next()
}

const saveEmergencyContact = () => {
  if (emergencyName.value && emergencyPhone.value) {
    collectedData.value.emergencyContactName = emergencyName.value
    collectedData.value.emergencyContactPhone = emergencyPhone.value
    collectedData.value.emergencyContactRelationship = emergencyRelationship.value
    next()
  }
}

const saveCommitment = () => {
  if (commitmentInput.value.trim()) {
    collectedData.value.commitmentStatement = commitmentInput.value.trim()
  }
  next()
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 flex flex-col">
    <!-- Progress Bar -->
    <div class="h-1 bg-slate-800">
      <div
        class="h-full bg-indigo-600 transition-all duration-500"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>

    <!-- Content -->
    <div class="flex-1 flex flex-col max-w-2xl mx-auto w-full p-6">
      <!-- Remi Avatar + Message Container -->
      <div class="flex items-start gap-4 mb-8 animate-fade-in">
        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex-shrink-0 flex items-center justify-center text-white font-bold text-lg shadow-lg">
          R
        </div>
        <div class="flex-1 bg-slate-800 text-slate-200 p-6 rounded-2xl rounded-tl-sm border border-slate-700 shadow-md">

          <!-- Welcome -->
          <template v-if="currentStep === 'welcome'">
            <p class="mb-4">Hello. I'm Remi, and I'm here to support you in your recovery journey.</p>
            <p class="mb-6">Before we begin, let me learn a bit about you so I can be more helpful.</p>
            <button @click="next" class="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium transition-colors">
              Let's Begin
            </button>
          </template>

          <!-- Disclaimer -->
          <template v-else-if="currentStep === 'disclaimer'">
            <p class="mb-4">Before we continue, I want to be clear about what I am and what I'm not.</p>
            <p class="mb-4">I am <strong>not</strong> a doctor, therapist, or replacement for professional help. I'm a supportive tool—think of me as a knowledgeable companion who's always available to help you practice the skills that support recovery.</p>
            <p class="mb-6">If I ever sense you may be in danger, I may suggest reaching out to your support network or provide crisis resources. <span class="text-emerald-400">Your safety comes first.</span></p>
            <button @click="next" class="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium transition-colors">
              I Understand
            </button>
          </template>

          <!-- Name -->
          <template v-else-if="currentStep === 'name'">
            <p class="mb-6">What would you like me to call you?</p>
            <input
              v-model="nameInput"
              type="text"
              placeholder="Your name"
              class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 focus:outline-none mb-4"
              @keyup.enter="saveName"
            />
            <button
              @click="saveName"
              :disabled="!nameInput.trim()"
              class="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Continue
            </button>
          </template>

          <!-- Philosophy -->
          <template v-else-if="currentStep === 'philosophy'">
            <p class="mb-2">Nice to meet you, {{ collectedData.displayName }}.</p>
            <p class="mb-6">Different people connect with different approaches to recovery. Which of these resonates most with you?</p>
            <div class="space-y-3">
              <button
                v-for="option in philosophyOptions"
                :key="option.value"
                @click="savePhilosophy(option.value as RecoveryPhilosophy)"
                class="w-full text-left p-4 rounded-lg border transition-colors hover:border-indigo-500 hover:bg-indigo-500/10"
                :class="collectedData.philosophy === option.value ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-700/30'"
              >
                <div class="font-medium text-white">{{ option.label }}</div>
                <div class="text-sm text-slate-400 mt-1">{{ option.description }}</div>
              </button>
            </div>
          </template>

          <!-- Substance -->
          <template v-else-if="currentStep === 'substance'">
            <p class="mb-4">What substance or behavior are you working on?</p>
            <p class="text-slate-400 text-sm mb-6">You can share as much or as little as you're comfortable with. We can always adjust this later.</p>
            <input
              v-model="substanceInput"
              type="text"
              placeholder="e.g., Alcohol, Cannabis, etc."
              class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 focus:outline-none mb-4"
            />
            <div class="flex gap-3">
              <button @click="saveSubstance" class="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                Continue
              </button>
              <button @click="next" class="text-slate-400 hover:text-white px-4 py-2 transition-colors">
                Skip for now
              </button>
            </div>
          </template>

          <!-- Stage -->
          <template v-else-if="currentStep === 'stage'">
            <p class="mb-6">Where would you say you are in your recovery journey right now?</p>
            <div class="space-y-3">
              <button
                v-for="option in stageOptions"
                :key="option.value"
                @click="saveStage(option.value as RecoveryStage)"
                class="w-full text-left p-4 rounded-lg border transition-colors hover:border-indigo-500 hover:bg-indigo-500/10"
                :class="collectedData.recoveryStage === option.value ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-700/30'"
              >
                <div class="font-medium text-white">{{ option.label }}</div>
                <div class="text-sm text-slate-400 mt-1">{{ option.description }}</div>
              </button>
            </div>
          </template>

          <!-- Vulnerability Pattern -->
          <template v-else-if="currentStep === 'vulnerability'">
            <p class="mb-4">People tend to struggle in different ways. Which sounds more like you?</p>
            <p class="text-slate-400 text-sm mb-6">Understanding your pattern helps me support you more effectively.</p>
            <div class="space-y-3">
              <button
                v-for="option in vulnerabilityOptions"
                :key="option.value"
                @click="saveVulnerability(option.value as VulnerabilityPattern)"
                class="w-full text-left p-4 rounded-lg border transition-colors hover:border-indigo-500 hover:bg-indigo-500/10"
                :class="collectedData.vulnerabilityPattern === option.value ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-700/30'"
              >
                <div class="font-medium text-white">{{ option.label }}</div>
                <div class="text-sm text-slate-400 mt-1">{{ option.description }}</div>
              </button>
            </div>
          </template>

          <!-- Emergency Contact -->
          <template v-else-if="currentStep === 'emergency-contact'">
            <p class="mb-4">I need one emergency contact—someone I can suggest you reach out to if I'm ever concerned about your safety.</p>
            <p class="text-slate-400 text-sm mb-6">This person should be someone you trust who knows about your recovery.</p>
            <div class="space-y-4">
              <input
                v-model="emergencyName"
                type="text"
                placeholder="Their name"
                class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 focus:outline-none"
              />
              <input
                v-model="emergencyRelationship"
                type="text"
                placeholder="Relationship (e.g., Sister, Sponsor)"
                class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 focus:outline-none"
              />
              <input
                v-model="emergencyPhone"
                type="tel"
                placeholder="Phone number"
                class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <button
              @click="saveEmergencyContact"
              :disabled="!emergencyName || !emergencyPhone"
              class="mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Continue
            </button>
          </template>

          <!-- Commitment Statement -->
          <template v-else-if="currentStep === 'commitment'">
            <p class="mb-4">Let's create your commitment statement. This is a personal declaration of why you're doing this and what you're committing to.</p>
            <p class="text-slate-400 text-sm mb-6">Why does recovery matter to you? Who are you doing this for? What future are you building toward?</p>
            <textarea
              v-model="commitmentInput"
              rows="4"
              placeholder="I am committed to recovery because..."
              class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 focus:outline-none resize-none"
            ></textarea>
            <div class="flex gap-3 mt-4">
              <button @click="saveCommitment" class="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                Continue
              </button>
              <button @click="next" class="text-slate-400 hover:text-white px-4 py-2 transition-colors">
                Skip for now
              </button>
            </div>
          </template>

          <!-- Complete -->
          <template v-else-if="currentStep === 'complete'">
            <p class="mb-4">You're all set, {{ collectedData.displayName }}.</p>
            <div class="bg-slate-700/30 rounded-lg p-4 mb-4">
              <p class="text-slate-400 text-sm mb-2">Here's what we've established:</p>
              <ul class="text-sm space-y-1">
                <li v-if="collectedData.philosophy">Recovery philosophy: <span class="text-white">{{ collectedData.philosophy }}</span></li>
                <li v-if="collectedData.substancesOfFocus">Primary focus: <span class="text-white">{{ collectedData.substancesOfFocus.join(', ') }}</span></li>
                <li v-if="collectedData.vulnerabilityPattern">Vulnerability pattern: <span class="text-white">{{ collectedData.vulnerabilityPattern }}</span></li>
                <li v-if="collectedData.emergencyContactName">Emergency contact: <span class="text-white">{{ collectedData.emergencyContactName }}</span></li>
              </ul>
            </div>
            <p class="mb-6">I'm here whenever you need to talk, work through an urge, practice a skill, or just check in.</p>
            <button @click="complete" class="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium transition-colors">
              Let's Get Started
            </button>
          </template>
        </div>
      </div>

      <!-- Back Button -->
      <div v-if="currentStepIndex > 0 && currentStep !== 'complete'" class="mt-auto">
        <button @click="back" class="text-slate-500 hover:text-slate-300 text-sm transition-colors">
          &larr; Back
        </button>
      </div>
    </div>
  </div>
</template>
