<script setup lang="ts" generic="K extends string = string">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
  type ComponentPublicInstance
} from 'vue'
import type { SortControlOption, SortDirection } from '@/components/types'

const props = withDefaults(
  defineProps<{
    modelValue: K
    direction?: SortDirection
    options: ReadonlyArray<SortControlOption<K>>
    ariaLabel?: string
    directionLabel?: string
    title?: string
    directionDisabled?: boolean
    fullWidth?: boolean
    dropdownAlign?: 'left' | 'right'
    dropdownDirection?: 'down' | 'up'
  }>(),
  {
    direction: 'desc',
    ariaLabel: undefined,
    directionLabel: undefined,
    title: undefined,
    directionDisabled: false,
    fullWidth: false,
    dropdownAlign: 'left',
    dropdownDirection: 'down'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: K]
  'update:direction': [direction: SortDirection]
  change: [value: K, direction: SortDirection]
}>()

const isOpen = ref(false)
const highlightedIndex = ref(-1)
const rootRef = ref<HTMLDivElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const optionRefs = new Map<K, HTMLButtonElement>()

const selectedIndex = computed(() =>
  props.options.findIndex((option) => option.value === props.modelValue)
)
const selectedOption = computed(
  () => props.options[selectedIndex.value >= 0 ? selectedIndex.value : 0]
)
const selectedLabel = computed(() => selectedOption.value?.label ?? '')

const resolvedAriaLabel = computed(
  () => props.ariaLabel || props.title || selectedLabel.value || 'Sort'
)
const resolvedDirectionLabel = computed(
  () =>
    props.directionLabel ||
    (props.direction === 'asc' ? 'Sort ascending' : 'Sort descending')
)

function setOptionRef(key: K, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLButtonElement) {
    optionRefs.set(key, el)
  } else {
    optionRefs.delete(key)
  }
}

function focusHighlightedOption() {
  if (!isOpen.value || highlightedIndex.value < 0) return
  const target = props.options[highlightedIndex.value]
  if (target) {
    optionRefs.get(target.value)?.focus()
  }
}

function openDropdown(initialIndex?: number) {
  if (props.options.length === 0) return
  isOpen.value = true
  highlightedIndex.value =
    initialIndex !== undefined
      ? initialIndex
      : selectedIndex.value >= 0
        ? selectedIndex.value
        : 0
  void nextTick(focusHighlightedOption)
}

function closeDropdown() {
  isOpen.value = false
  highlightedIndex.value = -1
}

function toggleDropdown() {
  if (isOpen.value) {
    closeDropdown()
  } else {
    openDropdown()
  }
}

function moveHighlight(nextIndex: number) {
  if (props.options.length === 0) return
  const bounded = (nextIndex + props.options.length) % props.options.length
  highlightedIndex.value = bounded
  void nextTick(focusHighlightedOption)
}

function commitOption(optionValue: K) {
  closeDropdown()
  triggerRef.value?.focus()
  if (optionValue !== props.modelValue) {
    emit('update:modelValue', optionValue)
    emit('change', optionValue, props.direction)
  }
}

function handleToggleDirection() {
  if (props.directionDisabled) return
  const nextDirection: SortDirection = props.direction === 'asc' ? 'desc' : 'asc'
  emit('update:direction', nextDirection)
  emit('change', props.modelValue, nextDirection)
}

function handleTriggerKeyDown(event: KeyboardEvent) {
  if (props.options.length === 0) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (!isOpen.value) {
        openDropdown(selectedIndex.value >= 0 ? selectedIndex.value : 0)
      } else {
        moveHighlight(highlightedIndex.value + 1)
      }
      break
    case 'ArrowUp':
      event.preventDefault()
      if (!isOpen.value) {
        openDropdown(
          selectedIndex.value >= 0 ? selectedIndex.value : props.options.length - 1
        )
      } else {
        moveHighlight(highlightedIndex.value - 1)
      }
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      toggleDropdown()
      break
    case 'Escape':
      if (isOpen.value) {
        event.preventDefault()
        closeDropdown()
      }
      break
  }
}

function handleOptionKeyDown(event: KeyboardEvent, optionIndex: number) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      moveHighlight(optionIndex + 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      moveHighlight(optionIndex - 1)
      break
    case 'Home':
      event.preventDefault()
      moveHighlight(0)
      break
    case 'End':
      event.preventDefault()
      moveHighlight(props.options.length - 1)
      break
    case 'Enter':
    case ' ': {
      event.preventDefault()
      const option = props.options[optionIndex]
      if (option) {
        commitOption(option.value)
      }
      break
    }
    case 'Escape':
      event.preventDefault()
      closeDropdown()
      triggerRef.value?.focus()
      break
  }
}

function handlePointerDownOutside(event: PointerEvent) {
  const target = event.target as Node | null
  if (target && rootRef.value && !rootRef.value.contains(target)) {
    closeDropdown()
  }
}

