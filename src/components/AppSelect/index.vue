<script lang="ts">
let nextSelectUid = 0
</script>

<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useAttrs,
  watch,
  type CSSProperties
} from 'vue'
import {
  FORM_ITEM_CONTEXT_KEY,
  type ControlSize,
  type SelectOption
} from '@/components/types'
import { isTopmostModal, registerOpenModal } from '@/utils/overlayEscapeStack'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | boolean | null
    options?: ReadonlyArray<SelectOption>
    placeholder?: string
    clearable?: boolean
    filterable?: boolean
    allowCreate?: boolean
    disabled?: boolean
    size?: ControlSize
    ariaLabel?: string
    fullWidth?: boolean
    id?: string
  }>(),
  {
    modelValue: undefined,
    options: () => [],
    placeholder: '',
    clearable: false,
    filterable: false,
    allowCreate: false,
    disabled: false,
    size: 'md',
    ariaLabel: undefined,
    fullWidth: true,
    id: undefined
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: any]
  change: [value: any]
  clear: []
}>()

const VIEWPORT_MARGIN = 8
const DROPDOWN_OFFSET = 6
const DROPDOWN_MAX_HEIGHT = 260
const DROPDOWN_MIN_HEIGHT = 96
const DROPDOWN_Z_INDEX = 2010
const SELECT_OPEN_EVENT = 'cpamp-select-open'

interface InternalOption extends SelectOption {
  isCreated?: boolean
}

const attrs = useAttrs()
const formItem = inject(FORM_ITEM_CONTEXT_KEY, null)

const generatedId = `cpamp-select-${++nextSelectUid}`
const selectId = computed(() => props.id ?? formItem?.inputId ?? generatedId)
const listboxId = computed(() => `${selectId.value}-listbox`)

const open = ref(false)
const highlightedIndex = ref(-1)
const filterQuery = ref('')
const wrapRef = ref<HTMLDivElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const dropdownRef = ref<HTMLDivElement | null>(null)
const filterInputRef = ref<HTMLInputElement | null>(null)
const dropdownStyle = ref<CSSProperties | null>(null)

let rafId: number | null = null
let resizeObserver: ResizeObserver | null = null
let unregisterEscape: ((() => void) & { token: symbol }) | null = null

const isOpen = computed(() => open.value && !props.disabled)

const resolvedAriaLabel = computed(
  () => props.ariaLabel ?? (attrs['aria-label'] as string | undefined)
)

const matchedOption = computed(() =>
  props.options.find((opt) => opt.value === props.modelValue)
)

const hasValue = computed(() => {
  if (matchedOption.value) return true
  return (
    props.modelValue !== undefined &&
    props.modelValue !== null &&
    props.modelValue !== ''
  )
})

const displayText = computed(() => {
  if (matchedOption.value) return matchedOption.value.label
  if (
    props.modelValue !== undefined &&
    props.modelValue !== null &&
    props.modelValue !== ''
  ) {
    return String(props.modelValue)
  }
  return props.placeholder || ''
})

const isPlaceholder = computed(() => !hasValue.value && Boolean(props.placeholder))

const showClearButton = computed(
  () =>
    props.clearable &&
    !props.disabled &&
    props.modelValue !== undefined &&
    props.modelValue !== null &&
    props.modelValue !== ''
)

const displayOptions = computed<InternalOption[]>(() => {
  const query = props.filterable ? filterQuery.value.trim() : ''
  const lowerQuery = query.toLowerCase()

  const filtered: InternalOption[] = lowerQuery
    ? props.options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(lowerQuery) ||
          String(opt.value).toLowerCase().includes(lowerQuery)
      )
    : [...props.options]

  if (props.allowCreate && query) {
    const exactExists = props.options.some(
      (opt) => String(opt.value) === query || opt.label === query
    )
    if (!exactExists) {
      filtered.unshift({
        value: query,
        label: query,
        isCreated: true
      })
    }
  }

  return filtered
})

const selectedDisplayIndex = computed(() =>
  displayOptions.value.findIndex((opt) => opt.value === props.modelValue)
)

const firstEnabledIndex = computed(() =>
  displayOptions.value.findIndex((opt) => !opt.disabled)
)

