<script setup lang="ts">
import {
  computed,
  defineComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  watch,
  type PropType,
  type VNodeChild
} from 'vue'
import { useI18n } from 'vue-i18n'

export type TableAlign = 'left' | 'center' | 'right'
export type TableColumnType = 'default' | 'selection' | 'index'

export interface RegisteredTableColumn {
  id: string
  type: TableColumnType
  prop?: string
  label?: string
  width?: number | string
  minWidth?: number | string
  align: TableAlign
  headerAlign: TableAlign
  fixed: false | 'left' | 'right'
  showOverflowTooltip: boolean
  className?: string
  labelClassName?: string
  selectable?: (row: any, index: number) => boolean
  hasDefaultSlot: () => boolean
  renderDefault: (scope: { row: any; $index: number; column: RegisteredTableColumn }) => VNodeChild
  hasHeaderSlot: () => boolean
  renderHeader: (scope: { column: RegisteredTableColumn; $index: number }) => VNodeChild
}

interface TableContext {
  registerColumn: (column: RegisteredTableColumn) => void
  unregisterColumn: (id: string) => void
  requestOrderSync: () => void
}

interface FlattenedRow {
  row: any
  key: string
  depth: number
  hasChildren: boolean
  isExpanded: boolean
  flatIndex: number
}

const APP_TABLE_CONTEXT_KEY = Symbol.for('cpamp-app-table-context')
const DEFAULT_FIXED_COLUMN_WIDTH = 120
const DEFAULT_FLEX_MIN_WIDTH = 120

const RenderVNode = defineComponent({
  name: 'AppTableRenderVNode',
  props: {
    renderFn: {
      type: Function as PropType<() => VNodeChild>,
      required: true
    }
  },
  setup(renderProps) {
    return () => renderProps.renderFn()
  }
})

const props = withDefaults(
  defineProps<{
    data?: any[]
    rowKey?: string | ((row: any) => string | number)
    stripe?: boolean
    border?: boolean
    treeProps?: { children?: string; hasChildren?: string }
    defaultExpandAll?: boolean
    maxHeight?: string | number
    tableLayout?: 'auto' | 'fixed'
    fit?: boolean
    loading?: boolean
    emptyText?: string
    appearance?: 'cards' | 'flat'
  }>(),
  {
    data: () => [],
    rowKey: 'id',
    stripe: false,
    border: false,
    treeProps: undefined,
    defaultExpandAll: false,
    maxHeight: undefined,
    tableLayout: 'fixed',
    fit: true,
    loading: false,
    emptyText: undefined,
    appearance: undefined
  }
)

const resolvedAppearance = computed<'cards' | 'flat'>(() => (
  props.appearance ?? (props.border ? 'flat' : 'cards')
))

const emit = defineEmits<{
  'selection-change': [selection: any[]]
  'row-click': [row: any, event: MouseEvent]
}>()

const { t } = useI18n()

const wrapperRef = ref<HTMLElement | null>(null)
const columnsSlotRef = ref<HTMLElement | null>(null)
const wrapperWidth = ref(0)
const registeredColumns = ref<RegisteredTableColumn[]>([])
const orderedColumnIds = ref<string[]>([])
const expandedKeys = ref<Set<string>>(new Set())
const initializedTreeKeys = new Set<string>()
const selectedKeySet = ref<Set<string>>(new Set())
const overflowTitleMap = ref<Record<string, string>>({})
let syncScheduled = false
let unmounted = false
let resizeObserver: ResizeObserver | null = null

function syncColumnOrder() {
  syncScheduled = false
  if (unmounted) return
  const slotEl = columnsSlotRef.value
  if (!slotEl) {
    orderedColumnIds.value = registeredColumns.value.map((col) => col.id)
    return
  }
  const nodes = slotEl.querySelectorAll<HTMLElement>('[data-app-col-id]')
  const ids: string[] = []
  nodes.forEach((node) => {
    const id = node.dataset.appColId
    if (id) ids.push(id)
  })
  orderedColumnIds.value = ids
}

function requestOrderSync() {
  if (syncScheduled || unmounted) return
  syncScheduled = true
  void nextTick(syncColumnOrder)
}

function registerColumn(column: RegisteredTableColumn) {
  const existingIndex = registeredColumns.value.findIndex((item) => item.id === column.id)
  if (existingIndex >= 0) {
    registeredColumns.value.splice(existingIndex, 1, column)
  } else {
    registeredColumns.value.push(column)
  }
  requestOrderSync()
}

