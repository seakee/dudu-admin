<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
  type CSSProperties
} from 'vue'
import { isTopmostModal, registerOpenModal } from '@/utils/overlayEscapeStack'

const props = withDefaults(
  defineProps<{
    open?: boolean
    placement?: 'bottom-start' | 'bottom' | 'bottom-end' | 'top-start' | 'top' | 'top-end'
    width?: number | string
    trigger?: 'click' | 'hover'
    disabled?: boolean
    popperClass?: string
  }>(),
  {
    open: undefined,
    placement: 'bottom-start',
    width: 340,
    trigger: 'click',
    disabled: false,
    popperClass: undefined
  }
)

const emit = defineEmits<{
  'update:open': [open: boolean]
  show: []
  hide: []
}>()

const VIEWPORT_PADDING = 8
const POPOVER_OFFSET = 8

const internalOpen = ref(false)
const referenceWrapRef = ref<HTMLSpanElement | null>(null)
const popoverRef = ref<HTMLDivElement | null>(null)
const position = ref<{ top: number; left: number } | null>(null)

let hoverCloseTimer: ReturnType<typeof setTimeout> | null = null
let resizeObserver: ResizeObserver | null = null
let unregisterEscape: ((() => void) & { token: symbol }) | null = null

const isControlled = computed(() => props.open !== undefined)

const isOpen = computed(() => {
  if (props.disabled) return false
  return isControlled.value ? Boolean(props.open) : internalOpen.value
})

const resolvedCssWidth = computed(() => {
  if (typeof props.width === 'number') {
    return `min(${props.width}px, calc(100vw - 16px))`
  }
  const trimmed = String(props.width).trim()
  return /^\d+(\.\d+)?$/.test(trimmed)
    ? `min(${trimmed}px, calc(100vw - 16px))`
    : trimmed
})

const popoverStyle = computed<CSSProperties>(() => {
  if (!position.value) {
    return {
      width: resolvedCssWidth.value,
      visibility: 'hidden',
      top: '0px',
      left: '0px'
    }
  }
  return {
    width: resolvedCssWidth.value,
    top: `${position.value.top}px`,
    left: `${position.value.left}px`
  }
})

function setOpen(next: boolean) {
  if (props.disabled && next) return
  if (!isControlled.value) {
    internalOpen.value = next
  }
  emit('update:open', next)
  if (next) {
    emit('show')
  } else {
    emit('hide')
  }
}

function getReferenceRect(): DOMRect | null {
  const wrap = referenceWrapRef.value
  if (!wrap) return null
  let current: HTMLElement | null = wrap.firstElementChild as HTMLElement | null
  while (current && typeof window !== 'undefined' && window.getComputedStyle(current).display === 'contents') {
    current = current.firstElementChild as HTMLElement | null
  }
  if (current) {
    const rect = current.getBoundingClientRect()
    if (rect.width > 0 || rect.height > 0) return rect
  }
  if (typeof document !== 'undefined') {
    const range = document.createRange()
    range.selectNodeContents(wrap)
    return range.getBoundingClientRect()
  }
  return null
}

function updatePosition() {
  const rect = getReferenceRect()
  if (!rect || typeof window === 'undefined') return

  const panelWidth = popoverRef.value?.offsetWidth ?? (typeof props.width === 'number' ? props.width : 340)
  const panelHeight = popoverRef.value?.offsetHeight ?? 0
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let left: number
  if (props.placement.endsWith('end')) {
    left = rect.right - panelWidth
  } else if (props.placement === 'bottom' || props.placement === 'top') {
    left = rect.left + (rect.width - panelWidth) / 2
  } else {
    left = rect.left
  }
  left = Math.max(
    VIEWPORT_PADDING,
    Math.min(left, viewportWidth - panelWidth - VIEWPORT_PADDING)
  )

  const preferTop = props.placement.startsWith('top')
  let top: number
  if (preferTop) {
    top = rect.top - panelHeight - POPOVER_OFFSET
    if (top < VIEWPORT_PADDING && viewportHeight - rect.bottom > rect.top) {
      top = rect.bottom + POPOVER_OFFSET
    }
  } else {
    top = rect.bottom + POPOVER_OFFSET
    if (
      panelHeight > 0 &&
      top + panelHeight > viewportHeight - VIEWPORT_PADDING &&
      rect.top > viewportHeight - rect.bottom
    ) {
      top = Math.max(VIEWPORT_PADDING, rect.top - panelHeight - POPOVER_OFFSET)
    }
  }

  position.value = {
    top: Math.max(VIEWPORT_PADDING, top),
    left
  }
}

