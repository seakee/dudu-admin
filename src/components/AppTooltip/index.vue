<script lang="ts">
let nextTooltipUid = 0
</script>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  useSlots,
  watch,
  type CSSProperties
} from 'vue'

const props = withDefaults(
  defineProps<{
    content?: string
    placement?:
      | 'top'
      | 'top-start'
      | 'top-end'
      | 'bottom'
      | 'bottom-start'
      | 'bottom-end'
      | 'left'
      | 'right'
    disabled?: boolean
    popperClass?: string
  }>(),
  {
    content: '',
    placement: 'top',
    disabled: false,
    popperClass: undefined
  }
)

const VIEWPORT_PADDING = 8
const TOOLTIP_OFFSET = 8

const slots = useSlots()
const tooltipId = `cpamp-tooltip-${++nextTooltipUid}`

const triggerWrapRef = ref<HTMLSpanElement | null>(null)
const tooltipRef = ref<HTMLDivElement | null>(null)
const open = ref(false)
const position = ref<{ top: number; left: number } | null>(null)

let closeTimer: ReturnType<typeof setTimeout> | null = null

const hasContent = computed(
  () => Boolean(slots.content) || Boolean(props.content?.trim())
)

const isOpen = computed(
  () => open.value && !props.disabled && hasContent.value
)

const tooltipStyle = computed<CSSProperties>(() => {
  if (!position.value) {
    return {
      visibility: 'hidden',
      top: '0px',
      left: '0px'
    }
  }
  return {
    top: `${position.value.top}px`,
    left: `${position.value.left}px`
  }
})

function clearCloseTimer() {
  if (closeTimer !== null) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

function getTriggerRect(): DOMRect | null {
  const wrap = triggerWrapRef.value
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
  const rect = getTriggerRect()
  const tip = tooltipRef.value
  if (!rect || !tip || typeof window === 'undefined') return

  const tipWidth = tip.offsetWidth
  const tipHeight = tip.offsetHeight
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let top = 0
  let left = 0

  if (props.placement === 'left' || props.placement === 'right') {
    const preferLeft = props.placement === 'left'
    top = rect.top + (rect.height - tipHeight) / 2
    if (preferLeft) {
      left = rect.left - tipWidth - TOOLTIP_OFFSET
      if (left < VIEWPORT_PADDING) {
        left = rect.right + TOOLTIP_OFFSET
      }
    } else {
      left = rect.right + TOOLTIP_OFFSET
      if (left + tipWidth > viewportWidth - VIEWPORT_PADDING) {
        left = rect.left - tipWidth - TOOLTIP_OFFSET
      }
    }
  } else {
    const preferBottom = props.placement.startsWith('bottom')
    if (props.placement.endsWith('start')) {
      left = rect.left
    } else if (props.placement.endsWith('end')) {
      left = rect.right - tipWidth
    } else {
      left = rect.left + (rect.width - tipWidth) / 2
    }

    if (preferBottom) {
      top = rect.bottom + TOOLTIP_OFFSET
      if (top + tipHeight > viewportHeight - VIEWPORT_PADDING && rect.top > tipHeight + TOOLTIP_OFFSET) {
        top = rect.top - tipHeight - TOOLTIP_OFFSET
      }
    } else {
      top = rect.top - tipHeight - TOOLTIP_OFFSET
      if (top < VIEWPORT_PADDING) {
        top = rect.bottom + TOOLTIP_OFFSET
      }
    }
  }

  left = Math.max(
    VIEWPORT_PADDING,
    Math.min(left, viewportWidth - tipWidth - VIEWPORT_PADDING)
  )
  top = Math.max(
    VIEWPORT_PADDING,
    Math.min(top, viewportHeight - tipHeight - VIEWPORT_PADDING)
  )

  position.value = { top, left }
}

function showTooltip() {
  if (props.disabled || !hasContent.value) return
  clearCloseTimer()
  if (!open.value) {
    open.value = true
    nextTick(() => {
      updatePosition()
    })
  }
}

function scheduleHide() {
  clearCloseTimer()
  closeTimer = setTimeout(() => {
    open.value = false
    position.value = null
  }, 80)
}

function hideImmediately() {
  clearCloseTimer()
  open.value = false
  position.value = null
}

function handleMouseOver() {
  showTooltip()
}

function handleMouseOut(event: MouseEvent) {
  const related = event.relatedTarget as Node | null
  if (
    related &&
    (triggerWrapRef.value?.contains(related) || tooltipRef.value?.contains(related))
  ) {
    return
  }
  scheduleHide()
}

function handleFocusIn() {
  showTooltip()
}

function handleFocusOut(event: FocusEvent) {
  const related = event.relatedTarget as Node | null
  if (related && triggerWrapRef.value?.contains(related)) return
  hideImmediately()
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    hideImmediately()
  }
}

watch(isOpen, (active) => {
  if (!active) {
    window.removeEventListener('scroll', updatePosition, true)
    window.removeEventListener('resize', updatePosition)
    return
  }
  nextTick(updatePosition)
  window.addEventListener('scroll', updatePosition, true)
  window.addEventListener('resize', updatePosition)
})

onBeforeUnmount(() => {
  clearCloseTimer()
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
})
</script>

<template>
  <span
    ref="triggerWrapRef"
    class="app-tooltip-trigger"
    @mouseover="handleMouseOver"
    @mouseout="handleMouseOut"
    @focusin="handleFocusIn"
    @focusout="handleFocusOut"
    @keydown="handleKeyDown"
  >
    <slot />
    <Teleport to="body">
      <div
        v-if="isOpen"
        :id="tooltipId"
        ref="tooltipRef"
        role="tooltip"
        class="app-tooltip"
        :class="props.popperClass"
        :style="tooltipStyle"
        @mouseover="handleMouseOver"
        @mouseout="handleMouseOut"
      >
        <slot name="content">
          {{ props.content }}
        </slot>
      </div>
    </Teleport>
  </span>
</template>

<style lang="scss" scoped>
.app-tooltip-trigger {
  display: contents;
}

.app-tooltip {
  position: fixed;
  z-index: 2600;
  max-width: min(340px, calc(100vw - 24px));
  padding: 6px 10px;
  border-radius: var(--app-radius-sm);
  border: 1px solid var(--border-primary);
  background: var(--floating-surface);
  /* floating layer: elevation allowed */
  box-shadow: var(--floating-shadow-md);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.45;
  word-break: break-word;
  pointer-events: auto;
}
</style>
