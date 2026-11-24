<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    content?: string
    placement?: 'top' | 'bottom' | 'left' | 'right'
    ariaLabel?: string
  }>(),
  {
    content: '',
    placement: 'top',
    ariaLabel: undefined
  }
)

const resolvedAriaLabel = computed(
  () => props.ariaLabel || props.content || 'More information'
)
</script>

<template>
  <AppTooltip
    v-bind="$attrs"
    :content="props.content"
    :placement="props.placement"
    popper-class="info-tooltip-popper"
  >
    <template
      v-if="$slots.content"
      #content
    >
      <slot name="content" />
    </template>

    <slot>
      <button
        type="button"
        class="info-tooltip__trigger"
        :aria-label="resolvedAriaLabel"
      >
        <AppIcon
          name="Info"
          :size="14"
        />
      </button>
    </slot>
  </AppTooltip>
</template>

<style lang="scss" scoped>
.info-tooltip__trigger {
  @include button-reset;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  color: var(--text-tertiary);
  cursor: help;
  vertical-align: middle;
  transition: color $transition-fast;

  &:hover {
    color: var(--text-secondary);
  }

  &:focus-visible {
    outline: none;
    background: transparent;
    color: var(--primary-text);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color) 28%, transparent);
  }
}
</style>

<style lang="scss">
.app-tooltip.info-tooltip-popper {
  max-width: min(360px, calc(100vw - 24px));
  padding: 8px 10px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
}
</style>
