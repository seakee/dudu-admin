<script setup lang="ts">
import { computed } from 'vue'
import type { ButtonSize, ButtonTone, ButtonVariant } from '@/components/types'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    loading?: boolean
    disabled?: boolean
    icon?: string
    iconOnly?: boolean
    block?: boolean
    nativeType?: 'button' | 'submit' | 'reset'
    tone?: ButtonTone
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    loading: false,
    disabled: false,
    icon: undefined,
    iconOnly: false,
    block: false,
    nativeType: 'button',
    tone: undefined
  }
)

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const isDisabled = computed(() => props.disabled || props.loading)

const iconSize = computed(() => {
  if (props.size === 'xs') return 14
  if (props.size === 'sm') return 15
  return 16
})

const buttonClasses = computed(() => [
  'btn',
  'app-button',
  `btn-${props.variant}`,
  {
    'btn-lg': props.size === 'lg',
    'btn-sm': props.size === 'sm',
    'btn-xs': props.size === 'xs',
    'btn-icon-only': props.iconOnly,
    'btn-full': props.block,
    'is-loading': props.loading,
    'is-primary': props.tone === 'primary',
    'is-danger': props.tone === 'danger',
    'is-warning': props.tone === 'warning',
    'is-success': props.tone === 'success',
    'is-neutral': props.tone === 'neutral'
  }
])

function handleClick(event: MouseEvent) {
  if (isDisabled.value) {
    event.preventDefault()
    return
  }
  emit('click', event)
}
</script>

<template>
  <button
    :type="props.nativeType"
    :class="buttonClasses"
    :disabled="isDisabled"
    :aria-busy="props.loading ? 'true' : undefined"
    @click="handleClick"
  >
    <span
      v-if="props.loading"
      class="loading-spinner app-button__spinner"
      aria-hidden="true"
    />
    <slot
      v-else-if="$slots.icon"
      name="icon"
    />
    <AppIcon
      v-else-if="props.icon"
      :name="props.icon"
      :size="iconSize"
    />

    <span v-if="$slots.default && !props.iconOnly">
      <slot />
    </span>
  </button>
</template>

<style lang="scss" scoped>
.app-button {
  &.btn-lg:not(.btn-link) {
    height: 40px;
    padding: 0 18px;
    font-size: 14px;
  }

  &.btn-lg.btn-icon-only {
    width: 40px;
    min-width: 40px;
    padding: 0;
  }

  &.btn-xs .app-button__spinner {
    width: 13px;
    height: 13px;
    border-width: 2px;
  }

  &.btn-sm .app-button__spinner {
    width: 14px;
    height: 14px;
    border-width: 2px;
  }
}
</style>
