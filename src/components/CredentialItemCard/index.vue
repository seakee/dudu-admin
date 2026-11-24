<script setup lang="ts">
import type { StatusPillTone } from '@/components/types'

export type CredentialIconVariant = 'default' | 'passkey' | 'feishu' | 'wechat'

const props = withDefaults(
  defineProps<{
    title: string
    badge?: string
    badgeTone?: StatusPillTone
    badgeMono?: boolean
    iconVariant?: CredentialIconVariant
  }>(),
  {
    badge: '',
    badgeTone: 'neutral',
    badgeMono: true,
    iconVariant: 'default'
  }
)
</script>

<template>
  <article class="credential-item-card">
    <div
      v-if="$slots.icon"
      class="credential-item-card__icon"
      :class="`is-${props.iconVariant}`"
    >
      <slot name="icon" />
    </div>

    <div class="credential-item-card__content">
      <div class="credential-item-card__head">
        <h4>{{ props.title }}</h4>
        <slot name="title-extra">
          <StatusPill
            v-if="props.badge"
            compact
            :mono="props.badgeMono"
            :tone="props.badgeTone"
            :label="props.badge"
          />
        </slot>
      </div>

      <div
        v-if="$slots.meta"
        class="credential-item-card__meta tabular-nums"
      >
        <slot name="meta" />
      </div>
    </div>

    <div
      v-if="$slots.action"
      class="credential-item-card__action"
    >
      <slot name="action" />
    </div>
  </article>
</template>

<style lang="scss" scoped>
.credential-item-card {
  display: flex;
  align-items: center;
  gap: 14px;
  border-radius: var(--app-radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--surface-subtle);
  padding: 14px 16px;
  transition: border-color $transition-fast;

  &:hover {
    border-color: var(--border-hover);
  }
}

.credential-item-card__icon {
  display: inline-flex;
  height: 40px;
  width: 40px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: var(--app-radius-md);
  font-size: 18px;
  font-weight: 700;
  background: var(--app-surface-strong);
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);

  &.is-passkey,
  &.is-wechat {
    background: var(--data-badge-info-bg);
    border-color: var(--data-badge-info-border);
    color: var(--data-badge-info-text);
  }

  &.is-feishu {
    background: var(--data-badge-success-bg);
    border-color: var(--data-badge-success-border);
    color: var(--data-badge-success-text);
  }

  &.is-default {
    background: var(--app-surface-strong);
    border-color: var(--border-subtle);
    color: var(--text-secondary);
  }

  :deep(.app-avatar) {
    background: transparent;
    border-color: transparent;
  }
}

.credential-item-card__content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 6px;
}

.credential-item-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.credential-item-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-tertiary);
}

.credential-item-card__action {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

@include mobile {
  .credential-item-card {
    flex-direction: column;
    align-items: stretch;
  }

  .credential-item-card__action {
    width: 100%;

    :deep(.btn) {
      flex: 1;
    }
  }
}
</style>