watch(isOpen, (open) => {
  if (typeof document === 'undefined') return
  if (open) {
    document.addEventListener('pointerdown', handlePointerDownOutside)
  } else {
    document.removeEventListener('pointerdown', handlePointerDownOutside)
  }
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('pointerdown', handlePointerDownOutside)
  }
})
</script>

<template>
  <div
    ref="rootRef"
    class="sort-control"
    :class="{ 'is-full-width': props.fullWidth }"
  >
    <button
      ref="triggerRef"
      type="button"
      class="sort-control__trigger"
      :title="props.title ?? resolvedAriaLabel"
      :aria-label="resolvedAriaLabel"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      @click="toggleDropdown"
      @keydown="handleTriggerKeyDown"
    >
      <span class="sort-control__label">
        {{ selectedLabel }}
      </span>
    </button>

    <button
      type="button"
      class="sort-control__direction"
      :disabled="props.directionDisabled"
      :title="resolvedDirectionLabel"
      :aria-label="resolvedDirectionLabel"
      @click="handleToggleDirection"
    >
      <span
        class="sort-control__direction-icon"
        aria-hidden="true"
      >
        <svg
          v-if="props.direction === 'asc'"
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="m3 8 4-4 4 4" />
          <path d="M7 4v16" />
          <path d="M11 12h4" />
          <path d="M11 16h7" />
          <path d="M11 20h10" />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="m3 16 4 4 4-4" />
          <path d="M7 20V4" />
          <path d="M11 4h10" />
          <path d="M11 8h7" />
          <path d="M11 12h4" />
        </svg>
      </span>
    </button>

    <div
      v-if="isOpen"
      class="sort-control__dropdown"
      :class="{
        'is-right': props.dropdownAlign === 'right',
        'is-up': props.dropdownDirection === 'up'
      }"
      role="listbox"
    >
      <button
        v-for="(option, optionIndex) in props.options"
        :key="option.value"
        :ref="(el) => setOptionRef(option.value, el)"
        type="button"
        role="option"
        :aria-selected="option.value === props.modelValue"
        class="sort-control__option"
        :class="{
          'is-selected': option.value === props.modelValue,
          'is-highlighted': optionIndex === highlightedIndex
        }"
        @click="commitOption(option.value)"
        @keydown="(event) => handleOptionKeyDown(event, optionIndex)"
        @mouseenter="highlightedIndex = optionIndex"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.sort-control {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-width: 0;
  box-sizing: border-box;
  height: var(--control-height-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--app-radius-sm);
  background: var(--surface-subtle);
  overflow: visible;
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease;

  &:hover,
  &:focus-within {
    border-color: color-mix(in srgb, var(--primary-color) 42%, var(--border-color));
    background: color-mix(in srgb, var(--primary-color) 6%, var(--surface-subtle));
  }

  &.is-full-width {
    width: 100%;
  }
}

.sort-control__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  flex: 1 1 auto;
  min-width: 78px;
  height: 100%;
  min-height: 0;
  padding: 0 4px 0 12px;
  border: 0;
  border-radius: var(--app-radius-sm) 0 0 var(--app-radius-sm);
  background: transparent;
  box-shadow: none;
  color: var(--text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    color: var(--text-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--app-input-border-focus);
    outline-offset: -2px;
  }
}

.sort-control__label {
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sort-control__direction {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 36px;
  width: 36px;
  height: 100%;
  min-height: 0;
  padding: 0;
  border: 0;
  border-left: 1px solid color-mix(in srgb, var(--border-color) 72%, transparent);
  border-radius: 0 var(--app-radius-sm) var(--app-radius-sm) 0;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    color 0.16s ease;

  &:hover:not(:disabled),
  &:focus-visible:not(:disabled) {
    outline: 0;
    background: color-mix(in srgb, var(--primary-color) 10%, transparent);
    color: var(--primary-text);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.sort-control__direction-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
}

.sort-control__dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: $z-dropdown;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 100%;
  padding: 4px;
  border: 1px solid var(--border-primary);
  border-radius: var(--app-radius-md);
  background: var(--floating-surface);
  /* floating layer: elevation allowed */
  box-shadow: var(--floating-shadow-lg);

  &.is-right {
    left: auto;
    right: 0;
  }

  &.is-up {
    top: auto;
    bottom: calc(100% + 4px);
  }
}

.sort-control__option {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: var(--control-height-sm);
  padding: 0 10px;
  border: 0;
  border-radius: var(--app-radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    outline: 0;
    background: color-mix(in srgb, var(--primary-color) 7%, var(--surface-subtle));
    color: var(--text-primary);
  }

  &.is-selected {
    color: var(--primary-text);
    font-weight: 700;
  }

  &.is-highlighted {
    background: color-mix(in srgb, var(--primary-color) 7%, var(--surface-subtle));
    color: var(--text-primary);
  }

  &.is-selected.is-highlighted {
    color: var(--primary-text);
  }
}
</style>
