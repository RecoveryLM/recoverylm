import { ref, onUnmounted } from 'vue'

export interface UseAudioCues {
  playChime: () => void
  speak: (text: string) => void
  isSupported: { speech: boolean; audio: boolean }
  setSpeechEnabled: (enabled: boolean) => void
  setAudioEnabled: (enabled: boolean) => void
}

export function useAudioCues(): UseAudioCues {
  const audioContext = ref<AudioContext | null>(null)
  const speechEnabled = ref(false)
  const audioEnabled = ref(true)

  const isSupported = {
    speech: typeof window !== 'undefined' && 'speechSynthesis' in window,
    audio: typeof window !== 'undefined' && 'AudioContext' in window
  }

  const getAudioContext = (): AudioContext | null => {
    if (!isSupported.audio) return null

    if (!audioContext.value) {
      audioContext.value = new AudioContext()
    }

    // Resume if suspended (browser autoplay policy)
    if (audioContext.value.state === 'suspended') {
      audioContext.value.resume()
    }

    return audioContext.value
  }

  /**
   * Plays a gentle meditation chime using Web Audio API
   * Creates a bell-like tone that fades smoothly
   */
  const playChime = () => {
    if (!audioEnabled.value) return

    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // Create oscillators for a rich bell-like tone
    const fundamental = ctx.createOscillator()
    const harmonic = ctx.createOscillator()
    const gainNode = ctx.createGain()

    // Connect nodes
    fundamental.connect(gainNode)
    harmonic.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Bell-like frequencies (C5 with slight detuning for warmth)
    fundamental.frequency.value = 523.25 // C5
    fundamental.type = 'sine'

    harmonic.frequency.value = 1046.5 // C6 (octave up)
    harmonic.type = 'sine'

    // Envelope: quick attack, slow decay (bell-like)
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02) // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.5) // Slow decay

    // Start and stop
    fundamental.start(now)
    harmonic.start(now)
    fundamental.stop(now + 1.5)
    harmonic.stop(now + 1.5)

    // Cleanup
    setTimeout(() => {
      fundamental.disconnect()
      harmonic.disconnect()
      gainNode.disconnect()
    }, 2000)
  }

  /**
   * Speaks text using Web Speech API
   * Uses a calm, slower rate appropriate for meditation guidance
   */
  const speak = (text: string) => {
    if (!speechEnabled.value || !isSupported.speech) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.85 // Slightly slower for meditation
    utterance.pitch = 1.0
    utterance.volume = 0.8

    // Try to select a calm-sounding voice
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(
      v => v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Daniel'))
    ) || voices.find(v => v.lang.startsWith('en'))

    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    window.speechSynthesis.speak(utterance)
  }

  const setSpeechEnabled = (enabled: boolean) => {
    speechEnabled.value = enabled
    // Load voices when speech is enabled (some browsers need this)
    if (enabled && isSupported.speech) {
      window.speechSynthesis.getVoices()
    }
  }

  const setAudioEnabled = (enabled: boolean) => {
    audioEnabled.value = enabled
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (audioContext.value) {
      audioContext.value.close()
      audioContext.value = null
    }
    if (isSupported.speech) {
      window.speechSynthesis.cancel()
    }
  })

  return {
    playChime,
    speak,
    isSupported,
    setSpeechEnabled,
    setAudioEnabled
  }
}
