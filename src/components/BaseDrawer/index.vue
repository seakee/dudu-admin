<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useAttrs, useId, useSlots, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { isTopmostModal, registerOpenModal } from '@/utils/overlayEscapeStack'

defineOptions({ inheritAttrs: false })

const CLOSE_ANIMATION_MS = 280
const OPEN_ANIMATION_MS = 280
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    title?: string
    size?: string | number
    direction?: 'rtl' | 'ltr' | 'ttb' | 'btt'
    appendToBody?: boolean
    closeOnClickModal?: boolean
    closeOnPressEscape?: boolean
    destroyOnClose?: boolean
    showClose?: boolean
    closeDisabled?: boolean
    modalClass?: string
    beforeClose?: (done: () => void) => void
  }>(),
  {
    modelValue: false,
    title: '',
    size: '480px',
    direction: 'rtl',
    appendToBody: true,
    closeOnClickModal: true,
    closeOnPressEscape: true,
    destroyOnClose: false,
    showClose: true,
    closeDisabled: false,
    modalClass: '',
    beforeClose: undefined
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  open: []
  opened: []
  close: []
  closed: []
}>()

const { t } = useI18n()
const attrs = useAttrs()
const slots = useSlots()
const titleId = useId()

const drawerRef = ref<HTMLDivElement | null>(null)
const hasOpened = ref(false)
const isVisible = ref(false)
const isClosing = ref(false)

let openTimer: ReturnType<typeof setTimeout> | null = null
let closeTimer: ReturnType<typeof setTimeout> | null = null
let focusTimer: ReturnType<typeof setTimeout> | null = null
let unregisterModal: ((() => void) & { token: symbol }) | null = null
let modalToken: symbol | null = null
let previouslyFocused: HTMLElement | null = null
let hasScrollLock = false
let closeEmitted = false
const overlayPointerIds = new Set<number>()

const resolvedSize = computed(() =>
  typeof props.size === 'number' ? `${props.size}px` : props.size
)

const hasHeader = computed(() => Boolean(props.title || slots.header || props.showClose))

const shouldRender = computed(() =>
  isVisible.value || (!props.destroyOnClose && hasOpened.value)
)

const overlayClasses = computed(() => {
  const attrOverlayClass = (attrs['modal-class'] ?? attrs.modalClass) as string | undefined
  return [
    'drawer-overlay',
    'base-drawer-overlay',
    `is-${props.direction}`,
    isClosing.value ? 'drawer-overlay-closing' : 'drawer-overlay-entering',
    props.modalClass,
    attrOverlayClass
  ].filter(Boolean)
})

const drawerClasses = computed(() => [
  'drawer',
  'base-drawer',
  props.direction,
  isClosing.value ? 'drawer-closing' : 'drawer-entering',
  attrs.class
])

const drawerStyle = computed(() => ({
  '--drawer-size': resolvedSize.value
}))

const forwardedAttrs = computed(() => {
  const rest = { ...attrs } as Record<string, unknown>
  delete rest.class
  delete rest['modal-class']
  delete rest.modalClass
  return rest
})

function acquireScrollLock() {
  if (typeof document === 'undefined' || hasScrollLock) return
  const root = document.documentElement
  const body = document.body
  const count = Number(root.dataset.cpampOverlayLocks || '0')
  if (count === 0) {
    root.dataset.cpampPrevHtmlOverflow = root.style.overflow
    root.dataset.cpampPrevBodyOverflow = body.style.overflow
    root.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
  }
  root.dataset.cpampOverlayLocks = String(count + 1)
  hasScrollLock = true
}

function releaseScrollLock() {
  if (typeof document === 'undefined' || !hasScrollLock) return
  const root = document.documentElement
  const body = document.body
  const count = Math.max(0, Number(root.dataset.cpampOverlayLocks || '1') - 1)
  if (count === 0) {
    root.style.overflow = root.dataset.cpampPrevHtmlOverflow || ''
    body.style.overflow = root.dataset.cpampPrevBodyOverflow || ''
    delete root.dataset.cpampOverlayLocks
    delete root.dataset.cpampPrevHtmlOverflow
    delete root.dataset.cpampPrevBodyOverflow
  } else {
    root.dataset.cpampOverlayLocks = String(count)
  }
  hasScrollLock = false
}

function clearTimers() {
  if (openTimer !== null) {
    clearTimeout(openTimer)
    openTimer = null
  }
  if (closeTimer !== null) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
  if (focusTimer !== null) {
    clearTimeout(focusTimer)
    focusTimer = null
  }
}

function getFocusableElements(): HTMLElement[] {
  if (!drawerRef.value) return []
  return Array.from(drawerRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute('disabled') && element.tabIndex !== -1 && element.offsetParent !== null
  )
}

function restoreFocus() {
  const prev = previouslyFocused
  previouslyFocused = null
  if (prev && typeof prev.focus === 'function' && prev.isConnected) {
    prev.focus()
  }
}

