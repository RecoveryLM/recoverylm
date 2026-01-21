import { ref, onMounted, onUnmounted } from 'vue'

export function useMediaQuery(query: string) {
  const matches = ref(false)

  let mediaQuery: MediaQueryList | null = null

  const updateMatches = () => {
    if (mediaQuery) {
      matches.value = mediaQuery.matches
    }
  }

  onMounted(() => {
    mediaQuery = window.matchMedia(query)
    matches.value = mediaQuery.matches
    mediaQuery.addEventListener('change', updateMatches)
  })

  onUnmounted(() => {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', updateMatches)
    }
  })

  return matches
}
