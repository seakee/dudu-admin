<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue'
import { FORM_ITEM_CONTEXT_KEY } from '@/components/types'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    indeterminate?: boolean
    disabled?: boolean
    label?: string
    ariaLabel?: string
    id?: string
  }>(),
  {
    modelValue: false,
    indeterminate: false,
    disabled: false,
    label: undefined,
    ariaLabel: undefined,
    id: undefined
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  change: [value: boolean]
}>()

const formItem = inject(FORM_ITEM_CONTEXT_KEY, null)
const inputRef = ref<HTMLInputElement | null>(null)

const resolvedId = computed(() => props.id ?? formItem?.inputId)
const isChecked = computed(() => Boolean(props.modelValue))

function syncIndeterminate() {
  if (inputRef.value) {
    inputRef.value.indeterminate = Boolean(props.indeterminate)
  }
}

onMounted(syncIndeterminate)
watch(() => props.indeterminate, syncIndeterminate)

function handleChange(event: Event) {
  if (props.disabled) return
  const target = event.target as HTMLInputElement
  const next = Boolean(target.checked)
  emit('update:modelValue', next)
  emit('change', next)
  formItem?.onChange()
}
</script>

<template>
  <label
    class="app-checkbox"
    :class="{
      'is-checked': isChecked,
      'is-indeterminate': props.indeterminate && !isChecked,
      'is-disabled': props.disabled
    }"
  >
    <input
      :id="resolvedId"
      ref="inputRef"
      type="checkbox"
      class="app-checkbox__native"
      :checked="isChecked"
      :disabled="props.disabled"
      :aria-checked="props.indeterminate && !isChecked ? 'mixed' : isChecked"
      :aria-label="props.ariaLabel || props.label"
      @change="handleChange"
      @blur="formItem?.onBlur()"
    >
    <span
      class="app-checkbox__box"
      aria-hidden="true"
    >
      <AppIcon
        v-if="isChecked"
        name="Check"
        :size="12"
      />
      <AppIcon
        v-else-if="props.indeterminate"
        name="Minus"
        :size="12"
      />
    </span>
    <span
      v-if="props.label || $slots.default"
      class="app-checkbox__label"
    >
      <slot>{{ props.label }}</slot>
    </span>
  </label>
</template>

<style lang="scss" scoped>
.app-checkbox {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  color: var(--text-primary);
  font-size: 13.5px;
  line-height: 1.4;

  &.is-disabled {
    opacity: 0.56;
    cursor: not-allowed;
  }
}

.app-checkbox__native {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  margin: 0;
  pointer-events: none;
}

.app-checkbox__box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border-radius: var(--app-radius-xs);
  border: 1px solid var(--app-input-border);
  background: var(--app-input-bg);
  color: var(--primary-contrast);
  transition:
    background-color $transition-fast,
    border-color $transition-fast,
    color $transition-fast;
}

.app-checkbox:hover:not(.is-disabled) .app-checkbox__box {
  border-color: var(--border-hover);
}

.app-checkbox.is-checked .app-checkbox__box,
.app-checkbox.is-indeterminate .app-checkbox__box {
  background: var(--primary-solid);
  border-color: var(--primary-solid);
}

.app-checkbox__native:focus-visible + .app-checkbox__box {
  outline: 2px solid var(--app-input-border-focus);
  outline-offset: 2px;
}

.app-checkbox__label {
  font-weight: 500;
  min-width: 0;
}
</style>
