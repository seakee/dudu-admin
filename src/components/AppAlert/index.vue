<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AlertType } from '@/components/types'

const props = withDefaults(
  defineProps<{
    type?: AlertType
    title?: string
    description?: string
    closable?: boolean
    showIcon?: boolean
  }>(),
  {
    type: 'info',
    title: undefined,
    description: undefined,
    closable: false,
    showIcon: true
  }
)

const emit = defineEmits<{
  close: []
}>()

const dismissed = ref(false)

const iconName = computed(() => {
  switch (props.type) {
    case 'success':
      return 'CircleCheck'
    case 'warning':
      return 'TriangleExclamationPoint'
    case 'error':
      return 'CircleX'
    default:
      return 'Info'
  }
})

function handleClose() {
  dismissed.value = true
  emit('close')
}
</script>

<template>
  <div
    v-if="!dismissed"
    class="app-alert"
    :class="`is-${props.type}`"
    :role="props.type === 'error' || props.type === 'warning' ? 'alert' : 'status'"
  >
    <span
      v-if="props.showIcon"
      class="app-alert__icon"
      aria-hidden="true"
    >
      <AppIcon
        :name="iconName"
        :size="17"
      />
    </span>

    <div class="app-alert__body">
      <div
        v-if="props.title || $slots.title"
        class="app-alert__title"
      >
        <slot name="title">
          {{ props.title }}
        </slot>
      </div>
      <div
        v-if="props.description || $slots.default"
        class="app-alert__description"
      >
        <slot>
          {{ props.description }}
        </slot>
      </div>
    </div>

    <button
      v-if="props.closable"
      type="button"
      class="app-alert__close"
      aria-label="Close"
      @click="handleClose"
    >
      <AppIcon
        name="X"
        :size="14"
      />
    </button>
  </div>
</template>

<style lang="scss" scoped>
.app-alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 14px;
  border-radius: var(--app-radius-md);
  border: 1px solid var(--data-badge-info-border);
  background: var(--data-badge-info-bg);
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.5;

  &.is-info {
    border-color: var(--data-badge-info-border);
    background: var(--data-badge-info-bg);

    .app-alert__icon,
    .app-alert__title {
      color: var(--data-badge-info-text);
    }
  }

  &.is-success {
    border-color: var(--data-badge-success-border);
    background: var(--data-badge-success-bg);

    .app-alert__icon,
    .app-alert__title {
      color: var(--data-badge-success-text);
    }
  }

  &.is-warning {
    border-color: var(--data-badge-warning-border);
    background: var(--data-badge-warning-bg);

    .app-alert__icon,
    .app-alert__title {
      color: var(--data-badge-warning-text);
    }
  }

  &.is-error {
    border-color: var(--data-badge-danger-border);
    background: var(--data-badge-danger-bg);

    .app-alert__icon,
    .app-alert__title {
      color: var(--data-badge-danger-text);
    }
  }
}

.app-alert__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.app-alert__body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.app-alert__title {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.4;
}

.app-alert__description {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}

.app-alert__close {
  @include button-reset;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: var(--app-radius-xs);
  color: var(--text-secondary);
  transition:
    color $transition-fast,
    background-color $transition-fast;

  &:hover {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--text-primary) 8%, transparent);
  }
}
</style>
