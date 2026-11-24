<script setup lang="ts">
import { computed, ref, watch } from 'vue'

export interface TreePropsConfig {
  label?: string | ((data: any, node: any) => string)
  children?: string
  disabled?: string | ((data: any, node: any) => boolean)
}

export interface TreeNodeView {
  key: string | number
  label: string
  data: any
  level: number
  parent: TreeNodeView | null
  children: TreeNodeView[]
  isLeaf: boolean
  disabled: boolean
  checked: boolean
  indeterminate: boolean
  expanded: boolean
}

const props = withDefaults(
  defineProps<{
    data?: any[]
    props?: TreePropsConfig
    nodeKey?: string
    showCheckbox?: boolean
    defaultExpandAll?: boolean
    defaultExpandedKeys?: Array<string | number>
    defaultCheckedKeys?: Array<string | number>
    checkStrictly?: boolean
    expandOnClickNode?: boolean
  }>(),
  {
    data: () => [],
    props: () => ({ label: 'label', children: 'children' }),
    nodeKey: 'id',
    showCheckbox: false,
    defaultExpandAll: false,
    defaultExpandedKeys: () => [],
    defaultCheckedKeys: () => [],
    checkStrictly: false,
    expandOnClickNode: true
  }
)

const emit = defineEmits<{
  'check-change': [data: any, checked: boolean, indeterminate: boolean]
  check: [data: any, info: { checkedKeys: Array<string | number>; checkedNodes: any[]; halfCheckedKeys: Array<string | number>; halfCheckedNodes: any[] }]
  'node-click': [data: any, node: TreeNodeView]
  'node-expand': [data: any, node: TreeNodeView]
  'node-collapse': [data: any, node: TreeNodeView]
}>()

const rootNodes = ref<TreeNodeView[]>([])
const nodeMap = ref<Map<string, TreeNodeView>>(new Map())

function getNodeKeyValue(raw: any, fallback: string): string | number {
  const keyField = props.nodeKey || 'id'
  const val = raw?.[keyField]
  if (val !== undefined && val !== null && val !== '') {
    return val
  }
  return fallback
}

function getNodeLabel(raw: any, partialNode: Partial<TreeNodeView>): string {
  const labelProp = props.props?.label ?? 'label'
  if (typeof labelProp === 'function') {
    return String(labelProp(raw, partialNode) ?? '')
  }
  return String(raw?.[labelProp] ?? '')
}

function getNodeDisabled(raw: any, partialNode: Partial<TreeNodeView>): boolean {
  const disabledProp = props.props?.disabled
  if (!disabledProp) return false
  if (typeof disabledProp === 'function') {
    return Boolean(disabledProp(raw, partialNode))
  }
  return Boolean(raw?.[disabledProp])
}

function recomputeBranchStates(nodes: TreeNodeView[]) {
  if (props.checkStrictly) return
  nodes.forEach((node) => {
    if (node.children.length === 0) return
    recomputeBranchStates(node.children)
    const checkedChildren = node.children.filter((child) => child.checked && !child.indeterminate).length
    const anyActive = node.children.some((child) => child.checked || child.indeterminate)
    if (checkedChildren === node.children.length) {
      node.checked = true
      node.indeterminate = false
    } else if (anyActive) {
      node.checked = false
      node.indeterminate = true
    } else {
      node.checked = false
      node.indeterminate = false
    }
  })
}

function rebuildTree() {
  const prevNodes = nodeMap.value
  const nextMap = new Map<string, TreeNodeView>()
  const defaultExpSet = new Set((props.defaultExpandedKeys || []).map((k) => String(k)))
  const defaultChkSet = new Set((props.defaultCheckedKeys || []).map((k) => String(k)))
  const childrenField = props.props?.children || 'children'

  const buildNodes = (items: any[], level: number, parent: TreeNodeView | null, prefix: string): TreeNodeView[] => {
    return items.map((raw, index) => {
      const key = getNodeKeyValue(raw, `${prefix}-${index}`)
      const keyStr = String(key)
      const prev = prevNodes.get(keyStr)
      const rawChildren = Array.isArray(raw?.[childrenField]) ? raw[childrenField] : []

      const node: TreeNodeView = {
        key,
        label: '',
        data: raw,
        level,
        parent,
        children: [],
        isLeaf: rawChildren.length === 0,
        disabled: false,
        checked: prev ? prev.checked : defaultChkSet.has(keyStr),
        indeterminate: prev ? prev.indeterminate : false,
        expanded: prev
          ? prev.expanded
          : rawChildren.length > 0 && (props.defaultExpandAll || defaultExpSet.has(keyStr))
      }

      node.label = getNodeLabel(raw, node)
      node.disabled = getNodeDisabled(raw, node)
      if (rawChildren.length > 0) {
        node.children = buildNodes(rawChildren, level + 1, node, keyStr)
        node.isLeaf = node.children.length === 0
      }
      nextMap.set(keyStr, node)
      return node
    })
  }

  const built = buildNodes(Array.isArray(props.data) ? props.data : [], 0, null, 'tree')
  if (!props.checkStrictly && built.length > 0) {
    recomputeBranchStates(built)
  }
  rootNodes.value = built
  nodeMap.value = nextMap
}