function cleanupEscapeAndKeyListener() {
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', handleKeyDown)
  }
  if (unregisterModal) {
    unregisterModal()
    unregisterModal = null
  }
  modalToken = null
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (!modalToken || !isTopmostModal(modalToken)) return
    event.preventDefault()
    event.stopImmediatePropagation?.()
    if (!props.closeOnPressEscape || props.closeDisabled) return
    requestClose()
    return
  }

  if (event.key !== 'Tab') return
  const focusable = getFocusableElements()
  if (focusable.length === 0) {
    event.preventDefault()
    drawerRef.value?.focus()
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement as HTMLElement | null

  if (event.shiftKey) {
    if (active === first || active === drawerRef.value) {
      event.preventDefault()
      last.focus()
    }
    return
  }

  if (active === last) {
    event.preventDefault()
    first.focus()
  }
}

function commitClose() {
  if (!closeEmitted) {
    closeEmitted = true
    emit('close')
  }
  if (props.modelValue) {
    emit('update:modelValue', false)
  }
}

function requestClose() {
  if (props.closeDisabled) return
  if (props.beforeClose) {
    props.beforeClose(commitClose)
    return
  }
  commitClose()
}

function handleOverlayPointerDown(event: PointerEvent) {
  if (event.target === event.currentTarget && event.button === 0) {
    overlayPointerIds.add(event.pointerId)
  } else {
    overlayPointerIds.delete(event.pointerId)
  }
}

function handleOverlayPointerUp(event: PointerEvent) {
  const startedOnOverlay = overlayPointerIds.delete(event.pointerId)
  if (!props.closeOnClickModal || props.closeDisabled) return
  if (startedOnOverlay && event.target === event.currentTarget && event.button === 0) {
    requestClose()
  }
}

function handleOverlayPointerCancel(event: PointerEvent) {
  overlayPointerIds.delete(event.pointerId)
}

function openDrawer() {
  clearTimers()
  overlayPointerIds.clear()
  hasOpened.value = true
  isVisible.value = true
  isClosing.value = false
  closeEmitted = false

  acquireScrollLock()
  if (typeof document !== 'undefined') {
    if (!unregisterModal) {
      const handle = registerOpenModal()
      unregisterModal = handle
      modalToken = handle.token
    }
    previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.removeEventListener('keydown', handleKeyDown)
    document.addEventListener('keydown', handleKeyDown)
  }

  emit('open')

  focusTimer = setTimeout(() => {
    focusTimer = null
    void nextTick(() => {
      if (!isVisible.value || isClosing.value) return
      const autofocusEl = drawerRef.value?.querySelector<HTMLElement>('[autofocus]')
      if (autofocusEl) {
        autofocusEl.focus()
      } else {
        drawerRef.value?.focus()
      }
    })
  }, 0)

  openTimer = setTimeout(() => {
    openTimer = null
    if (isVisible.value && !isClosing.value) {
      emit('opened')
    }
  }, OPEN_ANIMATION_MS)
}

function closeDrawer() {
  if (!isVisible.value || isClosing.value) return
  if (openTimer !== null) {
    clearTimeout(openTimer)
    openTimer = null
  }
  if (focusTimer !== null) {
    clearTimeout(focusTimer)
    focusTimer = null
  }

  if (!closeEmitted) {
    closeEmitted = true
    emit('close')
  }

  isClosing.value = true
  cleanupEscapeAndKeyListener()

  closeTimer = setTimeout(() => {
    closeTimer = null
    isVisible.value = false
    isClosing.value = false
    releaseScrollLock()
    if (props.destroyOnClose) {
      hasOpened.value = false
    }
    restoreFocus()
    emit('closed')
  }, CLOSE_ANIMATION_MS)
}

watch(
  () => props.modelValue,
  (nextValue) => {
    if (nextValue) {
      openDrawer()
    } else if (isVisible.value) {
      closeDrawer()
    }
  },
  { immediate: true, flush: 'sync' }
)

onBeforeUnmount(() => {
  clearTimers()
  cleanupEscapeAndKeyListener()
  releaseScrollLock()
  previouslyFocused = null
})
</script>

