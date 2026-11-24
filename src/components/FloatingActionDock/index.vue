<script lang="ts">
const DOCK_HEIGHT_VAR = '--page-floating-dock-height'
const activeDockHeights = new Map<symbol, number>()

function syncGlobalDockHeight() {
  if (typeof document === 'undefined' || !document.documentElement?.style) return
  let maxHeight = 0
  for (const height of activeDockHeights.values()) {
    if (height > maxHeight) {
      maxHeight = height
    }
  }
  if (maxHeight > 0) {
    document.documentElement.style.setProperty(DOCK_HEIGHT_VAR, `${Math.ceil(maxHeight)}px`)
  } else {
    document.documentElement.style.removeProperty(DOCK_HEIGHT_VAR)
  }
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useSlots, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    leading?: string
    variant?: 'bar' | 'compact'
    role?: 'region' | 'toolbar' | 'status'
    ariaLabel?: string
  }>(),
  {
    leading: undefined,
    variant: 'bar',
    role: 'region',
    ariaLabel: undefined
  }
)

const slots = useSlots()
const surfaceRef = ref<HTMLDivElement | null>(null)
const dockId = Symbol('floating-action-dock')

let resizeObserver: ResizeObserver | null = null
let isListeningResize = false

const hasLeading = computed(
  () => Boolean(slots.leading) || Boolean(props.leading)
)

function updateHeight() {
  const measured = surfaceRef.value?.getBoundingClientRect().height ?? 56
  activeDockHeights.set(dockId, measured > 0 ? measured + 16 : 64)
  syncGlobalDockHeight()
}

function cleanupTracking() {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (isListeningResize && typeof window !== 'undefined') {
    window.removeEventListener('resize', updateHeight)
    isListeningResize = false
  }
  if (activeDockHeights.delete(dockId)) {
    syncGlobalDockHeight()
  }
}

watch(
  () => props.open,
  (isOpen) => {
    cleanupTracking()
    if (!isOpen) return

    updateHeight()
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateHeight)
      isListeningResize = true
    }
    if (typeof ResizeObserver !== 'undefined' && surfaceRef.value) {
      resizeObserver = new ResizeObserver(updateHeight)
      resizeObserver.observe(surfaceRef.value)
    }
  },
  { immediate: true, flush: 'post' }
)

onBeforeUnmount(() => {
  cleanupTracking()
})
</script>

<template>
  <Teleport
    v-if="props.open"
    to="body"
  >
    <div
      class="floating-action-dock"
      :class="props.variant === 'compact' ? 'is-compact' : 'is-bar'"
      :role="props.role"
      :aria-label="props.ariaLabel"
    >
      <div
        ref="surfaceRef"
        class="floating-action-dock__surface"
        :class="props.variant === 'compact' ? 'is-compact' : 'is-bar'"
      >
        <div
          v-if="hasLeading"
          class="floating-action-dock__leading"
        >
          <slot name="leading">
            {{ props.leading }}
          </slot>
        </div>
        <div
          v-if="$slots.default"
          class="floating-action-dock__actions"
        >
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.floating-action-dock {
  position: fixed;
  left: var(--content-center-x, 50%);
  bottom: calc(16px + env(safe-area-inset-bottom));
  z-index: 1600;
  box-sizing: border-box;
  max-width: calc(100vw - 24px);
  transform: translateX(-50%);
  pointer-events: none;

  &.is-bar {
    width: min(920px, calc(100vw - 24px));
  }

  &.is-compact {
    width: fit-content;
  }

  @media (max-width: 1200px) {
    bottom: calc(12px + env(safe-area-inset-bottom));
    max-width: calc(100vw - 16px);

    &.is-bar {
      width: calc(100vw - 16px);
    }
  }
}

.floating-action-dock__surface {
  pointer-events: auto;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px 12px;
  min-height: 52px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--app-radius-lg);
  background: var(--floating-surface);
  backdrop-filter: var(--glass-backdrop-filter);
  -webkit-backdrop-filter: var(--glass-backdrop-filter);
  /* floating layer: elevation allowed */
  box-shadow: var(--floating-shadow-lg);

  &.is-bar {
    width: 100%;
  }

  &.is-compact {
    display: inline-flex;
  }

  @include mobile {
    flex-wrap: wrap;
    padding: 8px 10px;
    border-radius: 16px;
  }
}

.floating-action-dock__leading {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 0 1 auto;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.floating-action-dock__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
  flex: 1 1 auto;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  :deep(.btn + .btn) {
    margin-left: 0;
  }

  @include mobile {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
