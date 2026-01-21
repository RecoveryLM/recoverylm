<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ScrollText, Edit3, Save, X, CheckCircle2 } from 'lucide-vue-next'
import { useVault } from '@/composables/useVault'

const props = withDefaults(defineProps<{
  mode?: 'view' | 'edit'
}>(), {
  mode: 'view'
})

const emit = defineEmits<{
  complete: [{ success: boolean; commitment: string }]
}>()

const vault = useVault()
const isEditing = ref(props.mode === 'edit')
const commitment = ref('')
const editedCommitment = ref('')
const isSaving = ref(false)
const showSaved = ref(false)

onMounted(async () => {
  const profile = await vault.getProfile()
  if (profile?.commitmentStatement) {
    commitment.value = profile.commitmentStatement
    editedCommitment.value = profile.commitmentStatement
  }
})

const startEdit = () => {
  editedCommitment.value = commitment.value
  isEditing.value = true
}

const cancelEdit = () => {
  editedCommitment.value = commitment.value
  isEditing.value = false
}

const save = async () => {
  isSaving.value = true
  try {
    const profile = await vault.getProfile()
    if (profile) {
      await vault.saveProfile({
        ...profile,
        commitmentStatement: editedCommitment.value
      })
      commitment.value = editedCommitment.value
    }
    isEditing.value = false
    showSaved.value = true
    setTimeout(() => {
      showSaved.value = false
    }, 2000)
  } finally {
    isSaving.value = false
  }
}

const complete = () => {
  emit('complete', {
    success: true,
    commitment: commitment.value
  })
}
</script>

<template>
  <div class="widget-container p-4 my-3 max-w-md w-full">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
      <h3 class="text-indigo-400 font-bold flex items-center gap-2">
        <ScrollText :size="18" />
        Commitment Statement
      </h3>
      <Transition
        enter-active-class="transition-all duration-200"
        enter-from-class="opacity-0 scale-90"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-200"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-90"
      >
        <span
          v-if="showSaved"
          class="flex items-center gap-1 text-xs text-emerald-400"
        >
          <CheckCircle2 :size="14" />
          Saved
        </span>
      </Transition>
    </div>

    <!-- View Mode -->
    <div v-if="!isEditing">
      <div
        v-if="commitment"
        class="p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-lg"
      >
        <p class="text-slate-200 text-lg italic leading-relaxed">
          "{{ commitment }}"
        </p>
      </div>
      <div
        v-else
        class="p-4 bg-slate-800/50 border border-slate-600 rounded-lg text-center"
      >
        <p class="text-slate-400">No commitment statement set yet.</p>
        <p class="text-slate-500 text-sm mt-1">
          A commitment statement reminds you why you chose recovery.
        </p>
      </div>

      <div class="mt-4 flex justify-between items-center">
        <button
          @click="startEdit"
          class="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <Edit3 :size="16" />
          {{ commitment ? 'Edit' : 'Create Statement' }}
        </button>
        <button
          v-if="commitment"
          @click="complete"
          class="text-sm px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors"
        >
          I've Read This
        </button>
      </div>
    </div>

    <!-- Edit Mode -->
    <div v-else>
      <div class="mb-3">
        <label class="text-xs text-slate-400 block mb-2">
          Why are you committed to recovery? What are you fighting for?
        </label>
        <textarea
          v-model="editedCommitment"
          placeholder="I am committed to recovery because..."
          class="w-full h-32 bg-slate-800 border border-indigo-500/30 rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 resize-none transition-colors"
        ></textarea>
        <div class="text-xs text-slate-500 mt-1">
          {{ editedCommitment.length }} characters
        </div>
      </div>

      <div class="flex items-center gap-2 text-xs text-slate-400 mb-4 p-2 bg-slate-800/50 rounded">
        <span class="text-indigo-400">Tip:</span>
        Make it personal. What matters most to you? Who are you doing this for?
      </div>

      <div class="flex justify-end gap-2">
        <button
          @click="cancelEdit"
          class="flex items-center gap-1 text-sm px-3 py-1.5 text-slate-400 hover:text-white transition-colors"
        >
          <X :size="16" />
          Cancel
        </button>
        <button
          @click="save"
          :disabled="isSaving || !editedCommitment.trim()"
          class="flex items-center gap-1 text-sm px-3 py-1.5 rounded transition-colors"
          :class="editedCommitment.trim()
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'"
        >
          <Save :size="16" />
          {{ isSaving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </div>
  </div>
</template>
