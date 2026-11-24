import { computed, onActivated, onDeactivated, onMounted, onUnmounted, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'

export type HeaderRefreshHandler = () => void | Promise<void>

const activeHandler = ref<HeaderRefreshHandler | null>(null)
const refreshingCount = ref(0)

export const hasHeaderRefreshHandler = computed(() => activeHandler.value !== null)
export const isHeaderRefreshing = computed(() => refreshingCount.value > 0)

export async function triggerHeaderRefresh(): Promise<void> {
  const handler = activeHandler.value
  if (!handler) {
    return
  }

  refreshingCount.value += 1
  try {
    await handler()
  } finally {
    refreshingCount.value = Math.max(0, refreshingCount.value - 1)
  }
}

export function useHeaderRefresh(
  handler?: HeaderRefreshHandler | null,
  enabled: MaybeRefOrGetter<boolean> = true
) {
  let isComponentActive = false

  function syncRegistration() {
    const isEnabled = Boolean(toValue(enabled))
    if (isComponentActive && isEnabled && handler) {
      activeHandler.value = handler
    } else if (activeHandler.value === handler) {
      activeHandler.value = null
    }
  }

  function release() {
    isComponentActive = false
    if (activeHandler.value === handler) {
      activeHandler.value = null
    }
  }

  onMounted(() => {
    isComponentActive = true
    syncRegistration()
  })

  onActivated(() => {
    isComponentActive = true
    syncRegistration()
  })

  onDeactivated(release)
  onUnmounted(release)

  watch(
    () => Boolean(toValue(enabled)),
    () => {
      syncRegistration()
    }
  )

  return {
    isHeaderRefreshing,
    triggerHeaderRefresh
  }
}