function unregisterColumn(id: string) {
  registeredColumns.value = registeredColumns.value.filter((item) => item.id !== id)
  orderedColumnIds.value = orderedColumnIds.value.filter((itemId) => itemId !== id)
  requestOrderSync()
}

provide<TableContext>(APP_TABLE_CONTEXT_KEY, {
  registerColumn,
  unregisterColumn,
  requestOrderSync
})

const orderedColumns = computed<RegisteredTableColumn[]>(() => {
  if (orderedColumnIds.value.length === 0) {
    return registeredColumns.value
  }
  const byId = new Map(registeredColumns.value.map((col) => [col.id, col]))
  const sorted: RegisteredTableColumn[] = []
  const seen = new Set<string>()
  orderedColumnIds.value.forEach((id) => {
    const col = byId.get(id)
    if (col) {
      sorted.push(col)
      seen.add(id)
    }
  })
  registeredColumns.value.forEach((col) => {
    if (!seen.has(col.id)) {
      sorted.push(col)
    }
  })
  return sorted
})

function resolveRowKey(row: any, fallbackIndex: number | string): string {
  if (typeof props.rowKey === 'function') {
    return String(props.rowKey(row))
  }
  const keyProp = props.rowKey || 'id'
  const raw = row?.[keyProp] ?? row?.ID ?? row?.id
  if (raw !== undefined && raw !== null && raw !== '') {
    return String(raw)
  }
  return `row-${fallbackIndex}`
}

const isTreeMode = computed(() => Boolean(props.treeProps))
const childrenProp = computed(() => props.treeProps?.children || 'children')

watch(
  () => [props.data, props.defaultExpandAll, childrenProp.value] as const,
  ([rows, expandAll, childKey]) => {
    if (!props.treeProps || !Array.isArray(rows)) return
    const nextExpanded = new Set(expandedKeys.value)
    const visit = (items: any[], prefix: string) => {
      items.forEach((row, index) => {
        const key = resolveRowKey(row, `${prefix}-${index}`)
        const children = Array.isArray(row?.[childKey]) ? row[childKey] : []
        if (children.length > 0) {
          if (expandAll && !initializedTreeKeys.has(key)) {
            nextExpanded.add(key)
          }
          initializedTreeKeys.add(key)
          visit(children, key)
        }
      })
    }
    visit(rows, 'root')
    expandedKeys.value = nextExpanded
  },
  { immediate: true }
)

const flattenedRows = computed<FlattenedRow[]>(() => {
  const source = Array.isArray(props.data) ? props.data : []
  if (!isTreeMode.value) {
    return source.map((row, index) => ({
      row,
      key: resolveRowKey(row, index),
      depth: 0,
      hasChildren: false,
      isExpanded: false,
      flatIndex: index
    }))
  }

  const result: FlattenedRow[] = []
  const childKey = childrenProp.value
  const hasChildrenProp = props.treeProps?.hasChildren

  const walk = (items: any[], depth: number, prefix: string) => {
    items.forEach((row, index) => {
      const key = resolveRowKey(row, `${prefix}-${index}`)
      const children = Array.isArray(row?.[childKey]) ? row[childKey] : []
      const hasChildren =
        children.length > 0 || (hasChildrenProp ? Boolean(row?.[hasChildrenProp]) : false)
      const isExpanded = hasChildren && expandedKeys.value.has(key)

      result.push({
        row,
        key,
        depth,
        hasChildren,
        isExpanded,
        flatIndex: result.length
      })

      if (children.length > 0 && isExpanded) {
        walk(children, depth + 1, key)
      }
    })
  }

  walk(source, 0, 'root')
  return result
})

const hasAnyTreeChildren = computed(
  () => isTreeMode.value && flattenedRows.value.some((item) => item.hasChildren)
)

const treeToggleColumnId = computed(() => {
  if (!isTreeMode.value) return null
  const firstDataCol = orderedColumns.value.find((col) => col.type !== 'selection')
  return firstDataCol?.id ?? orderedColumns.value[0]?.id ?? null
})