watch(
  () => [props.data, props.props, props.nodeKey, props.defaultExpandAll] as const,
  () => {
    rebuildTree()
  },
  { immediate: true, deep: false }
)

const visibleNodes = computed<TreeNodeView[]>(() => {
  const result: TreeNodeView[] = []
  const walk = (nodes: TreeNodeView[]) => {
    nodes.forEach((node) => {
      result.push(node)
      if (node.children.length > 0 && node.expanded) {
        walk(node.children)
      }
    })
  }
  walk(rootNodes.value)
  return result
})

function setDescendantsChecked(node: TreeNodeView, checked: boolean) {
  node.children.forEach((child) => {
    if (!child.disabled) {
      child.checked = checked
      child.indeterminate = false
    }
    if (child.children.length > 0) {
      setDescendantsChecked(child, checked)
    }
  })
}

function updateAncestors(parent: TreeNodeView | null) {
  let cursor = parent
  while (cursor) {
    if (cursor.children.length > 0) {
      const checkedCount = cursor.children.filter((child) => child.checked && !child.indeterminate).length
      const anyActive = cursor.children.some((child) => child.checked || child.indeterminate)
      if (checkedCount === cursor.children.length) {
        cursor.checked = true
        cursor.indeterminate = false
      } else if (anyActive) {
        cursor.checked = false
        cursor.indeterminate = true
      } else {
        cursor.checked = false
        cursor.indeterminate = false
      }
    }
    cursor = cursor.parent
  }
}

function getCheckedNodes(leafOnly = false, includeHalfChecked = false): any[] {
  const result: any[] = []
  const walk = (nodes: TreeNodeView[]) => {
    nodes.forEach((node) => {
      const isMatch = node.checked || (includeHalfChecked && node.indeterminate)
      if (isMatch && (!leafOnly || node.isLeaf)) {
        result.push(node.data)
      }
      if (node.children.length > 0) {
        walk(node.children)
      }
    })
  }
  walk(rootNodes.value)
  return result
}

function getCheckedKeys(leafOnly = false): Array<string | number> {
  const result: Array<string | number> = []
  const walk = (nodes: TreeNodeView[]) => {
    nodes.forEach((node) => {
      if (node.checked && (!leafOnly || node.isLeaf)) {
        result.push(node.key)
      }
      if (node.children.length > 0) {
        walk(node.children)
      }
    })
  }
  walk(rootNodes.value)
  return result
}

function getHalfCheckedNodes(): any[] {
  const result: any[] = []
  const walk = (nodes: TreeNodeView[]) => {
    nodes.forEach((node) => {
      if (node.indeterminate) {
        result.push(node.data)
      }
      if (node.children.length > 0) {
        walk(node.children)
      }
    })
  }
  walk(rootNodes.value)
  return result
}

function getHalfCheckedKeys(): Array<string | number> {
  const result: Array<string | number> = []
  const walk = (nodes: TreeNodeView[]) => {
    nodes.forEach((node) => {
      if (node.indeterminate) {
        result.push(node.key)
      }
      if (node.children.length > 0) {
        walk(node.children)
      }
    })
  }
  walk(rootNodes.value)
  return result
}

function setCheckedKeys(keys: Array<string | number>, leafOnly = false) {
  const keySet = new Set((keys || []).map((k) => String(k)))
  const allNodes: TreeNodeView[] = []

  const collect = (nodes: TreeNodeView[]) => {
    nodes.forEach((node) => {
      node.checked = false
      node.indeterminate = false
      allNodes.push(node)
      if (node.children.length > 0) {
        collect(node.children)
      }
    })
  }
  collect(rootNodes.value)
  allNodes.sort((a, b) => a.level - b.level)

  const cachedChildKeys = new Set<string>()
  const cacheChildren = (node: TreeNodeView) => {
    node.children.forEach((child) => {
      cachedChildKeys.add(String(child.key))
      if (child.children.length > 0) {
        cacheChildren(child)
      }
    })
  }

  for (const node of allNodes) {
    const keyStr = String(node.key)
    const shouldCheck = keySet.has(keyStr)
    if (!shouldCheck) {
      if (node.checked && !cachedChildKeys.has(keyStr)) {
        node.checked = false
      }
      continue
    }

    if (node.children.length > 0) {
      cacheChildren(node)
    }

    if (node.isLeaf || props.checkStrictly) {
      node.checked = true
      node.indeterminate = false
      continue
    }

    node.checked = true
    node.indeterminate = false
    setDescendantsChecked(node, true)

    if (leafOnly) {
      node.checked = false
      const clearNonLeaf = (branch: TreeNodeView) => {
        branch.children.forEach((child) => {
          if (!child.isLeaf) {
            child.checked = false
          }
          clearNonLeaf(child)
        })
      }
      clearNonLeaf(node)
    }
  }

  if (!props.checkStrictly) {
    recomputeBranchStates(rootNodes.value)
  }
}

