<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWindowSize } from '@vueuse/core'
import AppTableColumn from '@/components/AppTableColumn/index.vue'
import type {
  ButtonTone,
  ButtonVariant,
  DropdownItem,
  TableActionIconMode,
  TableActionItem,
  TableActionVariant,
  TableColumnAlign,
  TableColumnFixed
} from '@/components/types'

const props = withDefaults(
  defineProps<{
    label?: string
    width?: number | string
    compactWidth?: number | string
    mobileWidth?: number | string
    minWidth?: number | string
    align?: TableColumnAlign
    headerAlign?: TableColumnAlign
    fixed?: TableColumnFixed
    actions?: (row: any) => TableActionItem[]
    variant?: TableActionVariant
    iconMode?: TableActionIconMode
    maxVisible?: number
    compactMaxVisible?: number
    mobileMaxVisible?: number
    compactBreakpoint?: number
    responsive?: boolean
  }>(),
  {
    label: '',
    width: undefined,
    compactWidth: undefined,
    mobileWidth: undefined,
    minWidth: undefined,
    align: 'right',
    headerAlign: undefined,
    fixed: 'right',
    actions: undefined,
    variant: 'link',
    iconMode: 'none',
    maxVisible: 3,
    compactMaxVisible: 2,
    mobileMaxVisible: 1,
    compactBreakpoint: 1280,
    responsive: true
  }
)

const { t } = useI18n()
const { width: windowWidth } = useWindowSize()

const columnLabel = computed(() => props.label || t('common.actions'))
const resolvedHeaderAlign = computed(() => props.headerAlign ?? props.align)

const isMobileViewport = computed(() => props.responsive && windowWidth.value < 768)
const isCompactViewport = computed(
  () => props.responsive && windowWidth.value < props.compactBreakpoint
)

const effectiveMaxVisible = computed(() => {
  if (isMobileViewport.value) {
    return Math.max(0, props.mobileMaxVisible)
  }
  if (isCompactViewport.value) {
    return Math.max(0, props.compactMaxVisible)
  }
  return Math.max(0, props.maxVisible)
})

const resolvedWidth = computed<number | string>(() => {
  if (isMobileViewport.value) {
    if (props.mobileWidth !== undefined) return props.mobileWidth
    if (props.actions) {
      return props.mobileMaxVisible === 0 ? 64 : 104
    }
  }

  if (isCompactViewport.value && props.compactWidth !== undefined) {
    return props.compactWidth
  }

  if (props.width !== undefined) {
    return props.width
  }

  if (props.actions && props.iconMode === 'only') {
    return isCompactViewport.value ? 136 : 164
  }

  return isCompactViewport.value ? 180 : 210
})

function isIconOnlyAction(item: TableActionItem): boolean {
  if (!item.icon) return false
  if (props.iconMode === 'only') return true
  return isMobileViewport.value
}

function resolveItemVariant(item: TableActionItem): ButtonVariant {
  return item.variant ?? props.variant
}

function resolveItemTone(item: TableActionItem): ButtonTone {
  return item.tone ?? 'primary'
}

function resolveItemIcon(item: TableActionItem): string | undefined {
  if (!item.icon) return undefined
  if (isIconOnlyAction(item)) return item.icon
  if (item.showIcon === true) return item.icon
  if (item.showIcon === false) return undefined
  return props.iconMode === 'auto' ? item.icon : undefined
}

function getVisibleActions(row: any): TableActionItem[] {
  if (!props.actions) return []
  return props.actions(row).filter((item) => !item.hidden)
}

function getActionSplits(row: any): {
  inlineItems: TableActionItem[]
  overflowItems: TableActionItem[]
} {
  const visible = getVisibleActions(row)
  const limit = effectiveMaxVisible.value

  if (visible.length <= limit) {
    return {
      inlineItems: visible,
      overflowItems: []
    }
  }

  return {
    inlineItems: visible.slice(0, limit),
    overflowItems: visible.slice(limit)
  }
}

function isLinkSeparatorContext(items: TableActionItem[], index: number): boolean {
  if (index <= 0) return false
  const current = items[index]
  const prev = items[index - 1]
  return resolveItemVariant(current) === 'link' && resolveItemVariant(prev) === 'link'
}