function toggleRowExpand(key: string) {
  const next = new Set(expandedKeys.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  expandedKeys.value = next
}

const selectionColumn = computed(() =>
  orderedColumns.value.find((col) => col.type === 'selection')
)

const selectableItems = computed(() => {
  const col = selectionColumn.value
  if (!col) return []
  return flattenedRows.value.filter((item) =>
    col.selectable ? col.selectable(item.row, item.flatIndex) : true
  )
})

const isAllSelected = computed(
  () =>
    selectableItems.value.length > 0 &&
    selectableItems.value.every((item) => selectedKeySet.value.has(item.key))
)

const isSelectionIndeterminate = computed(() => {
  if (selectableItems.value.length === 0) return false
  const selectedCount = selectableItems.value.filter((item) =>
    selectedKeySet.value.has(item.key)
  ).length
  return selectedCount > 0 && selectedCount < selectableItems.value.length
})

function emitSelectionChange() {
  const selectedRows = flattenedRows.value
    .filter((item) => selectedKeySet.value.has(item.key))
    .map((item) => item.row)
  emit('selection-change', selectedRows)
}

function handleToggleAllSelection(checked: boolean) {
  const next = new Set(selectedKeySet.value)
  selectableItems.value.forEach((item) => {
    if (checked) {
      next.add(item.key)
    } else {
      next.delete(item.key)
    }
  })
  selectedKeySet.value = next
  emitSelectionChange()
}

function handleToggleRowSelection(item: FlattenedRow, checked: boolean) {
  const next = new Set(selectedKeySet.value)
  if (checked) {
    next.add(item.key)
  } else {
    next.delete(item.key)
  }
  selectedKeySet.value = next
  emitSelectionChange()
}

function findItemForRow(row: any): FlattenedRow | undefined {
  const byRef = flattenedRows.value.find((item) => item.row === row)
  if (byRef) return byRef
  const key = resolveRowKey(row, -1)
  return flattenedRows.value.find((item) => item.key === key)
}

function clearSelection() {
  if (selectedKeySet.value.size === 0) return
  selectedKeySet.value = new Set()
  emitSelectionChange()
}

function toggleRowSelection(row: any, selected?: boolean) {
  const item = findItemForRow(row)
  const key = item ? item.key : resolveRowKey(row, -1)
  if (!key) return
  const next = new Set(selectedKeySet.value)
  const shouldSelect = selected === undefined ? !next.has(key) : Boolean(selected)
  if (shouldSelect) {
    next.add(key)
  } else {
    next.delete(key)
  }
  selectedKeySet.value = next
  emitSelectionChange()
}

function toggleAllSelection() {
  handleToggleAllSelection(!isAllSelected.value)
}

function getSelectionRows() {
  return flattenedRows.value
    .filter((item) => selectedKeySet.value.has(item.key))
    .map((item) => item.row)
}

defineExpose({
  clearSelection,
  toggleRowSelection,
  toggleAllSelection,
  getSelectionRows
})

function parseNumericSize(value?: number | string): number | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const match = String(value)
    .trim()
    .match(/^(\d+(?:\.\d+)?)(?:px)?$/i)
  return match ? Number(match[1]) : null
}

function formatCssSize(value?: number | string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number') return `${value}px`
  return /^\d+(?:\.\d+)?$/.test(value.trim()) ? `${value.trim()}px` : value
}

const layoutMetrics = computed(() => {
  const cols = orderedColumns.value
  let fixedWidthSum = 0
  let flexMinWidthSum = 0
  const flexEntries: Array<{ id: string; minWidth: number }> = []

  cols.forEach((col) => {
    const fixedPx = parseNumericSize(col.width)
    if (fixedPx !== null) {
      fixedWidthSum += fixedPx
      return
    }
    const minPx = parseNumericSize(col.minWidth) ?? DEFAULT_FLEX_MIN_WIDTH
    flexMinWidthSum += minPx
    flexEntries.push({ id: col.id, minWidth: minPx })
  })

  const totalMinWidth = fixedWidthSum + flexMinWidthSum
  const containerWidth = wrapperWidth.value
  const targetTableWidth =
    props.fit && containerWidth > 0 ? Math.max(containerWidth, totalMinWidth) : totalMinWidth

  const colWidths = new Map<string, number>()
  const remainingFlexSpace = Math.max(0, targetTableWidth - fixedWidthSum)

  if (flexEntries.length > 0 && flexMinWidthSum > 0) {
    let allocated = 0
    flexEntries.forEach((entry, index) => {
      if (index === flexEntries.length - 1) {
        colWidths.set(entry.id, Math.max(entry.minWidth, remainingFlexSpace - allocated))
      } else {
        const computedWidth = Math.max(
          entry.minWidth,
          Math.floor((remainingFlexSpace * entry.minWidth) / flexMinWidthSum)
        )
        colWidths.set(entry.id, computedWidth)
        allocated += computedWidth
      }
    })
  }

  return {
    totalMinWidth,
    targetTableWidth,
    colWidths
  }
})

