<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAllPermissions } from '@/api/permission'
import {
  getRolePermissionMenuTree,
  getRolePermissions,
  setRolePermissions,
  type RolePermissionMenuTreeNode
} from '@/api/role'
import type { Permission, Role } from '@/types/api'
import { getHttpMethodTone } from '@/utils/httpMethod'
import { notify } from '@/utils/notify'

interface TreeNode {
  id: number | string
  label: string
  permissionId?: number
  children?: TreeNode[]
  isLeaf?: boolean
}

interface ApiPermissionTableRow {
  id: number | string
  name: string
  method?: string
  path?: string
  children?: ApiPermissionTableRow[]
}

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()

const visible = ref(false)
const loading = ref(false)
const submitting = ref(false)
const allPermissions = ref<Permission[]>([])
const menuPermissionTree = ref<RolePermissionMenuTreeNode[]>([])
const currentRoleId = ref(0)
const activePermissionType = ref<'menu' | 'api'>('menu')
const selectedApiPermissionIds = ref<number[]>([])
const selectedApiPermissionIdSet = computed(() => new Set(selectedApiPermissionIds.value))

const menuTreeRef = ref<{
  setCheckedKeys: (keys: (string | number)[]) => void
  getCheckedKeys: () => (string | number)[]
}>()

const treeProps = {
  children: 'children',
  label: 'label'
}

const permissionModeItems = computed(() => [
  { id: 'menu' as const, label: t('system.role.permissionPanel.typeMenu') },
  { id: 'api' as const, label: t('system.role.permissionPanel.typeApi') }
])

let openRequestSeq = 0
let permissionsFetchPromise: Promise<void> | null = null

function getRoleId(role?: Role | null): number {
  return role?.id ?? role?.ID ?? 0
}

function getPermissionId(permission: Permission): number {
  return permission.id ?? permission.ID ?? 0
}

function getPermissionType(type?: string): 'api' | 'menu' | null {
  const normalized = type?.toLowerCase()
  if (normalized === 'api' || normalized === 'menu') {
    return normalized
  }
  return null
}

async function fetchPermissions() {
  if (!permissionsFetchPromise) {
    permissionsFetchPromise = (async () => {
      const { data } = await getAllPermissions('api')
      const seen = new Set<number>()
      allPermissions.value = (data.data || []).filter((item) => {
        const id = getPermissionId(item)
        if (!id || seen.has(id)) return false
        seen.add(id)
        return true
      })
    })().finally(() => {
      permissionsFetchPromise = null
    })
  }
  await permissionsFetchPromise
}

// 菜单权限树形数据
const menuTreeData = computed<TreeNode[]>(() => {
  function transform(nodes: RolePermissionMenuTreeNode[]): TreeNode[] {
    return nodes.map((node) => {
      const children = node.children && node.children.length > 0
        ? transform(node.children)
        : undefined

      const permissionId = Number(node.permission_id)
      return {
        id: Number(node.id),
        label: node.name,
        permissionId: permissionId > 0 ? permissionId : undefined,
        children,
        isLeaf: !children || children.length === 0
      }
    })
  }

  return transform(menuPermissionTree.value)
})

// API权限树形数据
const apiTableData = computed<ApiPermissionTableRow[]>(() => {
  const apiPermissions = allPermissions.value.filter((p) => getPermissionType(p.type) === 'api')
  const groupedByGroup: Record<string, Permission[]> = {}

  apiPermissions.forEach((p) => {
    const group = p.group || t('system.permission.otherGroup')
    if (!groupedByGroup[group]) {
      groupedByGroup[group] = []
    }
    groupedByGroup[group].push(p)
  })

  return Object.entries(groupedByGroup)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupName, permissions]) => ({
      id: `api-group-${groupName}`,
      name: groupName,
      children: permissions
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({
          id: getPermissionId(p),
          name: p.name,
          method: p.method?.toUpperCase() || '',
          path: p.path || '',
          children: undefined
        }))
    }))
})

