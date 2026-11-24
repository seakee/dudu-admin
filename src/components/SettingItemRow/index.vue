<script setup lang="ts">
import type { StatusPillTone } from '@/components/types'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    badge?: string
    badgeTone?: StatusPillTone
    badgeDot?: boolean
    badgeMono?: boolean
  }>(),
  {
    description: '',
    badge: '',
    badgeTone: 'neutral',
    badgeDot: false,
    badgeMono: false
  }
)
</script>

<template>
  <div class="setting-item-row">
    <div class="setting-item-row__main">
      <div class="setting-item-row__title-line">
        <span class="setting-item-row__title">{{ props.title }}</span>
        <slot name="badge">
          <StatusPill
            v-if="props.badge"
            compact
            :tone="props.badgeTone"
            :dot="props.badgeDot"
            :mono="props.badgeMono"
            :label="props.badge"
          />
        </slot>
      </div>
      <p
        v-if="props.description"
        class="setting-item-row__desc"
      >
        {{ props.description }}
      </p>
      <div
        v-if="$slots.meta"
        class="setting-item-row__meta"
      >
        <slot name="meta" />
      </div>
    </div>

    <div
      v-if="$slots.action"
      class="setting-item-row__action"
    >
      <slot name="action" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.setting-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px 24px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-subtle);
  transition: background-color $transition-fast;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: color-mix(in srgb, var(--surface-subtle) 55%, transparent);
  }
}

.setting-item-row__main {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.setting-item-row__title-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.setting-item-row__title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-primary);
}

.setting-item-row__desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.setting-item-row__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.setting-item-row__action {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;
}

@include mobile {
  .setting-item-row {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 14px 16px;
  }

  .setting-item-row__action {
    justify-content: flex-end;
  }
}
</style>
