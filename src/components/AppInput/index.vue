<script setup lang="ts">
import { computed, inject, ref, useAttrs } from 'vue'
import { FORM_ITEM_CONTEXT_KEY, type ControlSize } from '@/components/types'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    type?: 'text' | 'password' | 'number' | 'email' | 'url' | 'textarea' | 'search' | 'tel'
    size?: ControlSize
    placeholder?: string
    clearable?: boolean
    showPassword?: boolean
    disabled?: boolean
    readonly?: boolean
    prefixIcon?: string
    suffixIcon?: string
    min?: number | string
    max?: number | string
    maxlength?: number | string
    rows?: number
    id?: string
  }>(),
  {
    modelValue: '',
    type: 'text',
    size: 'md',
    placeholder: '',
    clearable: false,
    showPassword: false,
    disabled: false,
    readonly: false,
    prefixIcon: undefined,
    suffixIcon: undefined,
    min: undefined,
    max: undefined,
    maxlength: undefined,
    rows: 3,
    id: undefined
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: any]
  input: [value: any]
  change: [value: any]
  enter: [event: KeyboardEvent]
  clear: []
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const attrs = useAttrs()
const formItem = inject(FORM_ITEM_CONTEXT_KEY, null)

const inputRef = ref<HTMLInputElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const isFocused = ref(false)
const passwordVisible = ref(false)

const isTextarea = computed(() => props.type === 'textarea')

const resolvedId = computed(() => props.id ?? formItem?.inputId)

const stringValue = computed(() =>
  props.modelValue === undefined || props.modelValue === null ? '' : String(props.modelValue)
)

const resolvedInputType = computed(() => {
  if (props.type === 'password' && props.showPassword) {
    return passwordVisible.value ? 'text' : 'password'
  }
  return props.type
})

const showClearButton = computed(
  () => props.clearable && !props.disabled && stringValue.value.length > 0
)

const showPasswordToggle = computed(
  () =>
    props.type === 'password' &&
    props.showPassword &&
    !props.disabled &&
    !props.readonly
)

const controlAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class' || key === 'style') continue
    rest[key] = value
  }
  return rest
})

const rootClasses = computed(() => [
  'app-input',
  attrs.class,
  {
    'is-lg': props.size === 'lg',
    'is-sm': props.size === 'sm',
    'is-textarea': isTextarea.value,
    'is-disabled': props.disabled,
    'is-readonly': props.readonly,
    'is-focused': isFocused.value,
    'is-error': Boolean(formItem?.hasError)
  }
])

function normalizeEmittedValue(raw: string): string | number | undefined {
  if (props.type === 'number') {
    if (raw === '') return undefined
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : raw
  }
  return raw
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  const nextValue = normalizeEmittedValue(target.value)
  emit('update:modelValue', nextValue)
  emit('input', nextValue)
  formItem?.onChange()
}

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  const nextValue = normalizeEmittedValue(target.value)
  emit('change', nextValue)
  formItem?.onChange()
}

function handleFocus(event: FocusEvent) {
  isFocused.value = true
  emit('focus', event)
}

function handleBlur(event: FocusEvent) {
  isFocused.value = false
  emit('blur', event)
  formItem?.onBlur()
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.isComposing) {
    emit('enter', event)
  }
}

function handleClear() {
  if (props.disabled) return
  const cleared = props.type === 'number' ? undefined : ''
  emit('update:modelValue', cleared)
  emit('input', cleared)
  emit('change', cleared)
  emit('clear')
  formItem?.onChange()
  if (!props.readonly) {
    inputRef.value?.focus()
  }
}

function togglePasswordVisibility() {
  if (props.disabled || props.readonly) return
  passwordVisible.value = !passwordVisible.value
  inputRef.value?.focus()
}

function focus() {
  if (isTextarea.value) {
    textareaRef.value?.focus()
  } else {
    inputRef.value?.focus()
  }
}

function blur() {
  if (isTextarea.value) {
    textareaRef.value?.blur()
  } else {
    inputRef.value?.blur()
  }
}

function select() {
  if (isTextarea.value) {
    textareaRef.value?.select()
  } else {
    inputRef.value?.select()
  }
}

defineExpose({
  focus,
  blur,
  select
})
</script>

