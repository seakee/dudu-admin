<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    status?: string
    dirty?: boolean
  }>(),
  {
    status: undefined,
    dirty: undefined
  }
)

const slots = useSlots()
const { t } = useI18n()

const hasCustomStatusSlot = computed(() => Boolean(slots.status))
const hasDirtyState = computed(() => props.dirty !== undefined)
const hasStatusArea = computed(
  () => hasCustomStatusSlot.value || Boolean(props.status) || hasDirtyState.value
)

const dirtyLabel = computed(() =>
  props.dirty ? t('common.unsavedChanges') : t('common.allSaved')
)
</script>

<template>
  <div class="section-action-footer">
    <div
      v-if="hasStatusArea"
      class="section-action-footer__status"
    >
      <slot name="status">
        <template v-if="props.status">
          {{ props.status }}
        </template>
        <span
          v-else-if="hasDirtyState"
          class="section-action-footer__dirty-indicator"
          :class="{ 'is-dirty': props.dirty }"
        >
          <span
            class="status-dot"
            :class="props.dirty ? 'is-warning' : 'is-success'"
            aria-hidden="true"
          />
          <span>{{ dirtyLabel }}</span>
        </span>
      </slot>
    </div>
    <div v-else />

    <div
      v-if="$slots.default"
      class="section-action-footer__actions"
    >
      <slot />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.section-action-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 12px;
  min-width: 0;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
}

.section-action-footer__status {
  min-width: 0;
  flex: 1 1 200px;
  color: var(--text-secondary);
  font-size: 12.5px;
  line-height: 1.5;
}

.section-action-footer__dirty-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;

  &.is-dirty {
    color: var(--data-badge-warning-text);
  }
}

.section-action-footer__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;

  :deep(.btn + .btn) {
    margin-left: 0;
  }
}
</style>