const resolvedHighlightedIndex = computed(() => {
  const current = highlightedIndex.value
  if (
    current >= 0 &&
    current < displayOptions.value.length &&
    !displayOptions.value[current]?.disabled
  ) {
    return current
  }
  if (
    selectedDisplayIndex.value >= 0 &&
    !displayOptions.value[selectedDisplayIndex.value]?.disabled
  ) {
    return selectedDisplayIndex.value
  }
  return firstEnabledIndex.value
})

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function resolveDropdownStyle(element: HTMLElement): CSSProperties {
  const rect = element.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const width = Math.min(rect.width, Math.max(0, viewportWidth - VIEWPORT_MARGIN * 2))
  const left = clamp(
    rect.left,
    VIEWPORT_MARGIN,
    Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN)
  )
  const spaceBelow = viewportHeight - rect.bottom - VIEWPORT_MARGIN - DROPDOWN_OFFSET
  const spaceAbove = rect.top - VIEWPORT_MARGIN - DROPDOWN_OFFSET
  const direction =
    spaceBelow >= DROPDOWN_MAX_HEIGHT || spaceBelow >= spaceAbove ? 'down' : 'up'
  const availableHeight = direction === 'down' ? spaceBelow : spaceAbove
  const maxHeight = Math.max(
    DROPDOWN_MIN_HEIGHT,
    Math.min(DROPDOWN_MAX_HEIGHT, availableHeight)
  )

  return direction === 'down'
    ? {
        position: 'fixed',
        top: `${rect.bottom + DROPDOWN_OFFSET}px`,
        left: `${left}px`,
        width: `${width}px`,
        maxHeight: `${maxHeight}px`,
        zIndex: DROPDOWN_Z_INDEX
      }
    : {
        position: 'fixed',
        bottom: `${viewportHeight - rect.top + DROPDOWN_OFFSET}px`,
        left: `${left}px`,
        width: `${width}px`,
        maxHeight: `${maxHeight}px`,
        zIndex: DROPDOWN_Z_INDEX
      }
}

function updateDropdownStyle() {
  if (!wrapRef.value) return
  dropdownStyle.value = resolveDropdownStyle(wrapRef.value)
}

function scheduleDropdownStyleUpdate() {
  if (typeof window === 'undefined') return
  if (rafId !== null) {
    window.cancelAnimationFrame(rafId)
  }
  rafId = window.requestAnimationFrame(() => {
    rafId = null
    updateDropdownStyle()
  })
}

function closeSelect(restoreFocus = false) {
  if (!open.value) return
  open.value = false
  filterQuery.value = ''
  if (restoreFocus) {
    triggerRef.value?.focus()
  }
}

function openSelect() {
  if (props.disabled) return
  if (typeof document !== 'undefined') {
    document.dispatchEvent(
      new CustomEvent(SELECT_OPEN_EVENT, { detail: selectId.value })
    )
  }
  filterQuery.value = ''
  open.value = true
  highlightedIndex.value =
    selectedDisplayIndex.value >= 0
      ? selectedDisplayIndex.value
      : firstEnabledIndex.value
  updateDropdownStyle()
  if (props.filterable) {
    nextTick(() => {
      filterInputRef.value?.focus()
    })
  }
}

function toggleOpen() {
  if (props.disabled) return
  if (isOpen.value) {
    closeSelect()
    return
  }
  openSelect()
}

function commitSelection(index: number) {
  const option = displayOptions.value[index]
  if (!option || option.disabled) return
  const changed = option.value !== props.modelValue
  emit('update:modelValue', option.value)
  if (changed) {
    emit('change', option.value)
    formItem?.onChange()
  }
  closeSelect(true)
}

function handleClear() {
  if (props.disabled) return
  const cleared = typeof props.modelValue === 'string' ? '' : undefined
  emit('update:modelValue', cleared)
  emit('change', cleared)
  emit('clear')
  formItem?.onChange()
  closeSelect()
}

