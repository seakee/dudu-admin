<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    filtered?: boolean
    variant?: 'canvas' | 'inline'
    showAction?: boolean
    title?: string
    description?: string
    resetLabel?: string
    refreshLabel?: string
  }>(),
  {
    filtered: false,
    variant: 'canvas',
    showAction: true,
    title: undefined,
    description: undefined,
    resetLabel: undefined,
    refreshLabel: undefined
  }
)

const emit = defineEmits<{
  reset: []
  refresh: []
}>()

const { t } = useI18n()

const resolvedTitle = computed(() =>
  props.title ?? (props.filtered ? t('common.noMatch') : t('common.noData'))
)

const resolvedDescription = computed(() =>
  props.description ?? (props.filtered ? t('common.noMatchDesc') : t('common.noDataDesc'))
)

const resolvedActionLabel = computed(() =>
  props.filtered
    ? (props.resetLabel ?? t('common.clearFilters'))
    : (props.refreshLabel ?? t('common.refresh'))
)

function handleAction() {
  if (props.filtered) {
    emit('reset')
  } else {
    emit('refresh')
  }
}
</script>

<template>
  <EmptyState
    :variant="props.variant"
    :title="resolvedTitle"
    :description="resolvedDescription"
  >
    <template
      v-if="props.showAction || $slots.action"
      #action
    >
      <slot name="action">
        <AppButton
          variant="secondary"
          size="sm"
          @click="handleAction"
        >
          {{ resolvedActionLabel }}
        </AppButton>
      </slot>
    </template>
  </EmptyState>
</template>
