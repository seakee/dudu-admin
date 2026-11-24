import { watch } from 'vue'
import { useAppStore, type VisualEffectsMode } from '@/stores/app'

function applyVisualEffectsAttribute(mode: VisualEffectsMode) {
  if (typeof document === 'undefined') {
    return
  }
  document.documentElement.setAttribute('data-visual-effects', mode)
}

export function useVisualEffects() {
  const appStore = useAppStore()

  watch(
    () => appStore.visualEffects,
    (mode) => {
      applyVisualEffectsAttribute(mode === 'reduced' ? 'reduced' : 'full')
    },
    { immediate: true }
  )

  return {
    visualEffects: computed(() => appStore.visualEffects),
    setVisualEffects: (mode: VisualEffectsMode) => appStore.setVisualEffects(mode),
    toggleVisualEffects: () => appStore.toggleVisualEffects()
  }
}