const hasHorizontalOverflow = computed(() => (
  wrapperWidth.value > 0 && layoutMetrics.value.totalMinWidth > wrapperWidth.value
))

const tableStyle = computed<Record<string, string>>(() => {
  const { totalMinWidth, targetTableWidth } = layoutMetrics.value
  if (props.tableLayout === 'fixed' && orderedColumns.value.length > 0) {
    if (wrapperWidth.value > 0 && (hasHorizontalOverflow.value || !props.fit)) {
      return {
        width: `${targetTableWidth}px`,
        minWidth: `${totalMinWidth}px`
      }
    }
    return {
      width: '100%',
      minWidth: `${totalMinWidth}px`
    }
  }
  return {
    width: '100%',
    minWidth: totalMinWidth > 0 ? `${totalMinWidth}px` : '100%'
  }
})

function getColElementStyle(col: RegisteredTableColumn): Record<string, string> {
  const fixedPx = parseNumericSize(col.width)
  if (fixedPx !== null) {
    return { width: `${fixedPx}px` }
  }
  if (props.tableLayout === 'fixed') {
    const computedPx = layoutMetrics.value.colWidths.get(col.id)
    if (computedPx !== undefined && wrapperWidth.value > 0) {
      return { width: `${computedPx}px` }
    }
  }
  const rawWidth = formatCssSize(col.width)
  if (rawWidth) {
    return { width: rawWidth }
  }
  const minWidth = formatCssSize(col.minWidth)
  if (minWidth) {
    return { minWidth }
  }
  return {}
}

interface StickyColumnMeta {
  side: 'left' | 'right'
  offset: number
  isEdge: boolean
}

const stickyColumnMap = computed(() => {
  const map = new Map<string, StickyColumnMeta>()
  const cols = orderedColumns.value

  let leftOffset = 0
  let lastLeftId: string | null = null
  cols.forEach((col) => {
    if (col.fixed === 'left') {
      map.set(col.id, { side: 'left', offset: leftOffset, isEdge: false })
      leftOffset +=
        parseNumericSize(col.width) ??
        layoutMetrics.value.colWidths.get(col.id) ??
        parseNumericSize(col.minWidth) ??
        DEFAULT_FIXED_COLUMN_WIDTH
      lastLeftId = col.id
    }
  })
  if (lastLeftId) {
    const meta = map.get(lastLeftId)
    if (meta) meta.isEdge = true
  }

  let rightOffset = 0
  let firstRightId: string | null = null
  for (let i = cols.length - 1; i >= 0; i -= 1) {
    const col = cols[i]
    if (col.fixed === 'right') {
      map.set(col.id, { side: 'right', offset: rightOffset, isEdge: false })
      rightOffset +=
        parseNumericSize(col.width) ??
        layoutMetrics.value.colWidths.get(col.id) ??
        parseNumericSize(col.minWidth) ??
        DEFAULT_FIXED_COLUMN_WIDTH
      firstRightId = col.id
    }
  }
  if (firstRightId) {
    const meta = map.get(firstRightId)
    if (meta) meta.isEdge = true
  }

  return map
})

function getColumnStyle(col: RegisteredTableColumn, isHeader = false): Record<string, string> {
  const style: Record<string, string> = {}
  const width = formatCssSize(col.width)
  const minWidth = formatCssSize(col.minWidth)
  if (props.tableLayout === 'auto') {
    if (width) {
      style.width = width
      style.minWidth = width
    } else if (minWidth) {
      style.minWidth = minWidth
    }
  }

  const sticky = stickyColumnMap.value.get(col.id)
  if (sticky) {
    style.position = 'sticky'
    if (sticky.side === 'left') {
      style.left = `${sticky.offset}px`
    } else {
      style.right = `${sticky.offset}px`
    }
    style.zIndex = isHeader ? '4' : '1'
  } else if (isHeader && props.maxHeight !== undefined) {
    style.position = 'sticky'
    style.top = '0px'
    style.zIndex = '2'
  }

  if (isHeader && sticky && props.maxHeight !== undefined) {
    style.top = '0px'
  }

  return style
}

