<script setup lang="ts">
import {
  inject,
  onBeforeUnmount,
  onMounted,
  reactive,
  useId,
  useSlots,
  watch,
  type VNodeChild
} from 'vue'

type TableAlign = 'left' | 'center' | 'right'
type TableColumnType = 'default' | 'selection' | 'index'

interface RegisteredTableColumn {
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

const APP_TABLE_CONTEXT_KEY = Symbol.for('cpamp-app-table-context')

const props = withDefaults(
  defineProps<{
    type?: TableColumnType
    prop?: string
    label?: string
    width?: number | string
    minWidth?: number | string
    align?: TableAlign
    headerAlign?: TableAlign
    fixed?: boolean | 'left' | 'right'
    showOverflowTooltip?: boolean
    className?: string
    labelClassName?: string
    selectable?: (row: any, index: number) => boolean
  }>(),
  {
    type: 'default',
    prop: undefined,
    label: undefined,
    width: undefined,
    minWidth: undefined,
    align: 'left',
    headerAlign: undefined,
    fixed: false,
    showOverflowTooltip: false,
    className: undefined,
    labelClassName: undefined,
    selectable: undefined
  }
)

const slots = useSlots()
const colId = useId()
const tableContext = inject<TableContext | null>(APP_TABLE_CONTEXT_KEY, null)

function normalizeFixed(fixed?: boolean | 'left' | 'right'): false | 'left' | 'right' {
  if (fixed === true || fixed === 'left') return 'left'
  if (fixed === 'right') return 'right'
  return false
}

const columnDescriptor = reactive<RegisteredTableColumn>({
  id: colId,
  type: props.type,
  prop: props.prop,
  label: props.label,
  width: props.width,
  minWidth: props.minWidth,
  align: props.align,
  headerAlign: props.headerAlign ?? props.align,
  fixed: normalizeFixed(props.fixed),
  showOverflowTooltip: props.showOverflowTooltip,
  className: props.className,
  labelClassName: props.labelClassName,
  selectable: props.selectable,
  hasDefaultSlot: () => Boolean(slots.default),
  renderDefault: (scope) => (slots.default ? slots.default(scope) : null),
  hasHeaderSlot: () => Boolean(slots.header),
  renderHeader: (scope) => (slots.header ? slots.header(scope) : null)
})

watch(
  () => [
    props.type,
    props.prop,
    props.label,
    props.width,
    props.minWidth,
    props.align,
    props.headerAlign,
    props.fixed,
    props.showOverflowTooltip,
    props.className,
    props.labelClassName,
    props.selectable
  ],
  () => {
    columnDescriptor.type = props.type
    columnDescriptor.prop = props.prop
    columnDescriptor.label = props.label
    columnDescriptor.width = props.width
    columnDescriptor.minWidth = props.minWidth
    columnDescriptor.align = props.align
    columnDescriptor.headerAlign = props.headerAlign ?? props.align
    columnDescriptor.fixed = normalizeFixed(props.fixed)
    columnDescriptor.showOverflowTooltip = props.showOverflowTooltip
    columnDescriptor.className = props.className
    columnDescriptor.labelClassName = props.labelClassName
    columnDescriptor.selectable = props.selectable
    tableContext?.requestOrderSync()
  }
)

onMounted(() => {
  tableContext?.registerColumn(columnDescriptor)
})

onBeforeUnmount(() => {
  tableContext?.unregisterColumn(colId)
})
</script>

<template>
  <span :data-app-col-id="colId" />
</template>