function moveHighlight(direction: 1 | -1) {
  const list = displayOptions.value
  const enabledCount = list.filter((item) => !item.disabled).length
  if (enabledCount === 0) return

  let cursor = resolvedHighlightedIndex.value
  for (let step = 0; step < list.length; step += 1) {
    cursor = (cursor + direction + list.length) % list.length
    if (!list[cursor]?.disabled) {
      highlightedIndex.value = cursor
      return
    }
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (props.disabled) return
  const isFilterInput = event.target === filterInputRef.value

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (!isOpen.value) {
        openSelect()
        return
      }
      moveHighlight(1)
      return
    case 'ArrowUp':
      event.preventDefault()
      if (!isOpen.value) {
        openSelect()
        return
      }
      moveHighlight(-1)
      return
    case 'Home':
      if (!isOpen.value || isFilterInput) return
      event.preventDefault()
      if (firstEnabledIndex.value >= 0) {
        highlightedIndex.value = firstEnabledIndex.value
      }
      return
    case 'End': {
      if (!isOpen.value || isFilterInput) return
      event.preventDefault()
      for (let i = displayOptions.value.length - 1; i >= 0; i -= 1) {
        if (!displayOptions.value[i]?.disabled) {
          highlightedIndex.value = i
          break
        }
      }
      return
    }
    case ' ':
      if (isFilterInput) return
      event.preventDefault()
      if (!isOpen.value) {
        openSelect()
      } else if (resolvedHighlightedIndex.value >= 0) {
        commitSelection(resolvedHighlightedIndex.value)
      }
      return
    case 'Enter':
      event.preventDefault()
      if (!isOpen.value) {
        openSelect()
        return
      }
      if (resolvedHighlightedIndex.value >= 0) {
        commitSelection(resolvedHighlightedIndex.value)
      }
      return
    case 'Tab':
      if (isOpen.value) {
        closeSelect()
      }
      return
    default:
      return
  }
}

function handleDocumentMouseDown(event: MouseEvent) {
  const target = event.target as Node | null
  if (!target) return
  if (wrapRef.value?.contains(target) || dropdownRef.value?.contains(target)) {
    return
  }
  closeSelect()
  formItem?.onBlur()
}

function handleDocumentKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !isOpen.value) return
  if (unregisterEscape && !isTopmostModal(unregisterEscape.token)) return
  event.preventDefault()
  event.stopPropagation()
  closeSelect(true)
}

function handlePeerOpen(event: Event) {
  const nextSelectId = (event as CustomEvent<string>).detail
  if (nextSelectId !== selectId.value) {
    closeSelect()
  }
}

function cleanupOpenListeners() {
  document.removeEventListener('mousedown', handleDocumentMouseDown)
  document.removeEventListener('keydown', handleDocumentKeyDown, true)
  window.removeEventListener('resize', scheduleDropdownStyleUpdate)
  window.removeEventListener('scroll', scheduleDropdownStyleUpdate, true)
  resizeObserver?.disconnect()
  resizeObserver = null
  if (rafId !== null && typeof window !== 'undefined') {
    window.cancelAnimationFrame(rafId)
    rafId = null
  }
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
  updateDropdownStyle()

  if (typeof ResizeObserver !== 'undefined' && wrapRef.value) {
    resizeObserver = new ResizeObserver(() => {
      scheduleDropdownStyleUpdate()
    })
    resizeObserver.observe(wrapRef.value)
  }

  document.addEventListener('mousedown', handleDocumentMouseDown)
  document.addEventListener('keydown', handleDocumentKeyDown, true)
  window.addEventListener('resize', scheduleDropdownStyleUpdate)
  window.addEventListener('scroll', scheduleDropdownStyleUpdate, true)
})

watch(
  [isOpen, resolvedHighlightedIndex],
  ([active, index]) => {
    if (!active || index < 0 || typeof document === 'undefined') return
    nextTick(() => {
      const optionEl = document.getElementById(`${selectId.value}-option-${index}`)
      optionEl?.scrollIntoView({ block: 'nearest' })
    })
  }
)

watch(filterQuery, () => {
  highlightedIndex.value = firstEnabledIndex.value
})

onMounted(() => {
  document.addEventListener(SELECT_OPEN_EVENT, handlePeerOpen)
})

onBeforeUnmount(() => {
  document.removeEventListener(SELECT_OPEN_EVENT, handlePeerOpen)
  cleanupOpenListeners()
})
</script>