<template>
  <Teleport
    to="body"
    :disabled="!props.appendToBody"
  >
    <div
      v-if="shouldRender"
      v-show="isVisible"
      :class="overlayClasses"
      @pointerdown="handleOverlayPointerDown"
      @pointerup="handleOverlayPointerUp"
      @pointercancel="handleOverlayPointerCancel"
    >
      <div
        ref="drawerRef"
        v-bind="forwardedAttrs"
        :class="drawerClasses"
        :style="drawerStyle"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="props.title || $slots.header ? titleId : undefined"
        tabindex="-1"
        @click.stop
      >
        <div
          v-if="hasHeader"
          class="drawer-header"
        >
          <div class="drawer-header__title">
            <slot
              name="header"
              :title-id="titleId"
              :close="requestClose"
            >
              <h3
                :id="titleId"
                class="drawer-title"
              >
                {{ props.title }}
              </h3>
            </slot>
          </div>
          <button
            v-if="props.showClose"
            type="button"
            class="drawer-close-btn"
            :disabled="props.closeDisabled"
            :aria-label="t('common.close')"
            @click="requestClose"
          >
            <AppIcon
              name="X"
              :size="18"
            />
          </button>
        </div>

        <div class="drawer-body">
          <slot />
        </div>

        <div
          v-if="$slots.footer"
          class="drawer-footer"
        >
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: $z-modal;
  display: flex;
  justify-content: flex-end;
  background: var(--overlay-scrim-drawer);

  &.is-ltr {
    justify-content: flex-start;
  }

  &.is-ttb {
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
  }

  &.is-btt {
    flex-direction: column;
    justify-content: flex-end;
    align-items: stretch;
  }

  &.drawer-overlay-entering {
    animation: cpamp-drawer-overlay-in 0.28s ease forwards;
  }

  &.drawer-overlay-closing {
    pointer-events: none;
    animation: cpamp-drawer-overlay-out 0.28s ease forwards;
  }

  @include mobile {
    align-items: flex-end;
    justify-content: stretch;
  }
}

.drawer {
  --drawer-size: 480px;

  display: flex;
  flex-direction: column;
  width: var(--drawer-size);
  height: 100%;
  max-width: 100vw;
  background: var(--app-surface-strong, var(--bg-primary));
  border-left: 1px solid var(--border-color);
  /* floating layer: elevation allowed */
  box-shadow: var(--floating-shadow-drawer);
  outline: none;

  &.ltr {
    border-left: 0;
    border-right: 1px solid var(--border-color);
  }

  &.ttb,
  &.btt {
    width: 100%;
    height: var(--drawer-size);
    max-height: 90vh;
    border-left: 0;
  }

  &.ttb {
    border-bottom: 1px solid var(--border-color);
    border-radius: 0 0 var(--app-radius-md) var(--app-radius-md);
  }

  &.btt {
    border-top: 1px solid var(--border-color);
    border-radius: var(--app-radius-md) var(--app-radius-md) 0 0;
  }

  &.drawer-entering {
    animation: cpamp-drawer-panel-in-rtl 0.28s ease forwards;

    &.ltr {
      animation-name: cpamp-drawer-panel-in-ltr;
    }

    &.ttb {
      animation-name: cpamp-drawer-panel-in-ttb;
    }

    &.btt {
      animation-name: cpamp-drawer-panel-in-btt;
    }

    @include mobile {
      animation-name: cpamp-drawer-panel-in-btt;
    }
  }

  &.drawer-closing {
    animation: cpamp-drawer-panel-out-rtl 0.28s ease forwards;

    &.ltr {
      animation-name: cpamp-drawer-panel-out-ltr;
    }

    &.ttb {
      animation-name: cpamp-drawer-panel-out-ttb;
    }

    &.btt {
      animation-name: cpamp-drawer-panel-out-btt;
    }

    @include mobile {
      animation-name: cpamp-drawer-panel-out-btt;
    }
  }

  @include mobile {
    width: 100%;
    min-width: 100vw;
    max-width: 100vw;
    height: auto;
    max-height: calc(100vh - 48px);
    border-left: 0;
    border-right: 0;
    border-top: 1px solid var(--border-color);
    border-radius: var(--app-radius-md) var(--app-radius-md) 0 0;

    @supports (height: 100dvh) {
      max-height: calc(100dvh - 48px);
    }
  }
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-md;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;

  @include mobile {
    padding-left: 16px;
    padding-right: 16px;
  }
}

.drawer-header__title {
  min-width: 0;
  flex: 1;
}

.drawer-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-primary);
}

.drawer-close-btn {
  @include button-reset;
  @include flex-center;
  width: var(--control-height-sm);
  height: var(--control-height-sm);
  border-radius: var(--app-radius-sm);
  color: var(--text-secondary);
  flex-shrink: 0;
  transition:
    background-color $transition-fast,
    color $transition-fast;

  &:hover:not(:disabled) {
    background: var(--surface-subtle-hover);
    color: var(--text-primary);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.drawer-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px 24px;
  color: var(--text-secondary);

  @include mobile {
    padding-left: 16px;
    padding-right: 16px;
  }
}

.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px calc(16px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border-color);
  background: var(--app-surface-strong);
  flex-shrink: 0;

  @include mobile {
    padding-left: 16px;
    padding-right: 16px;
  }
}

@keyframes cpamp-drawer-overlay-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes cpamp-drawer-overlay-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes cpamp-drawer-panel-in-rtl {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes cpamp-drawer-panel-out-rtl {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(100%);
  }
}

@keyframes cpamp-drawer-panel-in-ltr {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes cpamp-drawer-panel-out-ltr {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-100%);
  }
}

@keyframes cpamp-drawer-panel-in-ttb {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes cpamp-drawer-panel-out-ttb {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-100%);
  }
}

@keyframes cpamp-drawer-panel-in-btt {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes cpamp-drawer-panel-out-btt {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}
</style>
