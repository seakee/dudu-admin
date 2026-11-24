<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    variant?: 'canvas' | 'inline'
    icon?: string
  }>(),
  {
    title: '',
    description: undefined,
    variant: 'canvas',
    icon: undefined
  }
)

const { t } = useI18n()

const isCanvas = computed(() => props.variant === 'canvas')
const resolvedTitle = computed(() => props.title || t('common.noData'))
const iconSize = computed(() => (isCanvas.value ? 22 : 20))
</script>

<template>
  <div
    class="empty-state"
    :class="{ 'is-canvas': isCanvas }"
    :data-variant="props.variant"
  >
    <div class="empty-content">
      <div
        class="empty-icon"
        aria-hidden="true"
      >
        <slot name="icon">
          <AppIcon
            :name="props.icon || 'Inbox'"
            :size="iconSize"
          />
        </slot>
      </div>
      <div class="empty-copy">
        <div class="empty-title">
          {{ resolvedTitle }}
        </div>
        <div
          v-if="props.description"
          class="empty-desc"
        >
          {{ props.description }}
        </div>
      </div>
    </div>

    <div
      v-if="$slots.action"
      class="empty-action"
    >
      <slot name="action" />
    </div>

    <div
      v-if="$slots.footer"
      class="empty-footer"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.empty-state {
  border: 1px dashed var(--border-subtle-dashed);
  border-radius: var(--app-radius-md);
  padding: $spacing-lg;
  background: var(--surface-subtle);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: $spacing-md;
  align-items: center;

  @include mobile {
    flex-direction: column;
    align-items: flex-start;
  }
}

.empty-content {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  min-width: 0;
}

.empty-icon {
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border-radius: var(--app-radius-pill);
  border: 2px solid var(--border-subtle);
  background: var(--surface-subtle-strong);
  display: grid;
  place-items: center;
  color: var(--text-secondary);

  :deep(svg) {
    display: block;
  }
}

.empty-copy {
  min-width: 0;
}

.empty-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.4;
}

.empty-desc {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.empty-action {
  display: inline-flex;
  align-items: center;
  gap: $spacing-sm;
  flex-wrap: wrap;
}

.empty-footer {
  display: flex;
  align-items: center;
  width: 100%;
}

.empty-state.is-canvas {
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  padding: 28px 24px;
  border: 0;
  border-radius: 0;
  background: transparent;
  text-align: center;

  .empty-content {
    flex-direction: column;
    gap: 12px;
  }

  .empty-icon {
    width: 48px;
    height: 48px;
    flex-basis: 48px;
  }

  .empty-title {
    font-size: 15px;
  }

  .empty-action,
  .empty-footer {
    justify-content: center;
  }
}
</style>
