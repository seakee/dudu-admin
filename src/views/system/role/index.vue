<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  getRoleList,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  getRolePermissionMenuTree,
  setRolePermissions,
  type RolePermissionMenuTreeNode
} from '@/api/role'
import { getAllPermissions } from '@/api/permission'
import type { Role, Permission } from '@/types/api'
import { formatDateTime } from '@/utils/datetime'
import { useI18n } from 'vue-i18n'
import { useFormLabelWidth } from '@/composables/useFormLabelWidth'

const loading = ref(false)
const tableData = ref<Role[]>([])
const total = ref(0)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const permissionDialogVisible = ref(false)
const { t } = useI18n()
const formLabelWidth = useFormLabelWidth()
const searchLabelWidth = useFormLabelWidth('88px', '110px')

const queryParams = reactive({
  page: 1,
  page_size: 10,
  name: ''
})

const formRef = ref<FormInstance>()
const form = reactive({
  id: 0,
  name: '',
  description: ''
})

const rules = computed<FormRules>(() => ({
  name: [
    { required: true, message: t('system.role.validation.nameRequired'), trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (!value) {
          callback()
          return
        }

        if (!/^[A-Za-z][A-Za-z_]*$/.test(value)) {
          callback(new Error(t('system.role.validation.nameFormat')))
          return
        }

        callback()
      },
      trigger: 'blur'
    }
  ]
}))

// 权限相关状态
const allPermissions = ref<Permission[]>([])
const menuPermissionTree = ref<RolePermissionMenuTreeNode[]>([])
const currentRoleId = ref(0)
const activePermissionType = ref<'menu' | 'api'>('menu')
const selectedApiPermissionIds = ref<number[]>([])
const selectedApiPermissionIdSet = computed(() => new Set(selectedApiPermissionIds.value))

// 树形组件引用
const menuTreeRef = ref<InstanceType<typeof import('element-plus')['ElTree']>>()

// 树节点接口
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

// 树形配置
const treeProps = {
  children: 'children',
  label: 'label'
}

async function fetchData() {
  loading.value = true
  try {
    const { data } = await getRoleList(queryParams)
    tableData.value = data.data.list
    total.value = data.data.total
  } finally {
    loading.value = false
  }
}