function getStickyClasses(col: RegisteredTableColumn): Record<string, boolean> {
  const sticky = stickyColumnMap.value.get(col.id)
  return {
    'is-fixed-left': sticky?.side === 'left',
    'is-fixed-right': sticky?.side === 'right',
    'is-fixed-left-last': sticky?.side === 'left' && sticky.isEdge,
    'is-fixed-right-first': sticky?.side === 'right' && sticky.isEdge
  }
}

const wrapperStyle = computed<Record<string, string>>(() => {
  const maxHeight = formatCssSize(props.maxHeight)
  if (!maxHeight) return {}
  const style: Record<string, string> = { maxHeight }
  return style
})

function getPropValue(row: any, prop?: string): unknown {
  if (!prop || !row) return ''
  if (!prop.includes('.')) return row[prop]
  return prop.split('.').reduce<any>((acc, key) => (acc != null ? acc[key] : undefined), row)
}

function formatCellValue(row: any, col: RegisteredTableColumn, flatIndex: number): string {
  if (col.type === 'index') {
    return String(flatIndex + 1)
  }
  const value = getPropValue(row, col.prop)
  return value === undefined || value === null ? '' : String(value)
}

function handleEllipsisMouseEnter(event: MouseEvent, cacheKey: string) {
  const target = event.currentTarget as HTMLElement | null
  if (!target) return
  if (target.scrollWidth > target.clientWidth) {
    const text = target.textContent?.trim() || ''
    if (text && overflowTitleMap.value[cacheKey] !== text) {
      overflowTitleMap.value = { ...overflowTitleMap.value, [cacheKey]: text }
    }
  } else if (overflowTitleMap.value[cacheKey]) {
    const next = { ...overflowTitleMap.value }
    delete next[cacheKey]
    overflowTitleMap.value = next
  }
}

function handleRowClick(row: any, event: MouseEvent) {
  emit('row-click', row, event)
}

function updateWrapperWidth() {
  if (!wrapperRef.value) return
  const nextWidth = wrapperRef.value.clientWidth
  if (nextWidth > 0 && nextWidth !== wrapperWidth.value) {
    wrapperWidth.value = nextWidth
  }
}

onMounted(() => {
  syncColumnOrder()
  updateWrapperWidth()
  if (typeof ResizeObserver !== 'undefined' && wrapperRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateWrapperWidth()
    })
    resizeObserver.observe(wrapperRef.value)
  }
})

