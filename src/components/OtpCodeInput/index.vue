<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue?: string
  length?: number
  disabled?: boolean
}>(), {
  modelValue: '',
  length: 6,
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  complete: [value: string]
}>()

const safeLength = computed(() => Math.max(1, Number(props.length || 6)))
const digits = ref<string[]>(getDigitsFromCode(props.modelValue || ''))
const inputRefs = ref<Array<HTMLInputElement | null>>([])

function normalizeCode(value: string) {
  return value.replace(/\D/g, '').slice(0, safeLength.value)
}

function getDigitsFromCode(value: string) {
  const normalizedValue = normalizeCode(value)
  return Array.from({ length: safeLength.value }, (_item, index) => normalizedValue[index] || '')
}

function syncDigitsFromModelValue(value: string) {
  digits.value = getDigitsFromCode(value)
}

function syncModelValue() {
  const nextValue = digits.value.join('')
  if (nextValue !== props.modelValue) {
    emit('update:modelValue', nextValue)
  }
}

function emitCompleteIfReady() {
  const code = digits.value.join('')
  if (code.length === safeLength.value && /^\d+$/.test(code)) {
    emit('complete', code)
  }
}

function setInputRef(element: unknown, index: number) {
  inputRefs.value[index] = element as HTMLInputElement | null
}

function focusAt(index: number) {
  const target = inputRefs.value[index]
  if (!target) return

  target.focus()
  target.select()
}

function focusFirst() {
  const emptyIndex = digits.value.findIndex((digit) => !digit)
  focusAt(emptyIndex === -1 ? safeLength.value - 1 : emptyIndex)
}

function clear() {
  digits.value = Array.from({ length: safeLength.value }, () => '')
  syncModelValue()
}

function fillDigits(rawValue: string, startIndex = 0) {
  const normalizedValue = normalizeCode(rawValue)
  if (!normalizedValue) return

  let cursor = startIndex
  for (const digit of normalizedValue) {
    if (cursor >= safeLength.value) break
    digits.value[cursor] = digit
    cursor++
  }

  syncModelValue()
  emitCompleteIfReady()
  focusAt(cursor >= safeLength.value ? safeLength.value - 1 : cursor)
}

function handleInput(event: Event, index: number) {
  const target = event.target as HTMLInputElement
  const normalizedValue = target.value.replace(/\D/g, '')

  if (!normalizedValue) {
    digits.value[index] = ''
    syncModelValue()
    return
  }

  if (normalizedValue.length > 1) {
    fillDigits(normalizedValue, index)
    return
  }

  digits.value[index] = normalizedValue
  syncModelValue()
  emitCompleteIfReady()

  if (index < safeLength.value - 1) {
    focusAt(index + 1)
  }
}

function handleKeydown(event: KeyboardEvent, index: number) {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return
  }

  if (event.key === 'Backspace') {
    event.preventDefault()

    if (digits.value[index]) {
      digits.value[index] = ''
      syncModelValue()
      return
    }

    if (index > 0) {
      digits.value[index - 1] = ''
      syncModelValue()
      focusAt(index - 1)
    }
    return
  }

  if (event.key === 'Delete') {
    event.preventDefault()
    digits.value[index] = ''
    syncModelValue()
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    if (index > 0) {
      focusAt(index - 1)
    }
    return
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    if (index < safeLength.value - 1) {
      focusAt(index + 1)
    }
    return
  }

  if (event.key.length === 1 && /\D/.test(event.key)) {
    event.preventDefault()
  }
}

function handlePaste(event: ClipboardEvent, index = 0) {
  event.preventDefault()

  const pasteText = event.clipboardData?.getData('text') || ''
  fillDigits(pasteText, index)
}

function handleFocus(index: number) {
  inputRefs.value[index]?.select()
}

watch(
  () => props.modelValue,
  (nextValue = '') => {
    const normalizedValue = normalizeCode(nextValue)
    if (normalizedValue !== digits.value.join('')) {
      syncDigitsFromModelValue(normalizedValue)
    }
  },
  { immediate: true }
)

watch(
  safeLength,
  () => {
    syncDigitsFromModelValue(props.modelValue || '')
    inputRefs.value = []
  }
)

defineExpose({
  focusFirst,
  focusAt,
  clear
})
</script>

<template>
  <div
    class="otp-code-input"
    :style="{ gridTemplateColumns: `repeat(${safeLength}, minmax(0, 1fr))` }"
  >
    <input
      v-for="(digit, index) in digits"
      :key="`otp-cell-${index}`"
      :ref="(element) => setInputRef(element, index)"
      :value="digit"
      class="otp-code-input__cell tabular-nums font-mono"
      type="text"
      maxlength="1"
      inputmode="numeric"
      autocomplete="one-time-code"
      :disabled="props.disabled"
      @input="handleInput($event, index)"
      @keydown="handleKeydown($event, index)"
      @paste="handlePaste($event, index)"
      @focus="handleFocus(index)"
    >
  </div>
</template>

<style lang="scss" scoped>
.otp-code-input {
  width: min(100%, 340px);
  display: grid;
  gap: 10px;
}

.otp-code-input__cell {
  height: 48px;
  border-radius: var(--app-radius-md);
  border: 1px solid var(--app-input-border);
  background: var(--app-input-bg);
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: var(--text-primary);
  outline: none;
  transition:
    border-color $transition-fast,
    box-shadow $transition-fast,
    background-color $transition-fast;

  &:hover:not(:disabled) {
    border-color: var(--border-hover);
  }

  &:focus {
    border-color: var(--app-input-border-focus);
    background: var(--app-input-bg-focus);
    box-shadow: 0 0 0 2px var(--focus-inset);
  }

  &:disabled {
    cursor: not-allowed;
    border-color: var(--border-subtle);
    background: var(--surface-subtle);
    color: var(--text-tertiary);
  }
}

@include mobile {
  .otp-code-input {
    gap: 8px;
    width: 100%;
  }

  .otp-code-input__cell {
    height: 42px;
    border-radius: var(--app-radius-sm);
    font-size: 18px;
  }
}
</style>