<template>
  <div
    :class="rootClasses"
    :style="(attrs.style as any)"
  >
    <textarea
      v-if="isTextarea"
      :id="resolvedId"
      ref="textareaRef"
      v-bind="controlAttrs"
      class="textarea app-input__textarea"
      :value="stringValue"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :readonly="props.readonly"
      :maxlength="props.maxlength"
      :rows="props.rows"
      :aria-invalid="formItem?.hasError ? 'true' : undefined"
      @input="handleInput"
      @change="handleChange"
      @focus="handleFocus"
      @blur="handleBlur"
      @keydown="handleKeyDown"
    />

    <div
      v-else
      class="app-input__wrapper"
    >
      <span
        v-if="$slots.prepend"
        class="app-input__prepend"
      >
        <slot name="prepend" />
      </span>

      <span
        v-if="$slots.prefix || props.prefixIcon"
        class="app-input__prefix"
      >
        <slot name="prefix">
          <AppIcon
            v-if="props.prefixIcon"
            :name="props.prefixIcon"
            :size="15"
          />
        </slot>
      </span>

      <input
        :id="resolvedId"
        ref="inputRef"
        v-bind="controlAttrs"
        :type="resolvedInputType"
        class="app-input__inner"
        :value="stringValue"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :min="props.min"
        :max="props.max"
        :maxlength="props.maxlength"
        :aria-invalid="formItem?.hasError ? 'true' : undefined"
        @input="handleInput"
        @change="handleChange"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeyDown"
      >

      <button
        v-if="showClearButton"
        type="button"
        class="app-input__action"
        tabindex="-1"
        aria-label="Clear"
        @mousedown.prevent
        @click.stop="handleClear"
      >
        <AppIcon
          name="X"
          :size="13"
        />
      </button>

      <button
        v-if="showPasswordToggle"
        type="button"
        class="app-input__action"
        tabindex="-1"
        :aria-label="passwordVisible ? 'Hide password' : 'Show password'"
        @mousedown.prevent
        @click.stop="togglePasswordVisibility"
      >
        <AppIcon
          :name="passwordVisible ? 'EyeOff' : 'Eye'"
          :size="15"
        />
      </button>

      <span
        v-if="$slots.suffix || props.suffixIcon"
        class="app-input__suffix"
      >
        <slot name="suffix">
          <AppIcon
            v-if="props.suffixIcon"
            :name="props.suffixIcon"
            :size="15"
          />
        </slot>
      </span>

      <span
        v-if="$slots.append"
        class="app-input__append"
      >
        <slot name="append" />
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-input {
  position: relative;
  display: inline-flex;
  width: 100%;
  min-width: 0;
  font-size: 13.5px;

  &.is-disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
}

.app-input__wrapper {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  height: var(--control-height-md);
  padding: 0 12px;
  border: 1px solid var(--app-input-border);
  border-radius: var(--app-radius-sm);
  background-color: var(--app-input-bg);
  color: var(--text-primary);
  box-sizing: border-box;
  transition:
    background-color $transition-fast,
    border-color $transition-fast,
    box-shadow $transition-fast;

  &:hover {
    border-color: var(--border-hover);
  }
}

.app-input.is-disabled .app-input__wrapper,
.app-input.is-readonly .app-input__wrapper {
  &:hover {
    border-color: var(--app-input-border);
  }
}

.app-input.is-focused:not(.is-disabled) .app-input__wrapper {
  background-color: var(--app-input-bg-focus);
  border-color: var(--app-input-border-focus);
  box-shadow: 0 0 0 1px var(--app-input-border-focus) inset;
}

.app-input.is-error .app-input__wrapper,
.app-input.is-error .app-input__textarea {
  border-color: var(--status-graphic-danger);
}

.app-input.is-error.is-focused .app-input__wrapper,
.app-input.is-error .app-input__textarea:focus {
  border-color: var(--status-graphic-danger);
  box-shadow: 0 0 0 1px var(--status-graphic-danger) inset;
}

.app-input.is-lg .app-input__wrapper {
  height: 40px;
  padding: 0 14px;
  font-size: 14px;
}

.app-input.is-sm .app-input__wrapper {
  height: var(--control-height-sm);
  padding: 0 10px;
  font-size: 13px;
}

.app-input__inner {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  line-height: 1.4;

  &::placeholder {
    color: var(--text-tertiary);
  }

  &:disabled {
    cursor: not-allowed;
  }

  &[type='password']::-ms-reveal,
  &[type='password']::-ms-clear {
    display: none;
  }

  &[type='number'] {
    -moz-appearance: textfield;
    appearance: textfield;

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }
}

.app-input__prefix,
.app-input__suffix {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-tertiary);
}

.app-input__prepend,
.app-input__append {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--text-secondary);
}

.app-input__action {
  @include button-reset;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
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
</style>