onBeforeUnmount(() => {
  unmounted = true
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <div
    v-loading="props.loading"
    class="app-table"
    :class="[
      `is-appearance-${resolvedAppearance}`,
      {
        'has-horizontal-overflow': hasHorizontalOverflow,
        'is-striped': props.stripe && resolvedAppearance === 'flat',
        'is-bordered': props.border,
        'is-fixed-layout': props.tableLayout === 'fixed',
        'is-non-fit': !props.fit
      }
    ]"
  >
    <div
      ref="columnsSlotRef"
      class="app-table__columns-slot"
      aria-hidden="true"
    >
      <slot />
    </div>

    <div
      ref="wrapperRef"
      class="app-table__wrapper"
      :class="{ 'has-max-height': props.maxHeight !== undefined }"
      :style="wrapperStyle"
    >
      <table
        class="app-table__inner"
        :style="tableStyle"
      >
        <colgroup v-if="orderedColumns.length > 0">
          <col
            v-for="col in orderedColumns"
            :key="`col-${col.id}`"
            :style="getColElementStyle(col)"
          >
        </colgroup>

        <thead class="app-table__head">
          <tr class="app-table__header-row">
            <th
              v-for="(col, colIndex) in orderedColumns"
              :key="col.id"
              scope="col"
              class="app-table__cell app-table__header-cell"
              :class="[
                `is-align-${col.headerAlign}`,
                col.labelClassName || col.className,
                getStickyClasses(col)
              ]"
              :style="getColumnStyle(col, true)"
            >
              <div class="app-table__cell-content">
                <template v-if="col.type === 'selection'">
                  <AppCheckbox
                    :model-value="isAllSelected"
                    :indeterminate="isSelectionIndeterminate"
                    :disabled="selectableItems.length === 0"
                    aria-label="Select all rows"
                    @update:model-value="handleToggleAllSelection"
                  />
                </template>
                <RenderVNode
                  v-else-if="col.hasHeaderSlot()"
                  :render-fn="() => col.renderHeader({ column: col, $index: colIndex })"
                />
                <template v-else>
                  {{ col.label || '' }}
                </template>
              </div>
            </th>
          </tr>
        </thead>

        <tbody class="app-table__body">
          <tr
            v-if="flattenedRows.length === 0"
            class="app-table__empty-row"
          >
            <td
              :colspan="Math.max(1, orderedColumns.length)"
              class="app-table__empty-cell"
            >
              <div class="app-table__empty">
                <slot name="empty">
                  {{ props.emptyText || t('common.noData') }}
                </slot>
              </div>
            </td>
          </tr>

          <template v-else>
            <tr
              v-for="item in flattenedRows"
              :key="item.key"
              class="app-table__row"
              :class="{ 'is-selected': selectedKeySet.has(item.key) }"
              @click="handleRowClick(item.row, $event)"
            >
              <td
                v-for="col in orderedColumns"
                :key="`${item.key}:${col.id}`"
                class="app-table__cell app-table__body-cell"
                :class="[
                  `is-align-${col.align}`,
                  col.className,
                  getStickyClasses(col)
                ]"
                :style="getColumnStyle(col, false)"
              >
                <div
                  class="app-table__cell-content"
                  :class="{
                    'is-ellipsis': col.showOverflowTooltip,
                    'is-tree-col': col.id === treeToggleColumnId
                  }"
                  :title="col.showOverflowTooltip ? overflowTitleMap[`${item.key}:${col.id}`] : undefined"
                  @mouseenter="
                    col.showOverflowTooltip
                      ? handleEllipsisMouseEnter($event, `${item.key}:${col.id}`)
                      : undefined
                  "
                >
                  <template v-if="col.id === treeToggleColumnId">
                    <span class="app-table__tree-cell">
                      <span
                        v-if="item.depth > 0"
                        class="app-table__indent"
                        :style="{ width: `${item.depth * 14}px` }"
                        aria-hidden="true"
                      />
                      <button
                        v-if="item.hasChildren"
                        type="button"
                        class="app-table__expand-btn"
                        :class="{ 'is-expanded': item.isExpanded }"
                        :aria-expanded="item.isExpanded"
                        :aria-label="item.isExpanded ? 'Collapse row' : 'Expand row'"
                        @click.stop="toggleRowExpand(item.key)"
                      >
                        <AppIcon
                          name="ChevronRight"
                          :size="14"
                        />
                      </button>
                      <span
                        v-else-if="hasAnyTreeChildren"
                        class="app-table__expand-placeholder"
                        aria-hidden="true"
                      />
                      <span class="app-table__tree-content">
                        <template v-if="col.type === 'selection'">
                          <AppCheckbox
                            :model-value="selectedKeySet.has(item.key)"
                            :disabled="col.selectable ? !col.selectable(item.row, item.flatIndex) : false"
                            @click.stop
                            @update:model-value="handleToggleRowSelection(item, $event)"
                          />
                        </template>
                        <RenderVNode
                          v-else-if="col.hasDefaultSlot()"
                          :render-fn="
                            () => col.renderDefault({ row: item.row, $index: item.flatIndex, column: col })
                          "
                        />
                        <template v-else>
                          {{ formatCellValue(item.row, col, item.flatIndex) }}
                        </template>
                      </span>
                    </span>
                  </template>

                  <template v-else-if="col.type === 'selection'">
                    <AppCheckbox
                      :model-value="selectedKeySet.has(item.key)"
                      :disabled="col.selectable ? !col.selectable(item.row, item.flatIndex) : false"
                      @click.stop
                      @update:model-value="handleToggleRowSelection(item, $event)"
                    />
                  </template>

                  <RenderVNode
                    v-else-if="col.hasDefaultSlot()"
                    :render-fn="
                      () => col.renderDefault({ row: item.row, $index: item.flatIndex, column: col })
                    "
                  />

                  <template v-else>
                    {{ formatCellValue(item.row, col, item.flatIndex) }}
                  </template>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-table {
  position: relative;
  width: 100%;
  min-width: 0;
  border-radius: var(--app-radius-md);
  overflow: hidden;
  background: transparent;

  &.is-bordered {
    border: 1px solid var(--border-subtle);
  }

  &.is-appearance-cards {
    border-radius: 0;
    overflow: visible;
  }
}