function handleNodeCheck(node: TreeNodeView, checked: boolean) {
  if (node.disabled) return
  node.checked = checked
  node.indeterminate = false

  if (!props.checkStrictly) {
    if (node.children.length > 0) {
      setDescendantsChecked(node, checked)
    }
    updateAncestors(node.parent)
  }

  emit('check-change', node.data, node.checked, node.indeterminate)
  emit('check', node.data, {
    checkedKeys: getCheckedKeys(),
    checkedNodes: getCheckedNodes(),
    halfCheckedKeys: getHalfCheckedKeys(),
    halfCheckedNodes: getHalfCheckedNodes()
  })
}

function toggleNodeExpand(node: TreeNodeView) {
  if (node.isLeaf) return
  node.expanded = !node.expanded
  if (node.expanded) {
    emit('node-expand', node.data, node)
  } else {
    emit('node-collapse', node.data, node)
  }
}

function handleNodeClick(node: TreeNodeView) {
  emit('node-click', node.data, node)
  if (props.expandOnClickNode && !node.isLeaf) {
    toggleNodeExpand(node)
  }
}

defineExpose({
  setCheckedKeys,
  getCheckedKeys,
  getHalfCheckedKeys,
  getCheckedNodes,
  getHalfCheckedNodes
})
</script>

<template>
  <div
    class="app-tree"
    role="tree"
  >
    <div
      v-for="node in visibleNodes"
      :key="String(node.key)"
      class="app-tree-node"
      :class="{
        'is-leaf': node.isLeaf,
        'is-expanded': node.expanded,
        'is-checked': node.checked,
        'is-indeterminate': node.indeterminate,
        'is-disabled': node.disabled
      }"
      role="treeitem"
      :aria-level="node.level + 1"
      :aria-expanded="node.isLeaf ? undefined : node.expanded"
      :aria-checked="props.showCheckbox ? (node.indeterminate ? 'mixed' : node.checked) : undefined"
    >
      <div
        class="app-tree-node__content"
        :style="{ paddingLeft: `${node.level * 18}px` }"
        @click="handleNodeClick(node)"
      >
        <button
          v-if="!node.isLeaf"
          type="button"
          class="app-tree-node__expand-btn"
          :class="{ 'is-expanded': node.expanded }"
          :aria-label="node.expanded ? 'Collapse' : 'Expand'"
          @click.stop="toggleNodeExpand(node)"
        >
          <AppIcon
            name="ChevronRight"
            :size="14"
          />
        </button>
        <span
          v-else
          class="app-tree-node__expand-placeholder"
          aria-hidden="true"
        />

        <span
          v-if="props.showCheckbox"
          class="app-tree-node__checkbox"
          @click.stop
        >
          <AppCheckbox
            :model-value="node.checked"
            :indeterminate="node.indeterminate"
            :disabled="node.disabled"
            @update:model-value="handleNodeCheck(node, $event)"
          />
        </span>

        <div class="app-tree-node__slot">
          <slot
            :node="node"
            :data="node.data"
          >
            <span class="app-tree-node__label">{{ node.label }}</span>
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-tree {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
}

.app-tree-node__content {
  display: flex;
  align-items: center;
  min-height: 32px;
  padding: 4px 6px 4px 0;
  border-radius: var(--app-radius-xs);
  cursor: pointer;
  transition: background-color $transition-fast;

  &:hover {
    background: var(--surface-subtle-hover);
  }
}

.app-tree-node__expand-btn {
  @include button-reset;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 4px;
  border-radius: var(--app-radius-xs);
  color: var(--text-tertiary);
  flex-shrink: 0;
  transition:
    transform $transition-fast,
    color $transition-fast;

  &:hover {
    color: var(--text-primary);
  }

  &.is-expanded {
    transform: rotate(90deg);
    color: var(--primary-text);
  }
}

.app-tree-node__expand-placeholder {
  display: inline-block;
  width: 20px;
  margin-right: 4px;
  flex-shrink: 0;
}

.app-tree-node__checkbox {
  display: inline-flex;
  align-items: center;
  margin-right: 8px;
  flex-shrink: 0;
}

.app-tree-node__slot {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.app-tree-node__label {
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-secondary);
}

.app-tree-node:not(.is-leaf) > .app-tree-node__content .app-tree-node__label {
  font-weight: 600;
  color: var(--text-primary);
}

.app-tree-node.is-checked > .app-tree-node__content .app-tree-node__label {
  color: var(--primary-text);
}
</style>