function clearHoverTimer() {
  if (hoverCloseTimer !== null) {
    clearTimeout(hoverCloseTimer)
    hoverCloseTimer = null
  }
}

function handleReferenceClick() {
  if (props.disabled || props.trigger !== 'click') return
  setOpen(!isOpen.value)
}

function handleMouseOver() {
  if (props.disabled || props.trigger !== 'hover') return
  clearHoverTimer()
  if (!isOpen.value) {
    setOpen(true)
  }
}

function handleMouseOut(event: MouseEvent) {
  if (props.trigger !== 'hover') return
  const related = event.relatedTarget as Node | null
  if (
    related &&
    (referenceWrapRef.value?.contains(related) || popoverRef.value?.contains(related))
  ) {
    return
  }
  clearHoverTimer()
  hoverCloseTimer = setTimeout(() => {
    setOpen(false)
  }, 120)
}

function handleDocumentMouseDown(event: MouseEvent) {
  const target = event.target as Node | null
  if (!target) return
  if (referenceWrapRef.value?.contains(target)) return
  if (popoverRef.value?.contains(target)) return
  setOpen(false)
}

function handleDocumentKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !isOpen.value) return
  if (unregisterEscape && !isTopmostModal(unregisterEscape.token)) return
  event.preventDefault()
  event.stopPropagation()
  setOpen(false)
}

function cleanupOpenListeners() {
  document.removeEventListener('mousedown', handleDocumentMouseDown)
  document.removeEventListener('keydown', handleDocumentKeyDown, true)
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
  resizeObserver?.disconnect()
  resizeObserver = null
  position.value = null
  if (unregisterEscape) {
    unregisterEscape()
    unregisterEscape = null
  }
}

watch(
  isOpen,
  (active) => {
    if (!active) {
      cleanupOpenListeners()
      return
    }

    unregisterEscape = registerOpenModal()
    nextTick(() => {
      updatePosition()
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          updatePosition()
        })
        const firstChild = referenceWrapRef.value?.firstElementChild
        if (firstChild) resizeObserver.observe(firstChild)
        if (popoverRef.value) resizeObserver.observe(popoverRef.value)
      }
    })

    document.addEventListener('mousedown', handleDocumentMouseDown)
    document.addEventListener('keydown', handleDocumentKeyDown, true)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  clearHoverTimer()
  cleanupOpenListeners()
})
</script>

<template>
  <span
    ref="referenceWrapRef"
    class="app-popover-reference"
    @click="handleReferenceClick"
    @mouseover="handleMouseOver"
    @mouseout="handleMouseOut"
  >
    <slot name="reference" />
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="popoverRef"
        role="dialog"
        class="app-popover"
        :class="props.popperClass"
        :style="popoverStyle"
        @mouseover="handleMouseOver"
        @mouseout="handleMouseOut"
      >
        <slot />
      </div>
    </Teleport>
  </span>
</template>

<style lang="scss" scoped>
.app-popover-reference {
  display: contents;
}

.app-popover {
  position: fixed;
  z-index: 2250;
  box-sizing: border-box;
  max-height: calc(100vh - 24px);
  overflow: auto;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--primary-color) 24%, var(--border-primary));
  border-radius: var(--app-radius-md);
  background: var(--floating-surface);
  /* floating layer: elevation allowed */
  box-shadow: var(--floating-shadow-xl);
  backdrop-filter: var(--glass-backdrop-filter);
  -webkit-backdrop-filter: var(--glass-backdrop-filter);
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.45;
}
</style>
