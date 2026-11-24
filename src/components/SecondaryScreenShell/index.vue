<script lang="ts">
const SECONDARY_FLOATING_HEIGHT_VAR = '--secondary-shell-floating-action-height'
const activeFloatingHeights = new Map<symbol, number>()

function syncSecondaryFloatingHeight() {
  if (typeof document === 'undefined' || !document.documentElement?.style) return
  let maxHeight = 0
  for (const height of activeFloatingHeights.values()) {
    if (height > maxHeight) {
      maxHeight = height
    }
  }
  if (maxHeight > 0) {
    document.documentElement.style.setProperty(
      SECONDARY_FLOATING_HEIGHT_VAR,
      `${Math.ceil(maxHeight)}px`
    )
  } else {
    document.documentElement.style.removeProperty(SECONDARY_FLOATING_HEIGHT_VAR)
  }
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useSlots, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    title?: string
    backLabel?: string
    backAriaLabel?: string
    hideBackButton?: boolean
    loading?: boolean
    loadingLabel?: string
  }>(),
  {
    title: '',
    backLabel: '',
    backAriaLabel: undefined,
    hideBackButton: false,
    loading: false,
    loadingLabel: ''
  }
)

const emit = defineEmits<{
  back: []
}>()

const slots = useSlots()
const { t } = useI18n()

const floatingSurfaceRef = ref<HTMLDivElement | null>(null)
const instanceId = Symbol('secondary-screen-shell')

let resizeObserver: ResizeObserver | null = null
let isListeningResize = false

const resolvedBackLabel = computed(() => props.backLabel || t('common.back'))
const resolvedBackAriaLabel = computed(
  () => props.backAriaLabel || resolvedBackLabel.value
)
const resolvedLoadingLabel = computed(
  () => props.loadingLabel || t('common.loading')
)
const hasFloatingAction = computed(() => Boolean(slots.floatingAction))

function handleBack() {
  emit('back')
}

function updateFloatingHeight() {
  const height = floatingSurfaceRef.value?.getBoundingClientRect().height ?? 0
  if (height > 0) {
    activeFloatingHeights.set(instanceId, height)
  } else {
    activeFloatingHeights.set(instanceId, 56)
  }
  syncSecondaryFloatingHeight()
}

function cleanupFloatingTracking() {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (isListeningResize && typeof window !== 'undefined') {
    window.removeEventListener('resize', updateFloatingHeight)
    isListeningResize = false
  }
  if (activeFloatingHeights.delete(instanceId)) {
    syncSecondaryFloatingHeight()
  }
}

watch(
  hasFloatingAction,
  (active) => {
    cleanupFloatingTracking()
    if (!active) return

    updateFloatingHeight()
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateFloatingHeight)
      isListeningResize = true
    }
    if (typeof ResizeObserver !== 'undefined' && floatingSurfaceRef.value) {
      resizeObserver = new ResizeObserver(updateFloatingHeight)
      resizeObserver.observe(floatingSurfaceRef.value)
    }
  },
  { immediate: true, flush: 'post' }
)

onBeforeUnmount(() => {
  cleanupFloatingTracking()
})
</script>

<template>
  <div class="secondary-screen-shell">
    <header class="secondary-screen-shell__top-bar">
      <button
        v-if="!props.hideBackButton"
        type="button"
        class="secondary-screen-shell__back-btn"
        :aria-label="resolvedBackAriaLabel"
        @click="handleBack"
      >
        <span
          class="secondary-screen-shell__back-icon"
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </span>
        <span class="secondary-screen-shell__back-text">
          {{ resolvedBackLabel }}
        </span>
      </button>
      <div v-else />

      <div
        class="secondary-screen-shell__title"
        :title="props.title || undefined"
      >
        {{ props.title }}
      </div>

      <div class="secondary-screen-shell__right">
        <slot name="rightAction" />
      </div>
    </header>

    <div
      v-if="props.loading"
      class="secondary-screen-shell__loading"
      role="status"
      aria-live="polite"
    >
      <svg
        class="secondary-screen-shell__spinner"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <span>{{ resolvedLoadingLabel }}</span>
    </div>

    <div
      v-else
      class="secondary-screen-shell__content"
      :class="{ 'has-floating-action': hasFloatingAction }"
    >
      <slot />
    </div>

    <Teleport
      v-if="hasFloatingAction"
      to="body"
    >
      <div class="secondary-screen-shell__floating-container">
        <div
          ref="floatingSurfaceRef"
          class="secondary-screen-shell__floating-surface"
        >
          <slot name="floatingAction" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.secondary-screen-shell {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
  min-height: 0;
  min-width: 0;
}

.secondary-screen-shell__top-bar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-sm $spacing-md;
  min-height: 44px;
  background: var(--app-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--app-radius-md);
  box-shadow: var(--app-specular-highlight);
  backdrop-filter: var(--glass-backdrop-filter);
  -webkit-backdrop-filter: var(--glass-backdrop-filter);
}

.secondary-screen-shell__back-btn {
  @include button-reset;
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: var(--control-height-sm);
  padding: 0 10px 0 6px;
  border-radius: var(--app-radius-sm);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  transition:
    background-color $transition-fast,
    color $transition-fast;

  &:hover {
    background: var(--surface-subtle-hover);
    color: var(--text-primary);
  }
}

.secondary-screen-shell__back-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  svg {
    display: block;
  }
}

.secondary-screen-shell__back-text {
  font-weight: 600;
  line-height: 18px;
  white-space: nowrap;
}

.secondary-screen-shell__title {
  min-width: 0;
  max-width: 100%;
  justify-self: center;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.secondary-screen-shell__right {
  justify-self: end;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: $spacing-sm;
}

.secondary-screen-shell__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  padding: $spacing-2xl 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.secondary-screen-shell__spinner {
  animation: secondary-shell-spin 0.85s linear infinite;
}

@keyframes secondary-shell-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.secondary-screen-shell__content {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
  min-width: 0;

  &.has-floating-action {
    padding-bottom: calc(
      var(--secondary-shell-floating-action-height, 56px) + 12px + env(safe-area-inset-bottom)
    );
  }
}

.secondary-screen-shell__floating-container {
  position: fixed;
  left: var(--content-center-x, 50%);
  bottom: calc(12px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 50;
  pointer-events: none;
  width: fit-content;
  max-width: calc(100vw - 24px);

  @media (max-width: 1200px) {
    max-width: calc(100vw - 16px);
  }
}

.secondary-screen-shell__floating-surface {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--app-radius-pill);
  background: var(--floating-surface);
  backdrop-filter: var(--glass-backdrop-filter);
  -webkit-backdrop-filter: var(--glass-backdrop-filter);
  border: 1px solid var(--border-color);
  /* floating layer: elevation allowed */
  box-shadow: var(--floating-shadow-lg);

  @media (max-width: 1200px) {
    padding: 8px 10px;
  }
}
</style>