function shouldShowDividerBefore(items: TableActionItem[], index: number): boolean {
  if (index <= 0 || isLinkSeparatorContext(items, index)) return false
  const current = items[index]
  const prev = items[index - 1]
  if (current.divided) return true
  if (current.tone === 'danger' && prev.tone !== 'danger') return true
  return false
}

function toDropdownItems(items: TableActionItem[]): DropdownItem[] {
  return items.map((item, index) => {
    const prev = index > 0 ? items[index - 1] : null
    const autoDivided = Boolean(
      item.divided || (index > 0 && item.tone === 'danger' && prev?.tone !== 'danger')
    )
    return {
      key: item.key,
      label: item.label,
      icon: item.icon,
      disabled: item.disabled || item.loading,
      tone: item.tone === 'danger' ? 'danger' : 'default',
      divided: autoDivided
    }
  })
}

function handleOverflowSelect(key: string, items: TableActionItem[]) {
  const target = items.find((item) => item.key === key)
  if (!target || target.disabled || target.loading) return
  target.onClick?.()
}
</script>

<template>
  <AppTableColumn
    :label="columnLabel"
    :width="resolvedWidth"
    :min-width="props.minWidth"
    :fixed="props.fixed"
    :align="props.align"
    :header-align="resolvedHeaderAlign"
    class-name="table-action-column"
    label-class-name="table-action-column"
  >
    <template #default="scope">
      <div
        v-if="props.actions"
        class="action-buttons"
        :class="[
          `is-align-${props.align}`,
          isMobileViewport || props.iconMode === 'only'
            ? 'is-icon-mode'
            : props.variant === 'link'
              ? 'is-link-mode'
              : 'is-button-mode'
        ]"
      >
        <template
          v-for="(item, index) in getActionSplits(scope.row).inlineItems"
          :key="item.key"
        >
          <span
            v-if="isLinkSeparatorContext(getActionSplits(scope.row).inlineItems, index)"
            class="action-dot-sep"
            aria-hidden="true"
          >·</span>
          <span
            v-else-if="shouldShowDividerBefore(getActionSplits(scope.row).inlineItems, index)"
            class="action-divider"
            aria-hidden="true"
          />

          <AppTooltip
            v-if="isIconOnlyAction(item)"
            :content="item.label"
            placement="top"
            :disabled="item.disabled || item.loading"
          >
            <AppButton
              variant="secondary"
              size="xs"
              icon-only
              :icon="item.icon"
              :tone="item.tone"
              :loading="item.loading"
              :disabled="item.disabled"
              :aria-label="item.label"
              class="action-icon-btn"
              @click.stop="item.onClick?.()"
            />
          </AppTooltip>

          <AppButton
            v-else-if="resolveItemVariant(item) === 'link'"
            variant="link"
            size="sm"
            :icon="resolveItemIcon(item)"
            :tone="resolveItemTone(item)"
            :loading="item.loading"
            :disabled="item.disabled"
            class="action-link-btn"
            @click.stop="item.onClick?.()"
          >
            {{ item.label }}
          </AppButton>

          <AppButton
            v-else
            :variant="resolveItemVariant(item)"
            size="xs"
            :icon="resolveItemIcon(item)"
            :tone="resolveItemTone(item)"
            :loading="item.loading"
            :disabled="item.disabled"
            class="action-solid-btn"
            @click.stop="item.onClick?.()"
          >
            {{ item.label }}
          </AppButton>
        </template>

        <template v-if="getActionSplits(scope.row).overflowItems.length > 0">
          <span
            v-if="
              getActionSplits(scope.row).inlineItems.length > 0 &&
                !isMobileViewport &&
                props.iconMode !== 'only' &&
                props.variant === 'link'
            "
            class="action-dot-sep"
            aria-hidden="true"
          >·</span>
          <span
            v-else-if="getActionSplits(scope.row).inlineItems.length > 0"
            class="action-divider"
            aria-hidden="true"
          />

          <AppDropdown
            :items="toDropdownItems(getActionSplits(scope.row).overflowItems)"
            placement="bottom-end"
            :aria-label="t('common.more')"
            @select="(key) => handleOverflowSelect(key, getActionSplits(scope.row).overflowItems)"
          >
            <template #trigger>
              <AppButton
                v-if="isMobileViewport || props.iconMode === 'only'"
                variant="secondary"
                size="xs"
                icon-only
                icon="Ellipsis"
                :aria-label="t('common.more')"
                :title="t('common.more')"
                class="action-icon-btn"
              />
              <AppButton
                v-else-if="props.variant === 'link'"
                variant="link"
                size="sm"
                tone="primary"
                :aria-label="t('common.more')"
                class="action-link-btn action-more-link"
              >
                <span>{{ t('common.more') }}</span>
                <AppIcon
                  name="ChevronDown"
                  :size="13"
                />
              </AppButton>
              <AppButton
                v-else
                :variant="props.variant"
                size="xs"
                icon="Ellipsis"
                tone="neutral"
                :aria-label="t('common.more')"
                class="action-solid-btn"
              >
                {{ t('common.more') }}
              </AppButton>
            </template>
          </AppDropdown>
        </template>
      </div>

      <div
        v-else
        class="action-buttons is-legacy-slot"
        :class="`is-align-${props.align}`"
      >
        <slot v-bind="scope" />
      </div>
    </template>
  </AppTableColumn>
