<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    title?: string
    width?: string | number
    loading?: boolean
    empty?: boolean
    emptyText?: string
    maxHeight?: string
    destroyOnClose?: boolean
  }>(),
  {
    modelValue: false,
    title: '',
    width: '600px',
    loading: false,
    empty: false,
    emptyText: undefined,
    maxHeight: '65dvh',
    destroyOnClose: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  open: []
  opened: []
  close: []
  closed: []
}>()

const { t } = useI18n()

const resolvedEmptyText = computed(() => props.emptyText || t('common.noData'))
const contentStyle = computed<Record<string, string>>(() => ({
  maxHeight: props.maxHeight
}))
</script>

<template>
  <BaseDialog
    :model-value="props.modelValue"
    :title="props.title"
    :width="props.width"
    :destroy-on-close="props.destroyOnClose"
    @update:model-value="emit('update:modelValue', $event)"
    @open="emit('open')"
    @opened="emit('opened')"
    @close="emit('close')"
    @closed="emit('closed')"
  >
    <div
      v-loading="props.loading"
      class="detail-dialog__content"
      :style="contentStyle"
    >
      <template v-if="!props.empty">
        <slot name="hero" />
        <slot />
      </template>
      <EmptyState
        v-else-if="!props.loading"
        variant="inline"
        :title="resolvedEmptyText"
      />
    </div>

    <template
      v-if="$slots.footer"
      #footer
    >
      <slot name="footer" />
    </template>
  </BaseDialog>
</template>

<style lang="scss" scoped>
.detail-dialog__content {
  display: grid;
  gap: 16px;
  min-height: 80px;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border-primary) transparent;
}
</style>