<template>
  <div
    ref="wrapRef"
    class="app-select"
    :class="[
      attrs.class,
      {
        'is-full-width': props.fullWidth,
        'is-lg': props.size === 'lg',
        'is-sm': props.size === 'sm',
        'is-open': isOpen,
        'is-disabled': props.disabled,
        'has-clear': showClearButton,
        'is-error': Boolean(formItem?.hasError)
      }
    ]"
    :style="(attrs.style as any)"
  >
    <button
      :id="selectId"
      ref="triggerRef"
      type="button"
      class="app-select__trigger"
      :disabled="props.disabled"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :aria-controls="isOpen ? listboxId : undefined"
      :aria-activedescendant="
        isOpen && resolvedHighlightedIndex >= 0
          ? `${selectId}-option-${resolvedHighlightedIndex}`
          : undefined
      "
      :aria-label="resolvedAriaLabel"
      :aria-labelledby="(attrs['aria-labelledby'] as string | undefined)"
      :aria-describedby="(attrs['aria-describedby'] as string | undefined)"
      @click="toggleOpen"
      @keydown="handleKeyDown"
      @blur="!isOpen && formItem?.onBlur()"
    >
      <span
        class="app-select__trigger-text"
        :class="{ 'is-placeholder': isPlaceholder }"
      >
        {{ displayText }}
      </span>
      <span
        class="app-select__trigger-icon"
        aria-hidden="true"
      >
        <AppIcon
          name="ChevronDown"
          :size="14"
        />
      </span>
    </button>

    <button
      v-if="showClearButton"
      type="button"
      class="app-select__clear"
      tabindex="-1"
      aria-label="Clear"
      @mousedown.prevent.stop
      @click.stop="handleClear"
    >
      <AppIcon
        name="X"
        :size="13"
      />
    </button>
    <Teleport to="body">
      <div
        v-if="isOpen && dropdownStyle"
        :id="listboxId"
        ref="dropdownRef"
        role="listbox"
        class="app-select__dropdown"
        :aria-label="resolvedAriaLabel"
        :style="dropdownStyle"
      >
        <div
          v-if="props.filterable"
          class="app-select__filter"
        >
          <AppIcon
            name="Search"
            :size="14"
            class="app-select__filter-icon"
          />
          <input
            ref="filterInputRef"
            v-model="filterQuery"
            type="text"
            class="app-select__filter-input"
            :placeholder="props.placeholder"
            @keydown="handleKeyDown"
          >
        </div>

        <div class="app-select__options">
          <button
            v-for="(opt, index) in displayOptions"
            :id="`${selectId}-option-${index}`"
            :key="`${String(opt.value)}-${index}`"
            type="button"
            role="option"
            class="app-select__option"
            :class="{
              'is-active': opt.value === props.modelValue,
              'is-highlighted': index === resolvedHighlightedIndex,
              'is-disabled': opt.disabled
            }"
            :disabled="opt.disabled"
            :aria-selected="opt.value === props.modelValue"
            :aria-disabled="opt.disabled ? 'true' : undefined"
            @mouseenter="!opt.disabled && (highlightedIndex = index)"
            @keydown="handleKeyDown"
            @click="commitSelection(index)"
          >
            <span class="app-select__option-label">{{ opt.label }}</span>
            <AppIcon
              v-if="opt.isCreated"
              name="Plus"
              :size="13"
              class="app-select__option-badge"
            />
          </button>

          <div
            v-if="displayOptions.length === 0"
            class="app-select__empty"
          >
            —
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.app-select {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-width: 0;

  &:where(.is-full-width) {
    width: 100%;
  }

  &.is-disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
}

