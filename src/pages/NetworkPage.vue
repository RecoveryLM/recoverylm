<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Users, Phone, Mail, MessageSquare, Plus, Shield, X, Pencil, Trash2 } from 'lucide-vue-next'
import { useVault } from '@/composables/useVault'
import type { EmergencyContact, SupportNetwork, SupportPerson, SupportPersonAuthority } from '@/types'
import { generateId } from '@/types'

const { getEmergencyContact, getSupportNetwork, saveSupportPerson, deleteSupportPerson } = useVault()

const isLoading = ref(true)
const emergencyContact = ref<EmergencyContact | null>(null)
const supportNetwork = ref<SupportNetwork | null>(null)

// Modal state
const showAddModal = ref(false)
const editingContactId = ref<string | null>(null)
const isSaving = ref(false)
const showDeleteConfirm = ref<string | null>(null)

// Form data
const defaultAuthority: SupportPersonAuthority = {
  canRequestDrugTest: false,
  canShowUpUnannounced: false,
  canInitiateGroupResponse: false,
  canReceiveAutomatedAlerts: false
}

const formData = ref<Omit<SupportPerson, 'id'>>({
  name: '',
  relationship: '',
  contactMethod: 'phone',
  contactInfo: '',
  tier: 1,
  grantedAuthority: { ...defaultAuthority }
})

const resetForm = () => {
  formData.value = {
    name: '',
    relationship: '',
    contactMethod: 'phone',
    contactInfo: '',
    tier: 1,
    grantedAuthority: { ...defaultAuthority }
  }
  editingContactId.value = null
}

// Computed support people
const tier1Contacts = computed(() => supportNetwork.value?.tier1 ?? [])
const tier2Contacts = computed(() => supportNetwork.value?.tier2 ?? [])

// Refresh data after changes
const refreshNetwork = async () => {
  supportNetwork.value = await getSupportNetwork()
}

// Load data on mount
onMounted(async () => {
  try {
    const [contactData, networkData] = await Promise.all([
      getEmergencyContact(),
      getSupportNetwork()
    ])

    emergencyContact.value = contactData
    supportNetwork.value = networkData
  } catch (error) {
    console.error('Failed to load support network:', error)
  } finally {
    isLoading.value = false
  }
})

const callContact = (phone: string) => {
  window.location.href = `tel:${phone.replace(/\D/g, '')}`
}

const textContact = (phone: string) => {
  window.location.href = `sms:${phone.replace(/\D/g, '')}`
}