function isApiPermissionLeafRow(row: ApiPermissionTableRow): row is ApiPermissionTableRow & { id: number } {
  return typeof row.id === 'number' && (!row.children || row.children.length === 0)
}

function collectApiLeafPermissionIds(rows: ApiPermissionTableRow[]): number[] {
  const ids: number[] = []

  function traverse(items: ApiPermissionTableRow[]) {
    items.forEach((item) => {
      if (item.children && item.children.length > 0) {
        traverse(item.children)
      } else if (typeof item.id === 'number') {
        ids.push(item.id)
      }
    })
  }

  traverse(rows)
  return ids
}

function getApiGroupLeafPermissionIds(row: ApiPermissionTableRow): number[] {
  return row.children && row.children.length > 0 ? collectApiLeafPermissionIds(row.children) : []
}

function isApiPermissionChecked(row: ApiPermissionTableRow): boolean {
  return isApiPermissionLeafRow(row) ? selectedApiPermissionIdSet.value.has(row.id) : false
}

function isApiGroupChecked(row: ApiPermissionTableRow): boolean {
  const leafIds = getApiGroupLeafPermissionIds(row)
  return leafIds.length > 0 && leafIds.every((id) => selectedApiPermissionIdSet.value.has(id))
}

function isApiGroupIndeterminate(row: ApiPermissionTableRow): boolean {
  const leafIds = getApiGroupLeafPermissionIds(row)
  if (leafIds.length === 0) return false

  const selectedCount = leafIds.filter((id) => selectedApiPermissionIdSet.value.has(id)).length
  return selectedCount > 0 && selectedCount < leafIds.length
}

function updateSelectedApiPermissionIds(ids: number[], checked: boolean) {
  const nextSelected = new Set(selectedApiPermissionIds.value)

  ids.forEach((id) => {
    if (checked) {
      nextSelected.add(id)
    } else {
      nextSelected.delete(id)
    }
  })

  selectedApiPermissionIds.value = Array.from(nextSelected)
}

function handleApiGroupCheckChange(row: ApiPermissionTableRow, checked: boolean) {
  const leafIds = getApiGroupLeafPermissionIds(row)
  if (leafIds.length === 0) return

  updateSelectedApiPermissionIds(leafIds, checked)
}

function handleApiPermissionCheckChange(row: ApiPermissionTableRow, checked: boolean) {
  if (!isApiPermissionLeafRow(row)) return
  updateSelectedApiPermissionIds([row.id], checked)
}

function getCheckedMenuNodeIds(nodes: RolePermissionMenuTreeNode[]): number[] {
  const ids: number[] = []

  function traverse(menuNodes: RolePermissionMenuTreeNode[]) {
    menuNodes.forEach((node) => {
      const permissionId = Number(node.permission_id)
      if (node.checked && permissionId > 0) {
        ids.push(Number(node.id))
      }

      if (node.children && node.children.length > 0) {
        traverse(node.children)
      }
    })
  }

  traverse(nodes)
  return ids
}

function getMenuPermissionIdMap(nodes: TreeNode[]): Map<number, number> {
  const idMap = new Map<number, number>()

  function traverse(treeNodes: TreeNode[]) {
    treeNodes.forEach((node) => {
      if (typeof node.id === 'number' && typeof node.permissionId === 'number') {
        idMap.set(node.id, node.permissionId)
      }

      if (node.children && node.children.length > 0) {
        traverse(node.children)
      }
    })
  }

  traverse(nodes)
  return idMap
}

