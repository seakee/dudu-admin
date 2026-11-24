<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useAttrs, useId, useSlots, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { isTopmostModal, registerOpenModal } from '@/utils/overlayEscapeStack'

defineOptions({ inheritAttrs: false })

const CLOSE_ANIMATION_MS = 220
const OPEN_ANIMATION_MS = 240
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
    width?: string | number
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
    width: '520px',
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

const modalRef = ref<HTMLDivElement | null>(null)

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

const resolvedWidth = computed(() =>
  typeof props.width === 'number' ? `${props.width}px` : props.width
)

const hasHeader = computed(() => Boolean(props.title || slots.header))

const shouldRender = computed(() =>
  isVisible.value || (!props.destroyOnClose && hasOpened.value)
)

const overlayClasses = computed(() => {
  const attrOverlayClass = (attrs['modal-class'] ?? attrs.modalClass) as string | undefined
  return [
    'modal-overlay',
    'base-dialog-overlay',
    isClosing.value ? 'modal-overlay-closing' : 'modal-overlay-entering',
    props.modalClass,
    attrOverlayClass
  ].filter(Boolean)
})

const modalClasses = computed(() => [
  'modal',
  'base-dialog',
  isClosing.value ? 'modal-closing' : 'modal-entering',
  attrs.class
])

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
  if (!modalRef.value) return []
  return Array.from(modalRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
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
    modalRef.value?.focus()
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement as HTMLElement | null

  if (event.shiftKey) {
    if (active === first || active === modalRef.value) {
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

function openDialog() {
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
      const autofocusEl = modalRef.value?.querySelector<HTMLElement>('[autofocus]')
      if (autofocusEl) {
        autofocusEl.focus()
      } else {
        modalRef.value?.focus()
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

function closeDialog() {
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
      openDialog()
    } else if (isVisible.value) {
      closeDialog()
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
        ref="modalRef"
        v-bind="forwardedAttrs"
        :class="modalClasses"
        :style="{ width: resolvedWidth, maxWidth: '100%' }"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="hasHeader ? titleId : undefined"
        tabindex="-1"
        @click.stop
      >
        <button
          v-if="props.showClose"
          type="button"
          class="modal-close-floating"
          :disabled="props.closeDisabled"
          :aria-label="t('common.close')"
          @click="requestClose"
        >
          <AppIcon
            name="X"
            :size="18"
          />
        </button>

        <div
          v-if="hasHeader"
          class="modal-header"
        >
          <slot
            name="header"
            :title-id="titleId"
            :close="requestClose"
          >
            <h3
              :id="titleId"
              class="modal-title"
            >
              {{ props.title }}
            </h3>
          </slot>
        </div>

        <div class="modal-body">
          <slot />
        </div>

        <div
          v-if="$slots.footer"
          class="modal-footer"
        >
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.base-dialog-overlay {
  background-color: var(--overlay-scrim-backdrop);
}

.base-dialog {
  color: var(--text-secondary);

  &:focus {
    outline: none;
  }
}

.modal-header {
  border-bottom-color: var(--border-color);
}

.modal-title {
  font-weight: 700;
}

.modal-footer {
  border-top-color: var(--border-color);
  background: var(--bg-primary);
}
</style>