const emailContact = (email: string) => {
  window.location.href = `mailto:${email}`
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const openAddModal = () => {
  resetForm()
  showAddModal.value = true
}

const openEditModal = (person: SupportPerson) => {
  editingContactId.value = person.id
  formData.value = {
    name: person.name,
    relationship: person.relationship,
    contactMethod: person.contactMethod,
    contactInfo: person.contactInfo,
    tier: person.tier,
    grantedAuthority: { ...person.grantedAuthority }
  }
  showAddModal.value = true
}

const closeModal = () => {
  showAddModal.value = false
  resetForm()
}

const handleSaveContact = async () => {
  if (!formData.value.name || !formData.value.relationship || !formData.value.contactInfo) {
    return
  }

  isSaving.value = true
  try {
    const person: SupportPerson = {
      id: editingContactId.value ?? generateId(),
      ...formData.value
    }
    await saveSupportPerson(person)
    await refreshNetwork()
    closeModal()
  } catch (error) {
    console.error('Failed to save contact:', error)
  } finally {
    isSaving.value = false
  }
}

const handleDeleteContact = async (id: string) => {
  try {
    await deleteSupportPerson(id)
    await refreshNetwork()
    showDeleteConfirm.value = null
  } catch (error) {
    console.error('Failed to delete contact:', error)
  }
}
</script>

<template>
  <div class="h-full overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center h-64">
      <div class="animate-pulse text-slate-400">Loading your support network...</div>
    </div>

    <div v-else class="space-y-6 animate-fade-in">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-white flex items-center gap-2">
          <Users :size="24" class="text-indigo-400" />
          Support Network
        </h1>
        <button
          @click="openAddModal"
          class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus :size="16" />
          Add Contact
        </button>
      </div>

      <!-- Emergency Contact -->
      <div class="bg-red-900/20 border border-red-600/30 rounded-lg p-6">
        <div class="flex items-center gap-2 mb-4">
          <Shield :size="20" class="text-red-500" />
          <h2 class="text-lg font-semibold text-red-400">Emergency Contact</h2>
        </div>

        <div v-if="emergencyContact" class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center text-red-300 font-bold text-lg">
              {{ getInitials(emergencyContact.name) }}
            </div>
            <div>
              <div class="text-white font-medium">{{ emergencyContact.name }}</div>
              <div class="text-slate-400 text-sm">{{ emergencyContact.relationship }}</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="callContact(emergencyContact.phone)"
              class="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
            >
              <Phone :size="18" />
            </button>
            <button
              @click="textContact(emergencyContact.phone)"
              class="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              <MessageSquare :size="18" />
            </button>
            <button
              v-if="emergencyContact.email"
              @click="emailContact(emergencyContact.email!)"
              class="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              <Mail :size="18" />
            </button>
          </div>
        </div>

        <div v-else class="text-slate-400 text-sm">
          No emergency contact set up yet.
          <span class="text-red-400">This is required for crisis support.</span>
        </div>
      </div>

      <!-- Tier 1: Core Support -->
      <div class="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h2 class="text-lg font-semibold text-white mb-4">Tier 1: Core Support</h2>
        <p class="text-slate-400 text-sm mb-4">
          People who check in regularly and have authority to ask hard questions.
        </p>

        <div v-if="tier1Contacts.length === 0" class="text-slate-500 text-sm">
          No core support contacts added yet.
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="person in tier1Contacts"
            :key="person.id"
            class="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg"
          >
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full bg-indigo-900/50 flex items-center justify-center text-indigo-300 font-bold">
                {{ getInitials(person.name) }}
              </div>
              <div>
                <div class="text-white font-medium">{{ person.name }}</div>
                <div class="text-slate-400 text-sm">{{ person.relationship }}</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="person.contactMethod === 'phone' || person.contactMethod === 'text'"
                @click="callContact(person.contactInfo)"
                class="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <Phone :size="16" />
              </button>
              <button
                v-if="person.contactMethod === 'text'"
                @click="textContact(person.contactInfo)"
                class="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <MessageSquare :size="16" />
              </button>
              <button
                v-if="person.contactMethod === 'email'"
                @click="emailContact(person.contactInfo)"
                class="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <Mail :size="16" />
              </button>
              <button
                @click="openEditModal(person)"
                class="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                title="Edit contact"
              >
                <Pencil :size="16" />
              </button>
              <button
                v-if="showDeleteConfirm !== person.id"
                @click="showDeleteConfirm = person.id"
                class="p-2 bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white rounded-lg transition-colors"
                title="Delete contact"
              >
                <Trash2 :size="16" />
              </button>
              <button
                v-else
                @click="handleDeleteContact(person.id)"
                class="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tier 2: Extended Support -->
      <div v-if="tier2Contacts.length > 0" class="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
        <h2 class="text-lg font-semibold text-white mb-4">Tier 2: Extended Support</h2>
        <p class="text-slate-400 text-sm mb-4">
          People who are aware of your recovery and available as backup.
        </p>
        <div class="space-y-4">
          <div
            v-for="person in tier2Contacts"
            :key="person.id"
            class="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg"
          >
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 font-bold">
                {{ getInitials(person.name) }}
              </div>
              <div>
                <div class="text-slate-200">{{ person.name }}</div>
                <div class="text-slate-500 text-sm">{{ person.relationship }}</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="person.contactMethod === 'phone' || person.contactMethod === 'text'"
                @click="callContact(person.contactInfo)"
                class="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <Phone :size="16" />
              </button>
              <button
                v-if="person.contactMethod === 'email'"
                @click="emailContact(person.contactInfo)"
                class="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <Mail :size="16" />
              </button>
              <button
                @click="openEditModal(person)"
                class="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                title="Edit contact"
              >
                <Pencil :size="16" />
              </button>
              <button
                v-if="showDeleteConfirm !== person.id"
                @click="showDeleteConfirm = person.id"
                class="p-2 bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white rounded-lg transition-colors"
                title="Delete contact"
              >
                <Trash2 :size="16" />
              </button>
              <button
                v-else
                @click="handleDeleteContact(person.id)"
                class="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Granted Authorities Info -->
      <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-slate-300 mb-2">About Granted Authorities</h3>
        <p class="text-slate-400 text-xs">
          In the Independent Recovery Framework, you grant specific authorities to support partners while clear-headed.
          This creates accountability structures that work with human psychology rather than relying on willpower alone.
        </p>
      </div>
    </div>

    <!-- Add/Edit Contact Modal -->
    <Teleport to="body">
      <div
        v-if="showAddModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in"
        @click.self="closeModal"
      >
        <div class="w-full max-w-lg mx-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
          <!-- Header -->
          <div class="flex items-center justify-between p-6 border-b border-slate-700">
            <h2 class="text-xl font-bold text-white">
              {{ editingContactId ? 'Edit Contact' : 'Add Contact' }}
            </h2>
            <button
              @click="closeModal"
              class="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X :size="20" />
            </button>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSaveContact" class="p-6 space-y-5">
            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">Name *</label>
              <input
                v-model="formData.name"
                type="text"
                required
                placeholder="e.g., John Smith"
                class="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <!-- Relationship -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">Relationship *</label>
              <input
                v-model="formData.relationship"
                type="text"
                required
                placeholder="e.g., Sponsor, Sibling, Friend"
                class="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <!-- Contact Method -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">Contact Method</label>
              <select
                v-model="formData.contactMethod"
                class="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="phone">Phone</option>
                <option value="text">Text</option>
                <option value="email">Email</option>
              </select>
            </div>

            <!-- Contact Info -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                {{ formData.contactMethod === 'email' ? 'Email Address' : 'Phone Number' }} *
              </label>
              <input
                v-model="formData.contactInfo"
                :type="formData.contactMethod === 'email' ? 'email' : 'tel'"
                required
                :placeholder="formData.contactMethod === 'email' ? 'john@example.com' : '555-123-4567'"
                class="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <!-- Tier Selection -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">Support Tier</label>
              <div class="flex gap-4">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    v-model="formData.tier"
                    type="radio"
                    :value="1"
                    class="w-4 h-4 text-indigo-600 border-slate-600 bg-slate-700 focus:ring-indigo-500 focus:ring-offset-slate-900"
                  />
                  <span class="text-white">Tier 1 (Core)</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    v-model="formData.tier"
                    type="radio"
                    :value="2"
                    class="w-4 h-4 text-indigo-600 border-slate-600 bg-slate-700 focus:ring-indigo-500 focus:ring-offset-slate-900"
                  />
                  <span class="text-white">Tier 2 (Extended)</span>
                </label>
              </div>
              <p class="text-slate-500 text-xs mt-2">
                Tier 1 contacts check in regularly. Tier 2 contacts are aware and available as backup.
              </p>
            </div>

            <!-- Granted Authorities -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-3">Granted Authorities</label>
              <div class="space-y-3 bg-slate-800/50 rounded-lg p-4">
                <label class="flex items-start gap-3 cursor-pointer">
                  <input
                    v-model="formData.grantedAuthority.canRequestDrugTest"
                    type="checkbox"
                    class="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                  />
                  <div>
                    <span class="text-white text-sm">Can request drug test</span>
                    <p class="text-slate-500 text-xs">Authority to request you take a test if they suspect relapse</p>
                  </div>
                </label>

                <label class="flex items-start gap-3 cursor-pointer">
                  <input
                    v-model="formData.grantedAuthority.canShowUpUnannounced"
                    type="checkbox"
                    class="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                  />
                  <div>
                    <span class="text-white text-sm">Can show up unannounced</span>
                    <p class="text-slate-500 text-xs">Permission to check on you without prior notice</p>
                  </div>
                </label>

                <label class="flex items-start gap-3 cursor-pointer">
                  <input
                    v-model="formData.grantedAuthority.canInitiateGroupResponse"
                    type="checkbox"
                    class="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                  />
                  <div>
                    <span class="text-white text-sm">Can initiate group response</span>
                    <p class="text-slate-500 text-xs">Can coordinate with other support people if needed</p>
                  </div>
                </label>

                <label class="flex items-start gap-3 cursor-pointer">
                  <input
                    v-model="formData.grantedAuthority.canReceiveAutomatedAlerts"
                    type="checkbox"
                    class="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                  />
                  <div>
                    <span class="text-white text-sm">Can receive automated alerts</span>
                    <p class="text-slate-500 text-xs">Receive notifications if app detects warning signs</p>
                  </div>
                </label>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-4">
              <button
                type="button"
                @click="closeModal"
                class="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="isSaving || !formData.name || !formData.relationship || !formData.contactInfo"
                class="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {{ isSaving ? 'Saving...' : (editingContactId ? 'Update Contact' : 'Add Contact') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