</template>

<style scoped lang="scss">
.action-buttons {
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  white-space: nowrap;

  &.is-align-left {
    justify-content: flex-start;
  }

  &.is-align-center {
    justify-content: center;
  }

  &.is-align-right {
    justify-content: flex-end;
  }

  &.is-link-mode {
    gap: 2px;
  }

  &.is-button-mode {
    gap: 6px;
  }

  &.is-icon-mode {
    gap: 6px;
  }

  &.is-legacy-slot {
    gap: 0;

    :deep(.btn) {
      margin: 0;
      min-height: auto;
      height: auto;
      line-height: 1.25;
      padding: 2px 0;
      display: inline-flex;
      align-items: center;
      font-size: 13px;
      font-weight: 500;
    }

    :deep(> .app-dropdown) {
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
    }

    :deep(> .btn + .btn),
    :deep(> .btn + .app-dropdown),
    :deep(> .app-dropdown + .btn),
    :deep(> .app-dropdown + .app-dropdown) {
      position: relative;
      margin-left: 0;
      padding-left: 14px;

      &::before {
        content: '·';
        position: absolute;
        left: 6px;
        top: 50%;
        transform: translate(-50%, -50%);
        color: var(--text-quaternary);
        font-weight: 600;
        line-height: 1;
        pointer-events: none;
      }
    }
  }
}

.action-dot-sep {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-quaternary);
  font-weight: 600;
  font-size: 13px;
  line-height: 1;
  user-select: none;
  pointer-events: none;
}

.action-divider {
  display: inline-block;
  width: 1px;
  height: 14px;
  margin: 0 2px;
  flex-shrink: 0;
  background: var(--border-subtle);
}

:deep(.action-link-btn) {
  padding: 3px 6px;
  border-radius: var(--app-radius-xs);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.25;

  &:hover:not(:disabled) {
    background: var(--app-accent-soft);
  }

  &.is-danger:hover:not(:disabled) {
    background: var(--data-badge-danger-bg);
  }

  &.is-warning:hover:not(:disabled) {
    background: var(--data-badge-warning-bg);
  }

  &.is-success:hover:not(:disabled) {
    background: var(--data-badge-success-bg);
  }

  &.is-neutral:hover:not(:disabled) {
    background: var(--surface-subtle-hover);
  }
}

:deep(.action-more-link) {
  > span {
    gap: 3px;
  }
}

:deep(.action-solid-btn) {
  height: var(--control-height-xs);
  padding: 0 10px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: var(--app-radius-xs);
}

:deep(.action-icon-btn) {
  width: var(--control-height-xs);
  min-width: var(--control-height-xs);
  height: var(--control-height-xs);
  padding: 0;
  border-radius: var(--app-radius-xs);
}
</style>
