<script setup lang="ts">
import {
  computed,
  defineComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  type PropType,
  type VNodeChild
} from 'vue'

export interface RegisteredDescriptionItem {
  id: string
  label?: string
  span: number
  className?: string
  labelClassName?: string
  hasDefaultSlot: () => boolean
  renderDefault: () => VNodeChild
  hasLabelSlot: () => boolean
  renderLabel: () => VNodeChild
}

interface DescriptionsContext {
  registerItem: (item: RegisteredDescriptionItem) => void
  unregisterItem: (id: string) => void
  requestOrderSync: () => void
}

interface PackedCell {
  item: RegisteredDescriptionItem
  contentColspan: number
}

const APP_DESCRIPTIONS_CONTEXT_KEY = Symbol.for('cpamp-app-descriptions-context')

const RenderVNode = defineComponent({
  name: 'AppDescriptionsRenderVNode',
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
    column?: number
    border?: boolean
    title?: string
    extra?: string
  }>(),
  {
    column: 2,
    border: false,
    title: undefined,
    extra: undefined
  }
)

const itemsSlotRef = ref<HTMLElement | null>(null)
const registeredItems = ref<RegisteredDescriptionItem[]>([])
const orderedIds = ref<string[]>([])
let syncScheduled = false
let unmounted = false

function syncItemOrder() {
  syncScheduled = false
  if (unmounted) return
  const slotEl = itemsSlotRef.value
  if (!slotEl) {
    orderedIds.value = registeredItems.value.map((item) => item.id)
    return
  }
  const nodes = slotEl.querySelectorAll<HTMLElement>('[data-app-desc-id]')
  const ids: string[] = []
  nodes.forEach((node) => {
    const id = node.dataset.appDescId
    if (id) ids.push(id)
  })
  orderedIds.value = ids
}

function requestOrderSync() {
  if (syncScheduled || unmounted) return
  syncScheduled = true
  void nextTick(syncItemOrder)
}

function registerItem(item: RegisteredDescriptionItem) {
  const index = registeredItems.value.findIndex((existing) => existing.id === item.id)
  if (index >= 0) {
    registeredItems.value.splice(index, 1, item)
  } else {
    registeredItems.value.push(item)
  }
  requestOrderSync()
}

function unregisterItem(id: string) {
  registeredItems.value = registeredItems.value.filter((item) => item.id !== id)
  orderedIds.value = orderedIds.value.filter((itemId) => itemId !== id)
  requestOrderSync()
}

provide<DescriptionsContext>(APP_DESCRIPTIONS_CONTEXT_KEY, {
  registerItem,
  unregisterItem,
  requestOrderSync
})

const orderedItems = computed<RegisteredDescriptionItem[]>(() => {
  if (orderedIds.value.length === 0) {
    return registeredItems.value
  }
  const byId = new Map(registeredItems.value.map((item) => [item.id, item]))
  const sorted: RegisteredDescriptionItem[] = []
  const seen = new Set<string>()
  orderedIds.value.forEach((id) => {
    const item = byId.get(id)
    if (item) {
      sorted.push(item)
      seen.add(id)
    }
  })
  registeredItems.value.forEach((item) => {
    if (!seen.has(item.id)) {
      sorted.push(item)
    }
  })
  return sorted
})

const safeColumnCount = computed(() => Math.max(1, Math.trunc(props.column || 1)))

const packedRows = computed<PackedCell[][]>(() => {
  const columns = safeColumnCount.value
  const rows: PackedCell[][] = []
  let currentRow: PackedCell[] = []
  let remaining = columns

  orderedItems.value.forEach((item, index) => {
    const requestedSpan = Math.max(1, Math.min(columns, Math.trunc(item.span || 1)))
    if (requestedSpan > remaining && currentRow.length > 0) {
      const lastCell = currentRow[currentRow.length - 1]
      lastCell.contentColspan += remaining * 2
      rows.push(currentRow)
      currentRow = []
      remaining = columns
    }

    const isLastItem = index === orderedItems.value.length - 1
    const effectiveSpan = isLastItem ? remaining : requestedSpan
    const contentColspan = effectiveSpan * 2 - 1

    currentRow.push({
      item,
      contentColspan
    })
    remaining -= effectiveSpan

    if (remaining <= 0 || isLastItem) {
      rows.push(currentRow)
      currentRow = []
      remaining = columns
    }
  })

  return rows
})