.app-select__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-width: 0;
  height: var(--control-height-md);
  padding: 0 12px;
  border: 1px solid var(--app-input-border);
  border-radius: var(--app-radius-sm);
  background-color: var(--app-input-bg);
  box-shadow: none;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 400;
  cursor: pointer;
  appearance: none;
  text-align: left;
  box-sizing: border-box;
  transition:
    background-color $transition-fast,
    border-color $transition-fast,
    box-shadow $transition-fast;

  &:hover:not(:disabled) {
    border-color: var(--border-hover);
  }

  &:focus {
    outline: none;
    background-color: var(--app-input-bg-focus);
    border-color: var(--app-input-border-focus);
    box-shadow: 0 0 0 1px var(--app-input-border-focus) inset;
  }

  &[aria-expanded='true'] {
    background-color: var(--app-input-bg-focus);
    border-color: var(--app-input-border-focus);
    box-shadow: 0 0 0 1px var(--app-input-border-focus) inset;
  }

  &:focus-visible {
    outline: 2px solid var(--app-input-border-focus);
    outline-offset: 1px;
    border-color: var(--app-input-border);
    box-shadow: none;
  }

  &:disabled {
    cursor: not-allowed;
  }
}

.app-select.is-error .app-select__trigger {
  border-color: var(--status-graphic-danger);

  &:hover:not(:disabled) {
    border-color: var(--status-graphic-danger);
  }

  &:focus,
  &[aria-expanded='true'] {
    border-color: var(--status-graphic-danger);
    box-shadow: 0 0 0 1px var(--status-graphic-danger) inset;
  }
}

.app-select.is-lg .app-select__trigger {
  height: 40px;
  padding: 0 14px;
  font-size: 14px;
}

.app-select.is-sm .app-select__trigger {
  height: var(--control-height-sm);
  padding: 0 10px;
  font-size: 13px;
}

.app-select.has-clear .app-select__trigger {
  padding-right: 44px;
}

.app-select.is-sm.has-clear .app-select__trigger {
  padding-right: 42px;
}

.app-select.has-clear .app-select__trigger-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
}

.app-select.has-clear .app-select__trigger[aria-expanded='true'] .app-select__trigger-icon {
  transform: translateY(-50%) rotate(180deg);
}

.app-select__trigger-text {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.is-placeholder {
    color: var(--text-tertiary);
    font-weight: 400;
  }
}

.app-select__trigger-icon {
  display: inline-flex;
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: transform 0.2s ease;

  [aria-expanded='true'] > & {
    transform: rotate(180deg);
  }
}

.app-select__clear {
  @include button-reset;
  position: absolute;
  right: 26px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: var(--app-radius-pill);
  color: var(--text-tertiary);
  transition:
    color $transition-fast,
    background-color $transition-fast;

  &:hover {
    color: var(--text-primary);
    background: var(--surface-subtle-hover);
  }
}

.app-select__dropdown {
  position: fixed;
  box-sizing: border-box;
  background: var(--glass-bg);
  border: 1px solid color-mix(in srgb, var(--app-input-border-focus) 30%, var(--app-border-strong));
  border-radius: var(--app-radius-md);
  padding: 6px;
  /* floating layer: elevation allowed */
  box-shadow: var(--floating-shadow-xl);
  backdrop-filter: var(--glass-backdrop-filter);
  -webkit-backdrop-filter: var(--glass-backdrop-filter);
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
}

.app-select__filter {
  display: flex;
  align-items: center;
  gap: 6px;
  height: var(--control-height-sm);
  padding: 0 10px;
  border-radius: var(--app-radius-sm);
  border: 1px solid var(--border-subtle);
  background: var(--app-input-bg);
  color: var(--text-secondary);
  flex-shrink: 0;

  &:focus-within {
    border-color: var(--app-input-border-focus);
    background: var(--app-input-bg-focus);
  }
}

.app-select__filter-icon {
  color: var(--text-tertiary);
}

.app-select__filter-input {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 12.5px;

  &::placeholder {
    color: var(--text-tertiary);
  }
}

.app-select__options {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.app-select__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border-radius: var(--app-radius-sm);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;

  &:hover:not(:disabled) {
    background: var(--app-accent-soft);
  }

  &.is-highlighted:not(:disabled) {
    background: var(--app-accent-soft);
  }

  &.is-active {
    border-color: var(--border-hover);
    background: var(--app-accent-soft);
    color: var(--primary-text);
    font-weight: 600;
  }

  &.is-disabled,
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.app-select__option-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-select__option-badge {
  color: var(--primary-text);
}

.app-select__empty {
  padding: 12px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 12.5px;
}
</style>