.app-table__columns-slot {
  display: none;
}

.app-table__wrapper {
  width: 100%;
  min-width: 0;
  overflow-x: auto;

  &.has-max-height {
    overflow-y: auto;
  }
}

.app-table__inner {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: auto;
}

.app-table.is-appearance-cards .app-table__inner {
  border-spacing: 0 8px;
  margin-top: -4px;
}

.app-table.is-fixed-layout .app-table__inner {
  table-layout: fixed;
}

.app-table__cell {
  border-bottom: 1px solid var(--border-subtle);
  text-align: left;
  transition:
    background-color $transition-fast,
    border-color $transition-fast;

  &.is-align-left {
    text-align: left;

    .app-table__cell-content {
      justify-content: flex-start;
    }
  }

  &.is-align-center {
    text-align: center;

    .app-table__cell-content {
      justify-content: center;
    }
  }

  &.is-align-right {
    text-align: right;

    .app-table__cell-content {
      justify-content: flex-end;
    }
  }

  &:first-child {
    padding-left: 16px;
  }

  &:last-child {
    padding-right: 16px;
  }
}

.app-table.is-bordered .app-table__cell:not(:last-child) {
  border-right: 1px solid var(--border-subtle);
}

.app-table__header-cell {
  height: 46px;
  padding: 12px;
  background-color: var(--app-surface-strong);
  background-image: linear-gradient(var(--surface-subtle), var(--surface-subtle));
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;

  .app-table__cell-content {
    white-space: nowrap;
  }
}

.app-table.is-appearance-cards .app-table__header-cell {
  height: 32px;
  padding: 2px 12px;
  border-bottom: none;
  background-color: transparent;
  background-image: none;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);

  &:first-child {
    padding-left: 16px;
  }

  &:last-child {
    padding-right: 16px;
  }
}

.app-table__body-cell {
  padding: 13px 12px;
  font-size: 13.5px;
  color: var(--text-primary);
  vertical-align: middle;
  line-height: 1.45;
  background: transparent;
}

.app-table.is-appearance-flat .app-table__row:last-child .app-table__body-cell {
  border-bottom: none;
}

.app-table.is-appearance-cards .app-table__body-cell {
  padding: 12px;
  background-color: var(--bg-primary);
  border-top: 1px solid color-mix(in srgb, var(--border-color) 82%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--border-color) 82%, transparent);

  &:first-child {
    padding-left: 16px;
    border-left: 1px solid color-mix(in srgb, var(--border-color) 82%, transparent);
    border-top-left-radius: var(--app-radius-md);
    border-bottom-left-radius: var(--app-radius-md);
  }

  &:last-child {
    padding-right: 16px;
    border-right: 1px solid color-mix(in srgb, var(--border-color) 82%, transparent);
    border-top-right-radius: var(--app-radius-md);
    border-bottom-right-radius: var(--app-radius-md);
  }
}