async function open(role: Role) {
  const roleId = getRoleId(role)
  if (!roleId) {
    return
  }

  const requestSeq = ++openRequestSeq
  currentRoleId.value = roleId
  activePermissionType.value = 'menu'
  selectedApiPermissionIds.value = []
  menuPermissionTree.value = []
  visible.value = true
  loading.value = true

  try {
    const [, permissionRes, menuTreeRes] = await Promise.all([
      allPermissions.value.length ? Promise.resolve() : fetchPermissions(),
      getRolePermissions(roleId),
      getRolePermissionMenuTree(roleId)
    ])

    if (requestSeq !== openRequestSeq || !visible.value) {
      return
    }

    menuPermissionTree.value = menuTreeRes.data.data?.items || []
    const selectedIds = Array.from(
      new Set((permissionRes.data.data || []).map((id) => Number(id)).filter((id) => id > 0))
    )
    const menuCheckedNodeIds = getCheckedMenuNodeIds(menuPermissionTree.value)

    // 等待对话框渲染后设置选中状态
    await nextTick()
    if (requestSeq !== openRequestSeq || !visible.value) {
      return
    }
    menuTreeRef.value?.setCheckedKeys(menuCheckedNodeIds)

    const apiLeafIdSet = new Set(collectApiLeafPermissionIds(apiTableData.value))
    selectedApiPermissionIds.value = selectedIds.filter((id) => apiLeafIdSet.has(id))
  } finally {
    if (requestSeq === openRequestSeq) {
      loading.value = false
    }
  }
}

async function handleSubmit() {
  if (!currentRoleId.value || loading.value || submitting.value) {
    return
  }

  const menuPermissionIdMap = getMenuPermissionIdMap(menuTreeData.value)

  // 菜单树按菜单节点勾选，再映射为 permission_id
  const menuCheckedNodeIds = (menuTreeRef.value?.getCheckedKeys() || []).filter(
    (key): key is number => typeof key === 'number'
  )
  const menuChecked = menuCheckedNodeIds
    .map((menuId) => menuPermissionIdMap.get(menuId))
    .filter((permissionId): permissionId is number => typeof permissionId === 'number' && permissionId > 0)

  // API 表格树按选中的叶子权限节点收集
  const apiChecked = selectedApiPermissionIds.value
  const allChecked = [...new Set([...menuChecked, ...apiChecked])]

  submitting.value = true
  try {
    await setRolePermissions(currentRoleId.value, allChecked)
    notify.success(t('system.role.message.permissionSuccess'))
    visible.value = false
    emit('saved')
  } finally {
    submitting.value = false
  }
}

function handleClosed() {
  openRequestSeq += 1
  currentRoleId.value = 0
  activePermissionType.value = 'menu'
  selectedApiPermissionIds.value = []
  menuPermissionTree.value = []
  loading.value = false
  menuTreeRef.value?.setCheckedKeys([])
}

defineExpose({
  open
})
</script>

