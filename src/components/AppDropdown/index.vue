<script lang="ts">
let nextDropdownUid = 0
</script>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useAttrs,
  useSlots,
  watch,
  type CSSProperties
} from 'vue'
import type { DropdownItem } from '@/components/types'
import { isTopmostModal, registerOpenModal } from '@/utils/overlayEscapeStack'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    items?: ReadonlyArray<DropdownItem>
    placement?: 'bottom-end' | 'bottom-start' | 'top-end' | 'top-start'
    disabled?: boolean
    ariaLabel?: string
  }>(),
  {
    items: () => [],
    placement: 'bottom-end',
    disabled: false,
    ariaLabel: undefined
  }
)

const emit = defineEmits<{
  select: [key: string]
  openChange: [open: boolean]
}>()

const MENU_OFFSET = 6
const MIN_MENU_WIDTH = 168
const VIEWPORT_PADDING = 8
const DROPDOWN_OPEN_EVENT = 'cpamp-dropdown-open'

const attrs = useAttrs()
const slots = useSlots()

const dropdownId = `cpamp-dropdown-${++nextDropdownUid}`
const menuId = `${dropdownId}-menu`

const triggerWrapRef = ref<HTMLDivElement | null>(null)
const menuRef = ref<HTMLDivElement | null>(null)
const itemRefs = ref<Array<HTMLButtonElement | null>>([])
const open = ref(false)
const activeIndex = ref(-1)
const position = ref<{ top: number; left: number } | null>(null)

let unregisterEscape: ((() => void) & { token: symbol }) | null = null

const isOpen = computed(() => open.value && !props.disabled)

const resolvedAriaLabel = computed(
  () => props.ariaLabel ?? (attrs['aria-label'] as string | undefined)
)

const hasCustomTrigger = computed(
  () => Boolean(slots.trigger) || Boolean(slots.default)
)

const enabledIndices = computed(() =>
  props.items
    .map((item, index) => (item.type === 'divider' || item.disabled ? -1 : index))
    .filter((idx) => idx >= 0)
)

const menuStyle = computed<CSSProperties>(() => {
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

function findVisibleTriggerElement(root: HTMLElement): HTMLElement {
  let current: HTMLElement | null = root.firstElementChild as HTMLElement | null
  while (current && typeof window !== 'undefined' && window.getComputedStyle(current).display === 'contents') {
    current = current.firstElementChild as HTMLElement | null
  }
  return current ?? root
}

function getTriggerRect(): DOMRect | null {
  const wrap = triggerWrapRef.value
  if (!wrap) return null
  const target = findVisibleTriggerElement(wrap)
  const rect = target.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) {
    return wrap.getBoundingClientRect()
  }
  return rect
}

function updatePosition() {
  const rect = getTriggerRect()
  if (!rect || typeof window === 'undefined') return

  const menuWidth = menuRef.value?.offsetWidth ?? MIN_MENU_WIDTH
  const menuHeight = menuRef.value?.offsetHeight ?? 0
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  const alignEnd = props.placement.endsWith('end')
  const preferTop = props.placement.startsWith('top')

  let left = alignEnd ? rect.right - menuWidth : rect.left
  left = Math.max(
    VIEWPORT_PADDING,
    Math.min(left, viewportWidth - menuWidth - VIEWPORT_PADDING)
  )

  let top: number
  if (preferTop) {
    top = rect.top - menuHeight - MENU_OFFSET
    if (top < VIEWPORT_PADDING) {
      top = Math.min(
        viewportHeight - menuHeight - VIEWPORT_PADDING,
        rect.bottom + MENU_OFFSET
      )
    }
  } else {
    top = rect.bottom + MENU_OFFSET
    if (top + menuHeight > viewportHeight - VIEWPORT_PADDING && rect.top > viewportHeight - rect.bottom) {
      top = Math.max(VIEWPORT_PADDING, rect.top - menuHeight - MENU_OFFSET)
    }
  }

  position.value = { top: Math.max(VIEWPORT_PADDING, top), left }
}

function focusItem(index: number) {
  const node = itemRefs.value[index]
  node?.focus()
}

function setItemRef(index: number, el: unknown) {
  itemRefs.value[index] = el instanceof HTMLButtonElement ? el : null
}

function closeMenu(restoreFocus = false) {
  if (!open.value) return
  open.value = false
  activeIndex.value = -1
  position.value = null
  emit('openChange', false)
  if (restoreFocus) {
    const focusTarget =
      (triggerWrapRef.value?.querySelector('button, [tabindex]') as HTMLElement | null) ??
      (triggerWrapRef.value?.firstElementChild as HTMLElement | null)
    focusTarget?.focus()
  }
}

function openMenu() {
  if (props.disabled) return
  if (typeof document !== 'undefined') {
    document.dispatchEvent(
      new CustomEvent(DROPDOWN_OPEN_EVENT, { detail: dropdownId })
    )
  }
  itemRefs.value = []
  open.value = true
  activeIndex.value = enabledIndices.value[0] ?? -1
  emit('openChange', true)
  nextTick(() => {
    updatePosition()
    if (activeIndex.value >= 0 && !slots.menu) {
      focusItem(activeIndex.value)
    }
  })
}

function toggleMenu() {
  if (props.disabled) return
  if (isOpen.value) {
    closeMenu()
  } else {
    openMenu()
  }
}

function handleTriggerClick() {
  if (props.disabled) return
  toggleMenu()
}

function handleTriggerKeyDown(event: KeyboardEvent) {
  if (props.disabled) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!isOpen.value) {
      openMenu()
    }
  }
}

