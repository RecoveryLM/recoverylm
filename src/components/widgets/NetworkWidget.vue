<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Users, Phone, Mail, MessageSquare, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-vue-next'
import type { SupportPerson, SupportNetwork, WidgetCompletionState } from '@/types'
import { useVault } from '@/composables/useVault'

const props = withDefaults(defineProps<{
  action?: 'view' | 'notify' | 'edit'
  completionState?: WidgetCompletionState
}>(), {
  action: 'view'
})

const emit = defineEmits<{
  complete: [{ success: boolean; action: string; contactId?: string }]
}>()

// Restore state from completionState if present
const wasCompleted = !!props.completionState

const vault = useVault()
const network = ref<SupportNetwork | null>(null)
const selectedContact = ref<SupportPerson | null>(null)
const isNotifying = ref(false)
const notificationSent = ref(wasCompleted)

onMounted(async () => {
  network.value = await vault.getSupportNetwork()
})

const tier1Contacts = computed(() => network.value?.tier1 ?? [])
const tier2Contacts = computed(() => network.value?.tier2 ?? [])
const hasContacts = computed(() => tier1Contacts.value.length > 0 || tier2Contacts.value.length > 0)

const selectForNotify = (person: SupportPerson) => {
  selectedContact.value = person
}

const sendNotification = () => {
  if (!selectedContact.value) return
  isNotifying.value = true

  // Simulate sending (in real app would use actual notification system)
  setTimeout(() => {
    isNotifying.value = false
    notificationSent.value = true
  }, 1500)
}

const complete = () => {
  emit('complete', {
    success: true,
    action: props.action,
    contactId: selectedContact.value?.id
  })
}

const getContactIcon = (method: string) => {
  switch (method) {
    case 'phone': return Phone
    case 'email': return Mail
    case 'text': return MessageSquare
    default: return Phone
  }
}
</script>

<template>
  <div class="widget-container p-4 my-3 max-w-md w-full">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
      <h3 class="text-pink-400 font-bold flex items-center gap-2">
        <Users :size="18" />
        Support Network
      </h3>
      <span
        v-if="action === 'notify'"
        class="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded"
      >
        Reach Out
      </span>
    </div>

    <!-- Notification Sent -->
    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
    >
      <div v-if="notificationSent" class="text-center py-6">
        <div class="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/20 rounded-full mb-3">
          <CheckCircle2 class="text-emerald-400" :size="24" />
        </div>
        <h4 class="text-emerald-400 font-medium mb-2">Reaching Out</h4>
        <p class="text-slate-400 text-sm mb-4">
          Opening contact for {{ selectedContact?.name }}
        </p>
        <button
          @click="complete"
          class="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded transition-colors"
        >
          Done
        </button>
      </div>
    </Transition>

    <!-- Selected Contact for Notify -->
    <div v-if="selectedContact && !notificationSent && action === 'notify'" class="mb-4">
      <div class="p-4 bg-pink-900/20 border border-pink-500/30 rounded-lg">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h4 class="text-slate-200 font-medium">{{ selectedContact.name }}</h4>
            <p class="text-slate-400 text-sm">{{ selectedContact.relationship }}</p>
          </div>
          <div class="text-pink-400">
            <component :is="getContactIcon(selectedContact.contactMethod)" :size="24" />
          </div>
        </div>

        <div class="text-sm text-slate-300 mb-3">
          {{ selectedContact.contactInfo }}
        </div>

        <div class="flex gap-2">
          <button
            @click="selectedContact = null"
            class="flex-1 text-sm py-2 text-slate-400 hover:text-white transition-colors"
          >
            Choose Different
          </button>
          <button
            @click="sendNotification"
            :disabled="isNotifying"
            class="flex-1 text-sm py-2 bg-pink-600 hover:bg-pink-500 text-white rounded transition-colors"
          >
            {{ isNotifying ? 'Opening...' : 'Contact Now' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Contact List -->
    <div v-if="!notificationSent && !selectedContact">
      <!-- No Contacts -->
      <div v-if="!hasContacts" class="text-center py-6">
        <AlertCircle class="mx-auto text-slate-500 mb-3" :size="32" />
        <p class="text-slate-400">No support contacts added yet.</p>
        <p class="text-slate-500 text-sm mt-1">
          Add people you trust to support your recovery.
        </p>
      </div>

      <!-- Tier 1 -->
      <div v-if="tier1Contacts.length > 0" class="mb-4">
        <h4 class="text-xs text-pink-400 uppercase tracking-wide mb-2">
          Core Support (Tier 1)
        </h4>
        <div class="space-y-2">
          <button
            v-for="person in tier1Contacts"
            :key="person.id"
            @click="action === 'notify' ? selectForNotify(person) : null"
            class="w-full flex items-center justify-between p-3 bg-slate-800/50 border border-slate-600 rounded-lg transition-colors"
            :class="action === 'notify' ? 'hover:border-pink-500/50 cursor-pointer' : ''"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center">
                <span class="text-pink-400 font-medium">
                  {{ person.name.charAt(0).toUpperCase() }}
                </span>
              </div>
              <div class="text-left">
                <div class="text-slate-200 font-medium">{{ person.name }}</div>
                <div class="text-slate-400 text-sm">{{ person.relationship }}</div>
              </div>
            </div>
            <div class="flex items-center gap-2 text-slate-500">
              <component :is="getContactIcon(person.contactMethod)" :size="16" />
              <ChevronRight v-if="action === 'notify'" :size="16" />
            </div>
          </button>
        </div>
      </div>

      <!-- Tier 2 -->
      <div v-if="tier2Contacts.length > 0">
        <h4 class="text-xs text-slate-400 uppercase tracking-wide mb-2">
          Extended Support (Tier 2)
        </h4>
        <div class="space-y-2">
          <button
            v-for="person in tier2Contacts"
            :key="person.id"
            @click="action === 'notify' ? selectForNotify(person) : null"
            class="w-full flex items-center justify-between p-3 bg-slate-800/30 border border-slate-700 rounded-lg transition-colors"
            :class="action === 'notify' ? 'hover:border-slate-500 cursor-pointer' : ''"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                <span class="text-slate-400 font-medium">
                  {{ person.name.charAt(0).toUpperCase() }}
                </span>
              </div>
              <div class="text-left">
                <div class="text-slate-300">{{ person.name }}</div>
                <div class="text-slate-500 text-sm">{{ person.relationship }}</div>
              </div>
            </div>
            <div class="flex items-center gap-2 text-slate-600">
              <component :is="getContactIcon(person.contactMethod)" :size="16" />
              <ChevronRight v-if="action === 'notify'" :size="16" />
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Footer for View Mode -->
    <div
      v-if="action === 'view' && hasContacts && !notificationSent"
      class="mt-4 pt-3 border-t border-slate-700 flex justify-between items-center"
    >
      <div class="text-xs text-slate-400">
        {{ tier1Contacts.length + tier2Contacts.length }} contacts
      </div>
      <button
        @click="complete"
        class="text-sm px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded transition-colors"
      >
        Done
      </button>
    </div>
  </div>
</template>