<template>
  <BaseDialog
    v-model="visible"
    :title="t('system.role.dialog.permission')"
    width="700px"
    @closed="handleClosed"
  >
    <div
      v-loading="loading"
      class="permission-panel"
    >
      <SegmentedTabs
        v-model="activePermissionType"
        :items="permissionModeItems"
        :aria-label="t('system.role.dialog.permission')"
        variant="joined"
        class="permission-panel__tabs"
        role-mode="group"
        :responsive-full-width="false"
      />

      <div
        v-show="activePermissionType === 'menu'"
        class="permission-tree-scroll"
      >
        <AppTree
          ref="menuTreeRef"
          :data="menuTreeData"
          :props="treeProps"
          show-checkbox
          node-key="id"
          default-expand-all
          class="permission-tree"
        >
          <template #default="{ node }">
            <span
              class="permission-tree-node"
              :class="{ 'is-branch': !node.isLeaf, 'is-checked': node.checked }"
            >
              {{ node.label }}
            </span>
          </template>
        </AppTree>
      </div>

      <div
        v-show="activePermissionType === 'api'"
        class="permission-api-wrap"
      >
        <AppTable
          :data="apiTableData"
          row-key="id"
          :tree-props="{ children: 'children' }"
          default-expand-all
          max-height="450"
          appearance="flat"
          class="permission-api-table"
        >
          <AppTableColumn
            fixed="left"
            width="76"
            align="left"
          >
            <template #default="{ row }">
              <span class="permission-api-table__check-wrap">
                <AppCheckbox
                  v-if="row.children?.length"
                  :model-value="isApiGroupChecked(row)"
                  :indeterminate="isApiGroupIndeterminate(row)"
                  :aria-label="row.name"
                  @click.stop
                  @change="handleApiGroupCheckChange(row, $event)"
                />
                <AppCheckbox
                  v-else
                  :model-value="isApiPermissionChecked(row)"
                  :aria-label="row.name"
                  @click.stop
                  @change="handleApiPermissionCheckChange(row, $event)"
                />
              </span>
            </template>
          </AppTableColumn>
          <AppTableColumn
            fixed="left"
            :label="t('system.permission.table.name')"
            width="180"
            class-name="permission-api-table__name-col"
          >
            <template #default="{ row }">
              <span
                :class="row.children?.length ? 'permission-api-table__group-name' : 'permission-api-table__name font-mono'"
              >
                {{ row.name }}
              </span>
            </template>
          </AppTableColumn>
          <AppTableColumn
            fixed="left"
            :label="t('system.permission.table.method')"
            width="100"
            class-name="permission-api-table__method-col"
          >
            <template #default="{ row }">
              <StatusPill
                v-if="row.method"
                compact
                mono
                :tone="getHttpMethodTone(row.method)"
                :label="row.method"
              />
              <span
                v-else
                class="permission-api-table__placeholder"
              >
                -
              </span>
            </template>
          </AppTableColumn>
          <AppTableColumn
            :label="t('system.permission.table.path')"
            min-width="640"
            class-name="permission-api-table__path-col"
          >
            <template #default="{ row }">
              <span
                v-if="row.path"
                class="permission-api-table__path font-mono"
              >
                {{ row.path }}
              </span>
              <span
                v-else
                class="permission-api-table__placeholder"
              >
                -
              </span>
            </template>
          </AppTableColumn>
        </AppTable>
      </div>
    </div>
    <template #footer>
      <AppButton
        variant="secondary"
        @click="visible = false"
      >
        {{ t('common.cancel') }}
      </AppButton>
      <AppButton
        variant="primary"
        :loading="submitting"
        :disabled="loading"
        @click="handleSubmit"
      >
        {{ t('system.role.dialog.permission') }}
      </AppButton>
    </template>
  </BaseDialog>
</template>

<style lang="scss" scoped>
.permission-panel {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.permission-panel__tabs {
  justify-self: start;
  max-width: 100%;
}

.permission-tree-scroll {
  max-height: 450px;
  overflow-y: auto;
}

.permission-tree-node {
  padding-right: 8px;
  min-width: 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--app-text-regular);

  &.is-branch {
    font-weight: 600;
    color: var(--app-text-primary);
  }

  &.is-checked {
    color: var(--primary-text);
  }
}

.permission-api-table {
  :deep(.app-table__cell) {
    padding: 6px 0;
  }

  :deep(.app-table__indent) {
    float: none;
    display: inline-block;
    vertical-align: middle;
  }

  :deep(.app-table__expand-placeholder) {
    display: none;
  }

  :deep(.app-table__expand-btn) {
    margin-right: 6px;
    vertical-align: middle;
  }

  .permission-api-table__check-wrap {
    display: inline-flex;
    align-items: center;
    min-width: 28px;
    white-space: nowrap;
  }

  .permission-api-table__group-name {
    font-weight: 600;
    color: var(--app-text-primary);
    white-space: nowrap;
  }

  .permission-api-table__name {
    color: var(--app-text-regular);
    white-space: nowrap;
  }

  .permission-api-table__path {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.4;
    white-space: nowrap;
    word-break: normal;
    overflow-wrap: normal;
  }

  .permission-api-table__placeholder {
    color: var(--text-tertiary);
    font-size: 12px;
  }

  :deep(.permission-api-table__name-col .app-table__cell-content),
  :deep(.permission-api-table__method-col .app-table__cell-content),
  :deep(.permission-api-table__path-col .app-table__cell-content) {
    overflow: visible;
    text-overflow: clip;
    white-space: nowrap;
    word-break: normal;
    overflow-wrap: normal;
  }

  :deep(.app-table__wrapper) {
    overflow-x: auto;
  }
}
</style>