.app-table__cell-content {
  display: flex;
  align-items: center;
  min-width: 0;
  line-height: 1.45;

  &.is-ellipsis {
    display: block;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.app-table.is-striped .app-table__body .app-table__row:nth-child(even) .app-table__body-cell {
  background-color: color-mix(in srgb, var(--surface-subtle) 45%, transparent);
}

.app-table.is-appearance-flat .app-table__body .app-table__row:hover .app-table__body-cell {
  background-color: var(--surface-subtle-hover);
}

.app-table.is-appearance-cards .app-table__body .app-table__row:hover .app-table__body-cell {
  border-top-color: color-mix(in srgb, var(--primary-color) 28%, var(--border-color));
  border-bottom-color: color-mix(in srgb, var(--primary-color) 28%, var(--border-color));
  background-color: color-mix(in srgb, var(--primary-color) 3.5%, var(--bg-primary));

  &:first-child {
    border-left-color: color-mix(in srgb, var(--primary-color) 28%, var(--border-color));
  }

  &:last-child {
    border-right-color: color-mix(in srgb, var(--primary-color) 28%, var(--border-color));
  }
}

.app-table.is-appearance-cards .app-table__body .app-table__row.is-selected .app-table__body-cell {
  border-top-color: color-mix(in srgb, var(--primary-color) 48%, var(--border-color));
  border-bottom-color: color-mix(in srgb, var(--primary-color) 48%, var(--border-color));
  background-color: color-mix(in srgb, var(--primary-color) 5%, var(--bg-primary));

  &:first-child {
    border-left-color: color-mix(in srgb, var(--primary-color) 48%, var(--border-color));
  }

  &:last-child {
    border-right-color: color-mix(in srgb, var(--primary-color) 48%, var(--border-color));
  }
}

/* 固定列始终以 100% 不透明表面垫底，避免横向滚动文字穿透 */
.app-table.is-appearance-flat .app-table__header-cell.is-fixed-left,
.app-table.is-appearance-flat .app-table__header-cell.is-fixed-right {
  background-color: var(--app-surface-strong);
  background-image: linear-gradient(var(--surface-subtle), var(--surface-subtle));
}

.app-table.is-appearance-cards .app-table__header-cell.is-fixed-left,
.app-table.is-appearance-cards .app-table__header-cell.is-fixed-right {
  background-color: color-mix(in srgb, var(--surface-subtle) 65%, var(--bg-primary));
}

.app-table.is-appearance-flat .app-table__body-cell.is-fixed-left,
.app-table.is-appearance-flat .app-table__body-cell.is-fixed-right {
  background-color: var(--app-surface-strong);
  background-image: none;
}

.app-table.is-appearance-cards .app-table__body-cell.is-fixed-left,
.app-table.is-appearance-cards .app-table__body-cell.is-fixed-right {
  background-color: var(--bg-primary);
}

.app-table.is-striped
  .app-table__body
  .app-table__row:nth-child(even)
  .app-table__body-cell.is-fixed-left,
.app-table.is-striped
  .app-table__body
  .app-table__row:nth-child(even)
  .app-table__body-cell.is-fixed-right {
  background-color: var(--app-surface-strong);
  background-image: linear-gradient(
    color-mix(in srgb, var(--surface-subtle) 45%, transparent),
    color-mix(in srgb, var(--surface-subtle) 45%, transparent)
  );
}

.app-table.is-appearance-flat .app-table__body .app-table__row:hover .app-table__body-cell.is-fixed-left,
.app-table.is-appearance-flat .app-table__body .app-table__row:hover .app-table__body-cell.is-fixed-right {
  background-color: var(--app-surface-strong);
  background-image: linear-gradient(var(--surface-subtle-hover), var(--surface-subtle-hover));
}

.app-table.is-appearance-cards .app-table__body .app-table__row:hover .app-table__body-cell.is-fixed-left,
.app-table.is-appearance-cards .app-table__body .app-table__row:hover .app-table__body-cell.is-fixed-right {
  background-color: color-mix(in srgb, var(--primary-color) 3.5%, var(--bg-primary));
}

.app-table.has-horizontal-overflow .app-table__cell.is-fixed-left-last {
  box-shadow: inset -1px 0 0 var(--border-subtle);
}

.app-table.has-horizontal-overflow .app-table__cell.is-fixed-right-first {
  box-shadow: inset 1px 0 0 var(--border-subtle);
}

.app-table__tree-cell {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
}

.app-table__indent {
  display: inline-block;
  flex-shrink: 0;
}

.app-table__expand-btn {
  @include button-reset;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-right: 4px;
  border-radius: var(--app-radius-xs);
  color: var(--text-tertiary);
  flex-shrink: 0;
  transition:
    transform $transition-fast,
    color $transition-fast,
    background-color $transition-fast;

  &:hover {
    color: var(--text-primary);
    background: var(--surface-subtle-hover);
  }

  &.is-expanded {
    transform: rotate(90deg);
    color: var(--primary-text);
  }
}

.app-table__expand-placeholder {
  display: inline-block;
  width: 18px;
  margin-right: 4px;
  flex-shrink: 0;
}

.app-table__tree-content {
  display: inline-flex;
  align-items: center;
  min-width: 0;
}

.app-table__empty-cell {
  padding: 0;
  border-bottom: none;
}

.app-table__empty {
  width: 100%;
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 13.5px;
}
</style>
