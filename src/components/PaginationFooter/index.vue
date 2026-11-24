<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SelectOption } from '@/components/types'

const props = withDefaults(
  defineProps<{
    currentPage?: number
    pageSize?: number
    total?: number
    pageSizeOptions?: ReadonlyArray<number>
    showPageSize?: boolean
    showPageJump?: boolean
    disabled?: boolean
    variant?: 'flush' | 'inset'
    infoText?: string
  }>(),
  {
    currentPage: 1,
    pageSize: 20,
    total: 0,
    pageSizeOptions: () => [10, 20, 50, 100],
    showPageSize: true,
    showPageJump: true,
    disabled: false,
    variant: 'flush',
    infoText: undefined
  }
)

const emit = defineEmits<{
  'update:currentPage': [page: number]
  'update:pageSize': [size: number]
  currentChange: [page: number]
  sizeChange: [size: number]
  change: [currentPage: number, pageSize: number]
}>()

const { t } = useI18n()

const safeTotal = computed(() => Math.max(0, Math.trunc(props.total)))
const safePageSize = computed(() =>
  Number.isFinite(props.pageSize) && props.pageSize > 0 ? Math.trunc(props.pageSize) : 20
)
const totalPages = computed(() =>
  Math.max(1, Math.ceil(safeTotal.value / safePageSize.value))
)
const start = computed(() =>
  safeTotal.value === 0 ? 0 : (props.currentPage - 1) * safePageSize.value + 1
)
const end = computed(() =>
  safeTotal.value === 0
    ? 0
    : Math.min(safeTotal.value, props.currentPage * safePageSize.value)
)

const resolvedInfoText = computed(() => {
  if (props.infoText !== undefined) {
    return props.infoText
  }
  if (safeTotal.value === 0) {
    return t('pagination.totalRecords', { total: 0 })
  }
  return t('pagination.rangeRecords', {
    start: start.value,
    end: end.value,
    total: safeTotal.value
  })
})

const pageUnitLabel = computed(() => t('pagination.pageUnit').trim())
const hasPageSizeControl = computed(
  () => props.showPageSize && props.pageSizeOptions.length > 0
)

const pageSizeSelectOptions = computed<SelectOption<number>[]>(() =>
  props.pageSizeOptions.map((sizeOption) => ({
    value: sizeOption,
    label: t('pagination.perPage', { size: sizeOption })
  }))
)

const pageDraft = ref(String(props.currentPage))

watch(
  () => props.currentPage,
  (nextPage) => {
    pageDraft.value = String(nextPage)
  }
)

function clampPageNumber(value: number, maxPages: number): number {
  const safeMax = Math.max(1, maxPages)
  if (!Number.isFinite(value)) return 1
  return Math.min(Math.max(1, Math.trunc(value)), safeMax)
}

function commitPageChange(targetPage: number) {
  if (props.disabled) return
  const nextPage = clampPageNumber(targetPage, totalPages.value)
  pageDraft.value = String(nextPage)
  if (nextPage === props.currentPage) return

  emit('update:currentPage', nextPage)
  emit('currentChange', nextPage)
  emit('change', nextPage, safePageSize.value)
}

function commitPageDraft() {
  if (props.disabled) {
    pageDraft.value = String(props.currentPage)
    return
  }
  const parsed = Number.parseInt(pageDraft.value, 10)
  const nextPage = Number.isFinite(parsed)
    ? clampPageNumber(parsed, totalPages.value)
    : clampPageNumber(props.currentPage, totalPages.value)
  pageDraft.value = String(nextPage)
  if (nextPage === props.currentPage) return

  emit('update:currentPage', nextPage)
  emit('currentChange', nextPage)
  emit('change', nextPage, safePageSize.value)
}

function handleJumpKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Enter') return
  event.preventDefault()
  commitPageDraft()
}