function moveActive(delta: 1 | -1) {
  const enabled = enabledIndices.value
  if (enabled.length === 0) return
  const currentPos = enabled.indexOf(activeIndex.value)
  const nextPos =
    currentPos === -1
      ? delta === 1
        ? 0
        : enabled.length - 1
      : (currentPos + delta + enabled.length) % enabled.length
  const nextIdx = enabled[nextPos] ?? -1
  activeIndex.value = nextIdx
  if (nextIdx >= 0) {
    focusItem(nextIdx)
  }
}

function handleMenuKeyDown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      moveActive(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      moveActive(-1)
      break
    case 'Home':
      event.preventDefault()
      if (enabledIndices.value.length > 0) {
        const first = enabledIndices.value[0] ?? -1
        activeIndex.value = first
        focusItem(first)
      }
      break
    case 'End':
      event.preventDefault()
      if (enabledIndices.value.length > 0) {
        const last = enabledIndices.value[enabledIndices.value.length - 1] ?? -1
        activeIndex.value = last
        focusItem(last)
      }
      break
    case 'Tab':
      closeMenu()
      break
    default:
      break
  }
}

function handleItemClick(item: DropdownItem) {
  if (item.disabled || item.type === 'divider') return
  closeMenu()
  emit('select', item.key)
}

function handleDocumentMouseDown(event: MouseEvent) {
  const target = event.target as Node | null
  if (!target) return
  if (triggerWrapRef.value?.contains(target)) return
  if (menuRef.value?.contains(target)) return
  closeMenu()
}

function handleDocumentKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !isOpen.value) return
  if (unregisterEscape && !isTopmostModal(unregisterEscape.token)) return
  event.preventDefault()
  event.stopPropagation()
  closeMenu(true)
}

function handlePeerOpen(event: Event) {
  const peerId = (event as CustomEvent<string>).detail
  if (peerId !== dropdownId) {
    closeMenu()
  }
}

function cleanupOpenListeners() {
  document.removeEventListener('mousedown', handleDocumentMouseDown)
  document.removeEventListener('keydown', handleDocumentKeyDown, true)
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
  if (unregisterEscape) {
    unregisterEscape()
    unregisterEscape = null
  }
}

watch(isOpen, (active) => {
  if (!active) {
    cleanupOpenListeners()
    return
  }

  unregisterEscape = registerOpenModal()
  document.addEventListener('mousedown', handleDocumentMouseDown)
  document.addEventListener('keydown', handleDocumentKeyDown, true)
  window.addEventListener('scroll', updatePosition, true)
  window.addEventListener('resize', updatePosition)
})

onMounted(() => {
  document.addEventListener(DROPDOWN_OPEN_EVENT, handlePeerOpen)
})

onBeforeUnmount(() => {
  document.removeEventListener(DROPDOWN_OPEN_EVENT, handlePeerOpen)
  cleanupOpenListeners()
})
</script>