onMounted(() => {
  syncItemOrder()
})

onBeforeUnmount(() => {
  unmounted = true
})
</script>

<template>
  <div
    class="app-descriptions"
    :class="{ 'is-bordered': props.border }"
  >
    <div
      ref="itemsSlotRef"
      class="app-descriptions__items-slot"
      aria-hidden="true"
    >
      <slot />
    </div>

    <div
      v-if="props.title || props.extra || $slots.title || $slots.extra"
      class="app-descriptions__header"
    >
      <div class="app-descriptions__title">
        <slot name="title">
          {{ props.title }}
        </slot>
      </div>
      <div
        v-if="props.extra || $slots.extra"
        class="app-descriptions__extra"
      >
        <slot name="extra">
          {{ props.extra }}
        </slot>
      </div>
    </div>

    <div class="app-descriptions__body">
      <table class="app-descriptions__table">
        <tbody>
          <tr
            v-for="(row, rowIndex) in packedRows"
            :key="rowIndex"
            class="app-descriptions__row"
          >
            <template
              v-for="cell in row"
              :key="cell.item.id"
            >
              <th
                scope="row"
                class="app-descriptions__cell app-descriptions__label"
                :class="cell.item.labelClassName"
              >
                <RenderVNode
                  v-if="cell.item.hasLabelSlot()"
                  :render-fn="cell.item.renderLabel"
                />
                <template v-else>
                  {{ cell.item.label || '' }}
                </template>
              </th>
              <td
                :colspan="cell.contentColspan"
                class="app-descriptions__cell app-descriptions__content"
                :class="cell.item.className"
              >
                <RenderVNode
                  v-if="cell.item.hasDefaultSlot()"
                  :render-fn="cell.item.renderDefault"
                />
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-descriptions {
  width: 100%;
  min-width: 0;
}

.app-descriptions__items-slot {
  display: none;
}

.app-descriptions__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.app-descriptions__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.app-descriptions__extra {
  font-size: 13px;
  color: var(--text-secondary);
}

.app-descriptions__body {
  width: 100%;
  overflow-x: auto;
}

.app-descriptions.is-bordered .app-descriptions__body {
  border: 1px solid var(--border-subtle);
  border-radius: var(--app-radius-sm);
  overflow: hidden;
}

.app-descriptions__table {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
}

.app-descriptions__cell {
  padding: 10px 14px;
  font-size: 13.5px;
  line-height: 1.5;
  text-align: left;
  vertical-align: middle;
}

.app-descriptions__label {
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 12.5px;
  white-space: nowrap;
}

.app-descriptions__content {
  color: var(--text-primary);
  word-break: break-word;
}

.app-descriptions.is-bordered {
  .app-descriptions__label {
    background: var(--surface-subtle);
  }

  .app-descriptions__content {
    background: var(--app-surface-strong);
  }

  .app-descriptions__cell {
    border-bottom: 1px solid var(--border-subtle);
    border-right: 1px solid var(--border-subtle);
  }

  .app-descriptions__row:last-child .app-descriptions__cell {
    border-bottom: none;
  }

  .app-descriptions__cell:last-child {
    border-right: none;
  }
}

@include mobile {
  .app-descriptions__table,
  .app-descriptions__table tbody,
  .app-descriptions__row {
    display: block;
    width: 100%;
  }

  .app-descriptions__label,
  .app-descriptions__content {
    display: block;
    width: 100%;
  }

  .app-descriptions.is-bordered .app-descriptions__cell {
    border-right: none;
  }

  .app-descriptions.is-bordered .app-descriptions__row:last-child .app-descriptions__label {
    border-bottom: 1px solid var(--border-subtle);
  }
}
</style>