function handlePageSizeChange(value: number) {
  if (props.disabled) return
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return
  const nextSize = Math.trunc(parsed)
  if (nextSize === safePageSize.value) return

  const nextPage = 1
  pageDraft.value = String(nextPage)
  emit('update:pageSize', nextSize)
  if (props.currentPage !== nextPage) {
    emit('update:currentPage', nextPage)
  }
  emit('sizeChange', nextSize)
  emit('change', nextPage, nextSize)
}
</script>

<template>
  <div
    class="pagination-footer"
    :class="props.variant === 'inset' ? 'is-inset' : 'is-flush'"
  >
    <div class="pagination-footer__info">
      <slot
        name="info"
        :total="safeTotal"
        :start="start"
        :end="end"
        :current-page="props.currentPage"
        :page-size="safePageSize"
        :total-pages="totalPages"
      >
        {{ resolvedInfoText }}
      </slot>
    </div>

    <div class="pagination-footer__controls">
      <slot name="extraActions" />

      <div
        v-if="hasPageSizeControl"
        class="pagination-footer__size-field"
      >
        <AppSelect
          class="pagination-footer__size-select"
          size="sm"
          :model-value="safePageSize"
          :options="pageSizeSelectOptions"
          :disabled="props.disabled"
          :aria-label="t('pagination.pageSize')"
          @change="handlePageSizeChange"
        />
      </div>

      <AppButton
        size="sm"
        :disabled="props.disabled || props.currentPage <= 1"
        @click="commitPageChange(props.currentPage - 1)"
      >
        {{ t('pagination.prev') }}
      </AppButton>

      <AppButton
        size="sm"
        :disabled="props.disabled || props.currentPage >= totalPages"
        @click="commitPageChange(props.currentPage + 1)"
      >
        {{ t('pagination.next') }}
      </AppButton>

      <label
        v-if="props.showPageJump"
        class="pagination-footer__jump-field"
      >
        <span>{{ t('pagination.jumpTo') }}</span>
        <input
          v-model="pageDraft"
          type="number"
          min="1"
          :max="totalPages"
          :disabled="props.disabled"
          :aria-label="t('pagination.jumpTo')"
          class="pagination-footer__jump-input"
          @blur="commitPageDraft"
          @keydown="handleJumpKeyDown"
        >
        <span v-if="pageUnitLabel">{{ pageUnitLabel }}</span>
      </label>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.pagination-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 12px;
  min-width: 0;
  border-top: 1px solid color-mix(in srgb, var(--border-subtle) 75%, transparent);

  &.is-flush {
    padding: 12px 16px 14px;
    background: transparent;
    border-bottom-left-radius: inherit;
    border-bottom-right-radius: inherit;

    @include mobile {
      padding: 10px 12px 12px;
    }
  }

  &.is-inset {
    margin-top: 14px;
    padding-top: 12px;
    background: transparent;
  }

  @include mobile {
    align-items: stretch;
    flex-direction: column;
  }
}

.pagination-footer__info {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--app-radius-sm);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
}

.pagination-footer__controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;

  @include mobile {
    width: 100%;
    margin-left: 0;
    justify-content: space-between;
  }
}

.pagination-footer__size-field {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 12.5px;
  white-space: nowrap;
}

.pagination-footer__size-select {
  width: 112px;
  flex: 0 0 auto;
}

.pagination-footer__jump-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 12.5px;
  white-space: nowrap;
}

.pagination-footer__jump-input {
  box-sizing: border-box;
  width: 58px;
  height: var(--control-height-sm);
  min-height: var(--control-height-sm);
  padding: 0 8px;
  border: 1px solid var(--app-input-border);
  border-radius: var(--app-radius-sm);
  background: var(--app-input-bg);
  color: var(--text-primary);
  font: inherit;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  text-align: center;

  &:focus-visible {
    outline: 2px solid var(--app-input-border-focus);
    outline-offset: 0;
    border-color: var(--app-input-border-focus);
    background: var(--app-input-bg-focus);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>
