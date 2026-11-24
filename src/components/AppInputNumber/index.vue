<script setup lang="ts">
import { computed, inject, ref, useAttrs, watch } from 'vue'
import { FORM_ITEM_CONTEXT_KEY, type ControlSize } from '@/components/types'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: number | null
    min?: number
    max?: number
    step?: number
    disabled?: boolean
    size?: ControlSize
    placeholder?: string
    id?: string
  }>(),
  {
    modelValue: 0,
    min: -Infinity,
    max: Infinity,
    step: 1,
    disabled: false,
    size: 'md',
    placeholder: '',
    id: undefined
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
  change: [currentValue: number, oldValue: number | undefined]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const attrs = useAttrs()
const formItem = inject(FORM_ITEM_CONTEXT_KEY, null)

const inputRef = ref<HTMLInputElement | null>(null)
const isFocused = ref(false)
const draftText = ref('')

const resolvedId = computed(() => props.id ?? formItem?.inputId)

const safeStep = computed(() => (Number.isFinite(props.step) && props.step > 0 ? props.step : 1))

const currentNumeric = computed(() => {
  if (typeof props.modelValue === 'number' && Number.isFinite(props.modelValue)) {
    return props.modelValue
  }
  return Number.isFinite(props.min) ? props.min : 0
})

const canDecrease = computed(() => !props.disabled && currentNumeric.value > props.min)
const canIncrease = computed(() => !props.disabled && currentNumeric.value < props.max)

const controlAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class' || key === 'style') continue
    rest[key] = value
  }
  return rest
})

function getPrecision(num: number): number {
  const str = String(num)
  const dotIndex = str.indexOf('.')
  return dotIndex === -1 ? 0 : str.length - dotIndex - 1
}

function clampNumber(val: number): number {
  const precision = Math.max(getPrecision(currentNumeric.value), getPrecision(safeStep.value))
  const rounded = precision > 0 ? Number(val.toFixed(precision)) : val
  return Math.min(props.max, Math.max(props.min, rounded))
}

watch(
  () => props.modelValue,
  (val) => {
    if (!isFocused.value) {
      draftText.value = val === undefined || val === null || Number.isNaN(val) ? '' : String(val)
    }
  },
  { immediate: true }
)

function commitValue(rawNumber: number) {
  const next = clampNumber(rawNumber)
  const prev = typeof props.modelValue === 'number' ? props.modelValue : undefined
  draftText.value = String(next)
  if (next !== prev) {
    emit('update:modelValue', next)
    emit('change', next, prev)
    formItem?.onChange()
  }
}

function stepBy(delta: 1 | -1) {
  if (props.disabled) return
  commitValue(currentNumeric.value + delta * safeStep.value)
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  draftText.value = target.value
  const parsed = Number(target.value)
  if (target.value.trim() !== '' && Number.isFinite(parsed)) {
    const clamped = clampNumber(parsed)
    if (clamped === parsed) {
      emit('update:modelValue', clamped)
      formItem?.onChange()
    }
  }
}

function commitDraft() {
  const trimmed = draftText.value.trim()
  if (trimmed === '') {
    commitValue(Number.isFinite(props.min) ? Math.max(0, props.min) : 0)
    return
  }
  const parsed = Number(trimmed)
  if (Number.isFinite(parsed)) {
    commitValue(parsed)
  } else {
    draftText.value = String(currentNumeric.value)
  }
}

function handleFocus(event: FocusEvent) {
  isFocused.value = true
  emit('focus', event)
}

function handleBlur(event: FocusEvent) {
  isFocused.value = false
  commitDraft()
  emit('blur', event)
  formItem?.onBlur()
}

function handleKeyDown(event: KeyboardEvent) {
  if (props.disabled) return
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    stepBy(1)
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    stepBy(-1)
  } else if (event.key === 'Enter') {
    commitDraft()
  }
}

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur()
})
</script>

<template>
  <div
    class="app-input-number"
    :class="[
      attrs.class,
      {
        'is-lg': props.size === 'lg',
        'is-sm': props.size === 'sm',
        'is-disabled': props.disabled,
        'is-focused': isFocused,
        'is-error': Boolean(formItem?.hasError)
      }
    ]"
    :style="(attrs.style as any)"
  >
    <button
      type="button"
      class="app-input-number__step is-decrease"
      :disabled="!canDecrease"
      tabindex="-1"
      aria-label="Decrease"
      @mousedown.prevent
      @click="stepBy(-1)"
    >
      <AppIcon
        name="Minus"
        :size="13"
      />
    </button>

    <input
      :id="resolvedId"
      ref="inputRef"
      v-bind="controlAttrs"
      type="text"
      inputmode="decimal"
      role="spinbutton"
      class="app-input-number__inner"
      :value="draftText"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :aria-valuemin="Number.isFinite(props.min) ? props.min : undefined"
      :aria-valuemax="Number.isFinite(props.max) ? props.max : undefined"
      :aria-valuenow="currentNumeric"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
      @keydown="handleKeyDown"
    >

    <button
      type="button"
      class="app-input-number__step is-increase"
      :disabled="!canIncrease"
      tabindex="-1"
      aria-label="Increase"
      @mousedown.prevent
      @click="stepBy(1)"
    >
      <AppIcon
        name="Plus"
        :size="13"
      />
    </button>
  </div>
</template>

<style lang="scss" scoped>
.app-input-number {
  display: inline-flex;
  align-items: stretch;
  width: 140px;
  min-width: 108px;
  height: var(--control-height-md);
  border: 1px solid var(--app-input-border);
  border-radius: var(--app-radius-sm);
  background-color: var(--app-input-bg);
  color: var(--text-primary);
  overflow: hidden;
  box-sizing: border-box;
  transition:
    background-color $transition-fast,
    border-color $transition-fast,
    box-shadow $transition-fast;

  &:hover:not(.is-disabled) {
    border-color: var(--border-hover);
  }

  &.is-focused:not(.is-disabled) {
    background-color: var(--app-input-bg-focus);
    border-color: var(--app-input-border-focus);
    box-shadow: 0 0 0 1px var(--app-input-border-focus) inset;
  }

  &.is-error {
    border-color: var(--status-graphic-danger);

    &:hover:not(.is-disabled) {
      border-color: var(--status-graphic-danger);
    }

    &.is-focused:not(.is-disabled) {
      border-color: var(--status-graphic-danger);
      box-shadow: 0 0 0 1px var(--status-graphic-danger) inset;
    }
  }

  &.is-lg {
    height: 40px;

    .app-input-number__inner {
      font-size: 14px;
    }
  }

  &.is-sm {
    height: var(--control-height-sm);

    .app-input-number__inner {
      font-size: 13px;
    }
  }

  &.is-disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
}

.app-input-number__step {
  @include button-reset;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  flex-shrink: 0;
  color: var(--text-secondary);
  background: var(--surface-subtle);
  transition:
    color $transition-fast,
    background-color $transition-fast;

  &.is-decrease {
    border-right: 1px solid var(--border-subtle);
  }

  &.is-increase {
    border-left: 1px solid var(--border-subtle);
  }

  &:hover:not(:disabled) {
    color: var(--primary-text);
    background: var(--app-accent-soft);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.app-input-number__inner {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  padding: 0 8px;
  border: none;
  outline: none;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: 13.5px;
  font-variant-numeric: tabular-nums;
  text-align: center;

  &:disabled {
    cursor: not-allowed;
  }
}
</style>
