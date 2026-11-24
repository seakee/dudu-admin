<script setup lang="ts">
import { computed, inject } from 'vue'
import { FORM_ITEM_CONTEXT_KEY } from '@/components/types'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    disabled?: boolean
    label?: string
    ariaLabel?: string
    id?: string
  }>(),
  {
    modelValue: false,
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

const resolvedId = computed(() => props.id ?? formItem?.inputId)

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
    class="switch app-switch"
    :class="{ 'is-disabled': props.disabled }"
  >
    <input
      :id="resolvedId"
      type="checkbox"
      role="switch"
      :checked="Boolean(props.modelValue)"
      :disabled="props.disabled"
      :aria-checked="Boolean(props.modelValue)"
      :aria-label="props.ariaLabel || props.label"
      @change="handleChange"
      @blur="formItem?.onBlur()"
    >
    <span
      class="track"
      aria-hidden="true"
    >
      <span class="thumb" />
    </span>
    <span
      v-if="props.label || $slots.default"
      class="label"
    >
      <slot>{{ props.label }}</slot>
    </span>
  </label>
</template>