async function fetchPermissions() {
  const { data } = await getAllPermissions('api')
  const seen = new Set<number>()
  allPermissions.value = (data.data || []).filter((item) => {
    const id = getPermissionId(item)
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

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

function getMethodTagType(method?: string): 'success' | 'primary' | 'warning' | 'danger' | 'info' {
  switch (method?.toUpperCase()) {
    case 'GET':
      return 'success'
    case 'POST':
      return 'primary'
    case 'PUT':
      return 'warning'
    case 'DELETE':
      return 'danger'
    default:
      return 'info'
  }
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
        .map((p) => {
          const method = p.method?.toUpperCase() || ''
          const path = p.path || ''
          return {
            id: getPermissionId(p),
            name: p.name,
            method,
            path,
            children: undefined
          }
        })
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

function handleApiGroupCheckChange(row: ApiPermissionTableRow, checked: unknown) {
  const leafIds = getApiGroupLeafPermissionIds(row)
  if (leafIds.length === 0) return

  updateSelectedApiPermissionIds(leafIds, Boolean(checked))
}

function handleApiPermissionCheckChange(row: ApiPermissionTableRow, checked: unknown) {
  if (!isApiPermissionLeafRow(row)) return
  updateSelectedApiPermissionIds([row.id], Boolean(checked))
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

function handleSearch() {
  queryParams.page = 1
  fetchData()
}

function handleReset() {
  queryParams.name = ''
  handleSearch()
}

function handleAdd() {
  dialogTitle.value = t('system.role.dialog.create')
  form.id = 0
  form.name = ''
  form.description = ''
  dialogVisible.value = true
}

function handleEdit(row: Role) {
  dialogTitle.value = t('system.role.dialog.edit')
  form.id = getRoleId(row)
  form.name = row.name
  form.description = row.description
  dialogVisible.value = true
}

async function handleDelete(row: Role) {
  await ElMessageBox.confirm(t('system.role.message.deleteConfirm'), t('navbar.dialogTitle'), {
    type: 'warning',
    confirmButtonText: t('common.confirm'),
    cancelButtonText: t('common.cancel')
  })
  await deleteRole(getRoleId(row))
  ElMessage.success(t('system.role.message.deleteSuccess'))
  fetchData()
}

async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  if (form.id) {
    await updateRole(form.id, { name: form.name, description: form.description })
    ElMessage.success(t('system.role.message.updateSuccess'))
  } else {
    await createRole({ name: form.name, description: form.description })
    ElMessage.success(t('system.role.message.createSuccess'))
  }
  dialogVisible.value = false
  fetchData()
}

async function handlePermission(row: Role) {
  const roleId = getRoleId(row)
  currentRoleId.value = roleId

  const [permissionRes, menuTreeRes] = await Promise.all([
    getRolePermissions(roleId),
    getRolePermissionMenuTree(roleId)
  ])

  menuPermissionTree.value = menuTreeRes.data.data?.items || []
  const selectedIds = Array.from(new Set((permissionRes.data.data || []).map((id) => Number(id)).filter((id) => id > 0)))
  const menuCheckedNodeIds = getCheckedMenuNodeIds(menuPermissionTree.value)

  activePermissionType.value = 'menu'
  permissionDialogVisible.value = true

  // 等待对话框渲染后设置选中状态
  await nextTick()
  menuTreeRef.value?.setCheckedKeys(menuCheckedNodeIds)

  const apiLeafIdSet = new Set(collectApiLeafPermissionIds(apiTableData.value))
  selectedApiPermissionIds.value = selectedIds.filter((id) => apiLeafIdSet.has(id))
}

async function handlePermissionSubmit() {
  const menuPermissionIdMap = getMenuPermissionIdMap(menuTreeData.value)

  // 菜单树按菜单节点勾选，再映射为 permission_id
  const menuCheckedNodeIds = (menuTreeRef.value?.getCheckedKeys(false) || []).filter((k) => typeof k === 'number') as number[]
  const menuChecked = menuCheckedNodeIds
    .map((menuId) => menuPermissionIdMap.get(menuId))
    .filter((permissionId): permissionId is number => typeof permissionId === 'number' && permissionId > 0)

  // API 表格树按选中的叶子权限节点收集
  const apiChecked = selectedApiPermissionIds.value
  const allChecked = [...new Set([...menuChecked, ...apiChecked])]

  await setRolePermissions(currentRoleId.value, allChecked)
  ElMessage.success(t('system.role.message.permissionSuccess'))
  permissionDialogVisible.value = false
}

function handlePermissionDialogClosed() {
  activePermissionType.value = 'menu'
  selectedApiPermissionIds.value = []
}

onMounted(() => {
  fetchData()
  fetchPermissions()
})
</script>

<template>
  <div class="role-container">
    <PageSearchSection
      :model="queryParams"
      :label-width="searchLabelWidth"
      @submit="handleSearch"
    >
      <el-form-item :label="t('system.role.search.name')">
        <el-input
          v-model="queryParams.name"
          :placeholder="t('system.role.search.name')"
          clearable
        />
      </el-form-item>

      <template #actions>
        <el-button
          type="primary"
          @click="handleSearch"
        >
          {{ t('common.search') }}
        </el-button>
        <el-button @click="handleReset">
          {{ t('common.reset') }}
        </el-button>
        <el-button
          type="success"
          @click="handleAdd"
        >
          {{ t('common.add') }}
        </el-button>
      </template>
    </PageSearchSection>

    <PageListSection>
      <template #table>
        <el-table
          :data="tableData"
          stripe
        >
          <el-table-column
            label="ID"
            width="80"
          >
            <template #default="{ row }">
              {{ getRoleId(row) }}
            </template>
          </el-table-column>
          <el-table-column
            prop="name"
            :label="t('system.role.table.name')"
          />
          <el-table-column
            prop="description"
            :label="t('system.role.table.description')"
          />
          <el-table-column
            :label="t('system.role.table.createdAt')"
            width="180"
          >
            <template #default="{ row }">
              {{ formatDateTime(row.created_at || row.CreatedAt) }}
            </template>
          </el-table-column>
          <el-table-column
            :label="t('system.role.table.updatedAt')"
            width="180"
          >
            <template #default="{ row }">
              {{ formatDateTime(row.updated_at || row.UpdatedAt) }}
            </template>
          </el-table-column>
          <TableActionColumn>
            <template #default="{ row }">
              <el-button
                link
                type="primary"
                size="small"
                @click="handleEdit(row)"
              >
                {{ t('system.role.action.edit') }}
              </el-button>
              <el-button
                link
                type="primary"
                size="small"
                @click="handlePermission(row)"
              >
                {{ t('system.role.action.permission') }}
              </el-button>
              <el-button
                link
                type="primary"
                size="small"
                @click="handleDelete(row)"
              >
                {{ t('system.role.action.delete') }}
              </el-button>
            </template>
          </TableActionColumn>
        </el-table>
      </template>

      <template #pagination>
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.page_size"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          class="pagination"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </template>
    </PageListSection>

    <!-- 角色表单对话框 -->
    <BaseDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        :label-width="formLabelWidth"
        class="role-dialog-form"
      >
        <el-form-item
          :label="t('system.role.form.name')"
          prop="name"
        >
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item :label="t('system.role.form.description')">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          {{ t('common.cancel') }}
        </el-button>
        <el-button
          type="primary"
          @click="handleSubmit"
        >
          {{ t('common.confirm') }}
        </el-button>
      </template>
    </BaseDialog>

    <!-- 权限分配对话框 -->
    <BaseDialog
      v-model="permissionDialogVisible"
      :title="t('system.role.dialog.permission')"
      width="700px"
      @closed="handlePermissionDialogClosed"
    >
      <div class="permission-panel">
        <el-tabs v-model="activePermissionType">
          <!-- 菜单权限标签页 -->
          <el-tab-pane
            name="menu"
            :label="t('system.role.permissionPanel.typeMenu')"
          >
            <el-scrollbar max-height="450px">
              <el-tree
                ref="menuTreeRef"
                :data="menuTreeData"
                :props="treeProps"
                show-checkbox
                node-key="id"
                default-expand-all
                class="permission-tree"
              >
                <template #default="{ node }">
                  <span class="permission-tree-node">
                    <span class="permission-tree-node__label">{{ node.label }}</span>
                  </span>
                </template>
              </el-tree>
            </el-scrollbar>
          </el-tab-pane>

          <!-- API权限标签页 -->
          <el-tab-pane
            name="api"
            :label="t('system.role.permissionPanel.typeApi')"
          >
            <PageListSection naked>
              <template #table>
                <el-table
                  :data="apiTableData"
                  row-key="id"
                  :tree-props="{ children: 'children' }"
                  :fit="false"
                  table-layout="auto"
                  default-expand-all
                  max-height="450"
                  class="permission-api-table"
                >
                  <el-table-column
                    fixed="left"
                    width="76"
                    align="left"
                  >
                    <template #default="{ row }">
                      <span class="permission-api-table__check-wrap">
                        <el-checkbox
                          v-if="row.children?.length"
                          :model-value="isApiGroupChecked(row)"
                          :indeterminate="isApiGroupIndeterminate(row)"
                          @click.stop
                          @change="handleApiGroupCheckChange(row, $event)"
                        />
                        <el-checkbox
                          v-else
                          :model-value="isApiPermissionChecked(row)"
                          @click.stop
                          @change="handleApiPermissionCheckChange(row, $event)"
                        />
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column
                    fixed="left"
                    :label="t('system.permission.table.name')"
                    width="180"
                    class-name="permission-api-table__name-col"
                  >
                    <template #default="{ row }">
                      <span
                        :class="row.children?.length ? 'permission-api-table__group-name' : 'permission-api-table__name'"
                      >
                        {{ row.name }}
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column
                    fixed="left"
                    :label="t('system.permission.table.method')"
                    width="100"
                    class-name="permission-api-table__method-col"
                  >
                    <template #default="{ row }">
                      <el-tag
                        v-if="row.method"
                        :type="getMethodTagType(row.method)"
                        size="small"
                        effect="light"
                        class="permission-api-table__method"
                      >
                        {{ row.method }}
                      </el-tag>
                      <span
                        v-else
                        class="permission-api-table__placeholder"
                      >
                        -
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column
                    :label="t('system.permission.table.path')"
                    min-width="640"
                    class-name="permission-api-table__path-col"
                  >
                    <template #default="{ row }">
                      <span
                        v-if="row.path"
                        class="permission-api-table__path"
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
                  </el-table-column>
                </el-table>
              </template>
            </PageListSection>
          </el-tab-pane>
        </el-tabs>
      </div>
      <template #footer>
        <el-button @click="permissionDialogVisible = false">
          {{ t('common.cancel') }}
        </el-button>
        <el-button
          type="primary"
          @click="handlePermissionSubmit"
        >
          {{ t('system.role.dialog.permission') }}
        </el-button>
      </template>
    </BaseDialog>
  </div>
</template>

<style lang="scss" scoped>
.role-dialog-form {
  :deep(.el-form-item.is-error) {
    margin-bottom: 20px;
  }

  :deep(.el-form-item__error) {
    position: static;
    top: auto;
    margin-top: 4px;
    white-space: normal;
    word-break: break-word;
    line-height: 1.3;
  }
}

.role-container {
  .permission-panel {
    :deep(.el-tabs__header) {
      margin-bottom: 12px;
    }

    :deep(.el-tabs__nav-wrap::after) {
      background-color: var(--app-border);
    }
  }

  .permission-tree {
    :deep(.el-tree-node__content) {
      height: auto;
      min-height: 32px;
      padding: 4px 0;
    }

    :deep(.el-tree-node__expand-icon) {
      font-size: 14px;
    }

    .permission-tree-node {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex: 1;
      gap: 12px;
      padding-right: 8px;
      min-width: 0;

      .permission-tree-node__label {
        flex-shrink: 1;
        min-width: 0;
        font-size: 13px;
        line-height: 1.4;
        color: var(--app-text-regular);
      }
    }

    // 父节点样式
    :deep(.el-tree-node:not(.is-leaf) > .el-tree-node__content .permission-tree-node__label) {
      font-weight: 600;
      color: var(--app-text-primary);
    }

    // 选中状态样式
    :deep(.el-tree-node.is-checked > .el-tree-node__content .permission-tree-node__label) {
      color: var(--el-color-primary);
    }
  }

  .permission-api-table {
    :deep(.el-table__cell) {
      padding: 6px 0;
    }

    :deep(.el-table__indent) {
      float: none;
      display: inline-block;
      vertical-align: middle;
    }

    :deep(.el-table__placeholder) {
      display: none;
    }

    :deep(.el-table__expand-icon) {
      margin-right: 6px;
      vertical-align: middle;
    }

    .permission-api-table__check-wrap {
      display: inline-flex;
      align-items: center;
      min-width: 28px;
      white-space: nowrap;
    }

    .permission-api-table__check-wrap :deep(.el-checkbox) {
      margin-right: 0;
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

    .permission-api-table__method {
      min-width: 58px;
      text-align: center;
    }

    .permission-api-table__path {
      color: var(--app-text-secondary);
      font-size: 12px;
      line-height: 1.4;
      white-space: nowrap;
      word-break: normal;
      overflow-wrap: normal;
    }

    .permission-api-table__placeholder {
      color: var(--app-text-placeholder);
      font-size: 12px;
    }

    :deep(.permission-api-table__name-col .cell),
    :deep(.permission-api-table__method-col .cell),
    :deep(.permission-api-table__path-col .cell) {
      overflow: visible;
      text-overflow: clip;
      white-space: nowrap;
      word-break: normal;
      overflow-wrap: normal;
    }

    :deep(.el-table__body-wrapper) {
      overflow-x: auto;
    }
  }
}
</style>