<template>
  <div
    ref="triggerWrapRef"
    class="app-dropdown"
    :class="[
      attrs.class,
      {
        'is-open': isOpen,
        'is-disabled': props.disabled
      }
    ]"
    :style="(attrs.style as any)"
    @click="handleTriggerClick"
    @keydown="handleTriggerKeyDown"
  >
    <slot
      v-if="slots.trigger"
      name="trigger"
      :open="isOpen"
      :toggle="toggleMenu"
      :close="() => closeMenu()"
    />
    <slot
      v-else-if="hasCustomTrigger"
      :open="isOpen"
      :toggle="toggleMenu"
      :close="() => closeMenu()"
    />
    <button
      v-else
      type="button"
      class="app-dropdown__default-trigger"
      :class="{ 'is-open': isOpen }"
      :disabled="props.disabled"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      :aria-controls="isOpen ? menuId : undefined"
      :aria-label="resolvedAriaLabel || 'Actions'"
    >
      <AppIcon
        name="Ellipsis"
        :size="15"
      />
    </button>
    <Teleport to="body">
      <div
        v-if="isOpen"
        :id="menuId"
        ref="menuRef"
        role="menu"
        tabindex="-1"
        class="app-dropdown__menu"
        :aria-label="resolvedAriaLabel"
        :style="menuStyle"
        @keydown="handleMenuKeyDown"
      >
        <slot
          v-if="slots.menu"
          name="menu"
          :close="() => closeMenu()"
        />

        <template v-else>
          <template
            v-for="(item, index) in props.items"
            :key="item.key"
          >
            <div
              v-if="item.type === 'divider'"
              class="app-dropdown__divider"
              role="separator"
            />
            <template v-else>
              <div
                v-if="item.divided && index > 0"
                class="app-dropdown__divider"
                role="separator"
              />
              <button
                :ref="(el) => setItemRef(index, el)"
                type="button"
                role="menuitem"
                class="app-dropdown__item"
                :class="{
                  'is-danger': item.tone === 'danger',
                  'is-active': item.active,
                  'is-highlighted': index === activeIndex
                }"
                :tabindex="index === activeIndex ? 0 : -1"
                :disabled="item.disabled"
                @mouseenter="!item.disabled && (activeIndex = index)"
                @click="handleItemClick(item)"
              >
                <slot
                  v-if="slots.item"
                  name="item"
                  :item="item"
                />
                <template v-else>
                  <span
                    v-if="item.icon"
                    class="app-dropdown__item-icon"
                  >
                    <AppIcon
                      :name="item.icon"
                      :size="15"
                    />
                  </span>
                  <span class="app-dropdown__item-label">
                    {{ item.label }}
                  </span>
                  <AppIcon
                    v-if="item.active"
                    name="Check"
                    :size="14"
                    class="app-dropdown__item-check"
                  />
                </template>
              </button>
            </template>
          </template>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.app-dropdown {
  display: inline-flex;
  align-items: center;
  min-width: 0;

  &.is-disabled {
    opacity: 0.56;
    cursor: not-allowed;
  }
}

.app-dropdown__default-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: var(--control-height-xs);
  min-height: var(--control-height-xs);
  padding: 0 8px;
  border: 1px solid var(--border-color);
  border-radius: var(--app-radius-pill);
  background: var(--bg-primary);
  color: var(--text-primary);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;

  &:hover:not(:disabled),
  &.is-open {
    transform: translateY(-1px);
    border-color: var(--border-subtle);
    background: var(--surface-subtle-hover);
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid var(--app-input-border-focus);
    outline-offset: 1px;
    background: var(--focus-bg);
    color: var(--focus-text);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
    transform: none;
  }
}

.app-dropdown__menu {
  position: fixed;
  z-index: 2200;
  min-width: 168px;
  max-width: 280px;
  padding: 4px;
  border: 1px solid color-mix(in srgb, var(--primary-color) 24%, var(--border-primary));
  border-radius: var(--app-radius-md);
  background: var(--floating-surface);
  /* floating layer: elevation allowed */
  box-shadow: var(--floating-shadow-lg);
  backdrop-filter: var(--glass-backdrop-filter);
  -webkit-backdrop-filter: var(--glass-backdrop-filter);
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.4;
  outline: none;
}

.app-dropdown__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: var(--app-radius-sm);
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background-color 0.12s ease,
    color 0.12s ease;

  &:hover:not(:disabled),
  &:focus:not(:disabled),
  &.is-highlighted:not(:disabled) {
    background: var(--surface-subtle-hover);
  }

  &.is-active {
    background: var(--app-accent-soft);
    color: var(--primary-text);
    font-weight: 600;
  }

  &:focus:not(:focus-visible) {
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid var(--app-input-border-focus);
    outline-offset: -2px;
  }

  &.is-danger {
    color: var(--error-color);

    &:hover:not(:disabled),
    &:focus:not(:disabled),
    &.is-highlighted:not(:disabled) {
      background: color-mix(in srgb, var(--error-color) 10%, var(--bg-primary));
    }
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.app-dropdown__item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  flex: 0 0 16px;
  color: currentColor;
}

.app-dropdown__item-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-dropdown__item-check {
  flex-shrink: 0;
  color: var(--primary-text);
}

.app-dropdown__divider {
  height: 1px;
  margin: 4px;
  background: var(--border-subtle);
}
</style>
