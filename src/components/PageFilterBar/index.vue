<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    controlWidth?: string
    size?: 'sm' | 'md'
    showSearch?: boolean
    showReset?: boolean
    searchVariant?: 'primary' | 'secondary'
    searchLabel?: string
    resetLabel?: string
    loading?: boolean
    disabled?: boolean
  }>(),
  {
    controlWidth: '168px',
    size: 'sm',
    showSearch: true,
    showReset: true,
    searchVariant: undefined,
    searchLabel: undefined,
    resetLabel: undefined,
    loading: false,
    disabled: false
  }
)

const emit = defineEmits<{
  search: []
  reset: []
}>()

const { t } = useI18n()
const slots = useSlots()

const hasFields = computed(() => Boolean(slots.default))
const hasActions = computed(() => Boolean(slots.actions))
const showQueryActions = computed(() => props.showSearch || props.showReset)

const resolvedSearchVariant = computed<'primary' | 'secondary'>(() => {
  if (props.searchVariant) return props.searchVariant
  return hasActions.value ? 'secondary' : 'primary'
})

const barStyle = computed<Record<string, string>>(() => ({
  '--page-filter-control-width': props.controlWidth
}))
</script>

<template>
  <div
    class="page-filter-bar"
    :class="{ 'is-actions-only': !hasFields && !showQueryActions && hasActions }"
    :style="barStyle"
  >
    <div
      v-if="hasFields || showQueryActions"
      class="page-filter-bar__fields"
    >
      <slot />
      <div
        v-if="showQueryActions"
        class="page-filter-bar__query-actions"
      >
        <AppButton
          v-if="props.showSearch"
          :variant="resolvedSearchVariant"
          :size="props.size"
          :disabled="props.disabled"
          :loading="props.loading"
          @click="emit('search')"
        >
          {{ props.searchLabel || t('common.search') }}
        </AppButton>
        <AppButton
          v-if="props.showReset"
          variant="secondary"
          :size="props.size"
          :disabled="props.disabled || props.loading"
          @click="emit('reset')"
        >
          {{ props.resetLabel || t('common.reset') }}
        </AppButton>
      </div>
    </div>

    <div
      v-if="hasActions"
      class="page-filter-bar__actions"
    >
      <slot name="actions" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
  min-width: 0;
}

.page-filter-bar.is-actions-only {
  justify-content: flex-end;
}

.page-filter-bar__fields {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  flex: 1 1 260px;
  gap: 8px;
  min-width: 0;

  :deep(> .app-input),
  :deep(> .app-select),
  :deep(> .app-input-number) {
    flex: 0 0 var(--page-filter-control-width, 168px);
    width: var(--page-filter-control-width, 168px);
    max-width: var(--page-filter-control-width, 168px);
  }

  @include mobile {
    :deep(> .app-input),
    :deep(> .app-select),
    :deep(> .app-input-number) {
      flex: 1 1 100%;
      width: 100%;
      max-width: none;
    }
  }
}

.page-filter-bar__query-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.page-filter-bar__actions {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
}
</style>
