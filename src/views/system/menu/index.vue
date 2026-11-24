<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { notify } from '@/utils/notify'
import { confirmDialog } from '@/utils/confirm'
import type { FormInstance, FormRules } from '@/types/form'
import type { SelectOption, TableActionItem } from '@/components/types'
import type { RouteRecordRaw } from 'vue-router'
import { getMenuTree, createMenu, updateMenu, deleteMenu } from '@/api/permission'
import { refreshDynamicRoutes } from '@/router/bootstrap'
import { constantRoutes, asyncRoutes } from '@/router/routes'
import type { Menu } from '@/types/api'
import { useI18n } from 'vue-i18n'
import { useHeaderRefresh } from '@/composables/useHeaderRefresh'
import { useFormLabelWidth } from '@/composables/useFormLabelWidth'

const loading = ref(false)
const tableData = ref<Menu[]>([])
const dialogVisible = ref(false)
const dialogTitle = ref('')
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<Menu | null>(null)
const { t, locale } = useI18n()
const formLabelWidth = useFormLabelWidth()

const formRef = ref<FormInstance>()
const form = reactive({
  id: 0,
  parent_id: 0,
  name: '',
  path: '',
  icon: '',
  sort: 0
})

const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('system.menu.validation.nameRequired'), trigger: 'blur' }],
  path: [{ required: true, message: t('system.menu.validation.pathRequired'), trigger: 'change' }]
}))

async function fetchData() {
  loading.value = true
  try {
    const { data } = await getMenuTree()
    tableData.value = data.data
  } finally {
    loading.value = false
  }
}

function getMenuId(menu?: Menu | null): number {
  return menu?.id ?? menu?.ID ?? 0
}

function getMenuRowKey(row: Menu): string {
  return String(getMenuId(row))
}

function isTopLevelMenu(menu?: Menu): boolean {
  return (menu?.parent_id ?? 0) === 0
}

function normalizePath(path: string): string {
  if (!path) return ''
  if (path === '/') return '/'
  const value = path.startsWith('/') ? path : `/${path}`
  return value.replace(/\/+/g, '/').replace(/\/$/, '')
}

function buildRoutePath(parentPath: string, routePath: string): string {
  if (!routePath) {
    return normalizePath(parentPath) || '/'
  }

  if (routePath.startsWith('/')) {
    return normalizePath(routePath)
  }

  const normalizedParentPath = normalizePath(parentPath)
  if (!normalizedParentPath || normalizedParentPath === '/') {
    return normalizePath(routePath)
  }

  return normalizePath(`${normalizedParentPath}/${routePath}`)
}

const excludedMenuRoutePrefixes = ['/login', '/password/reset', '/auth/callback', '/redirect', '/404']

function isExcludedMenuRoutePath(path: string): boolean {
  return excludedMenuRoutePrefixes.some((prefix) => {
    if (path === prefix) return true
    return path.startsWith(`${prefix}/`)
  })
}

function shouldIncludeRoute(route: RouteRecordRaw, fullPath: string): boolean {
  if (!fullPath) return false
  if (route.redirect) return false
  if (route.meta?.hidden) return false
  if (isExcludedMenuRoutePath(fullPath)) return false
  return !fullPath.includes('/:') && !fullPath.includes('*')
}

function getRoutePathList(routes: RouteRecordRaw[], parentPath = ''): string[] {
  const result: string[] = []

  routes.forEach((route) => {
    const fullPath = buildRoutePath(parentPath, route.path)
    if (shouldIncludeRoute(route, fullPath)) {
      result.push(fullPath)
    }

    if (route.children?.length) {
      result.push(...getRoutePathList(route.children, fullPath))
    }
  })

  return result
}

function getUsedMenuPathSet(menus: Menu[]): Set<string> {
  const pathSet = new Set<string>()

  const travel = (items: Menu[]) => {
    items.forEach((menu) => {
      if (menu.path) {
        pathSet.add(normalizePath(menu.path))
      }

      if (menu.children?.length) {
        travel(menu.children)
      }
    })
  }

  travel(menus)
  return pathSet
}

const allFrontendRoutePaths = computed(() => {
  const routePaths = getRoutePathList([...constantRoutes, ...asyncRoutes])
  return Array.from(new Set(routePaths)).sort((left, right) => left.localeCompare(right))
})

const menuUsedPathSet = computed(() => getUsedMenuPathSet(tableData.value))

const selectablePathList = computed(() => {
  const currentPath = normalizePath(form.path)
  const pathList = allFrontendRoutePaths.value.filter((path) => {
    return !menuUsedPathSet.value.has(path) || path === currentPath
  })

  if (currentPath && !pathList.includes(currentPath)) {
    pathList.unshift(currentPath)
  }

  return pathList
})

const pathOptions = computed<SelectOption[]>(() =>
  selectablePathList.value.map((path) => ({ value: path, label: path }))
)


function getMenuDisplayName(menu: Menu): string {
  return menu.i18n_key ? t(menu.i18n_key) : menu.name
}

async function refreshGlobalMenuData() {
  await refreshDynamicRoutes()
}

async function handleAdd(parent?: Menu) {
  if (parent && !isTopLevelMenu(parent)) {
    return
  }

  dialogTitle.value = parent ? t('system.menu.dialog.createChild') : t('system.menu.dialog.create')
  form.id = 0
  form.parent_id = getMenuId(parent)
  form.name = ''
  form.path = ''
  form.icon = ''
  form.sort = 0
  dialogVisible.value = true
  await nextTick()
  formRef.value?.clearValidate()
}

async function handleEdit(row: Menu) {
  dialogTitle.value = t('system.menu.dialog.edit')
  form.id = getMenuId(row)
  form.parent_id = row.parent_id
  form.name = row.name
  form.path = normalizePath(row.path)
  form.icon = row.icon || ''
  form.sort = row.sort
  dialogVisible.value = true
  await nextTick()
  formRef.value?.clearValidate()
}

async function handleDelete(row: Menu) {
  try {
    await confirmDialog(t('system.menu.message.deleteConfirm'), t('navbar.dialogTitle'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel')
    })
  } catch (error) {
    if (error === 'cancel') return
    throw error
  }
  await deleteMenu(getMenuId(row))
  notify.success(t('system.menu.message.deleteSuccess'))
  await Promise.all([fetchData(), refreshGlobalMenuData().catch(() => undefined)])
}

function handleDetailClosed() {
  detailData.value = null
}

function handleDialogClosed() {
  formRef.value?.clearValidate()
}

async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  const data = {
    parent_id: form.parent_id,
    name: form.name,
    path: normalizePath(form.path),
    icon: form.icon,
    sort: form.sort
  }

  if (form.id) {
    await updateMenu(form.id, data)
    notify.success(t('system.menu.message.updateSuccess'))
  } else {
    await createMenu(data)
    notify.success(t('system.menu.message.createSuccess'))
  }
  dialogVisible.value = false
  await Promise.all([fetchData(), refreshGlobalMenuData().catch(() => undefined)])
}

// 扁平化菜单列表用于父级选择
const flatMenuList = computed(() => {
  const result: { id: number; name: string; level: number }[] = []
  const flatten = (menus: Menu[], level = 0) => {
    menus.forEach((menu) => {
      const displayName = getMenuDisplayName(menu)
      result.push({ id: getMenuId(menu), name: displayName, level })
      if (menu.children) {
        flatten(menu.children, level + 1)
      }
    })
  }
  flatten(tableData.value)
  return result
})

function isMenuSelectableAsParent(menu: { id: number; level: number }): boolean {
  return menu.id !== form.id && menu.level < 1
}

const parentOptions = computed<SelectOption[]>(() => [
  { value: 0, label: t('system.menu.form.noParent') },
  ...flatMenuList.value.map((menu) => ({
    value: menu.id,
    label: '　'.repeat(menu.level) + menu.name,
    disabled: !isMenuSelectableAsParent(menu)
  }))
])

function handleParentChange(value: SelectOption['value'] | null | undefined) {
  form.parent_id = typeof value === 'number' ? value : 0
}

function getMenuActions(row: Menu): TableActionItem[] {
  return [
    {
      key: 'createChild',
      label: t('system.menu.action.createChild'),
      icon: 'Plus',
      hidden: !isTopLevelMenu(row),
      onClick: () => handleAdd(row)
    },
    {
      key: 'edit',
      label: t('system.menu.action.edit'),
      icon: 'Pencil',
      onClick: () => handleEdit(row)
    },
    {
      key: 'delete',
      label: t('system.menu.action.delete'),
      icon: 'Trash',
      tone: 'danger',
      onClick: () => handleDelete(row)
    }
  ]
}

useHeaderRefresh(() => fetchData())

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div>
    <div class="page-workspace">
      <PageControlBar>
        <template #toolbar>
          <PageFilterBar
            :show-search="false"
            :show-reset="false"
          >
            <template #actions>
              <AppButton
                variant="secondary"
                size="sm"
                icon="RotateCw"
                :loading="loading"
                @click="fetchData"
              >
                {{ t('common.refresh') }}
              </AppButton>
              <AppButton
                variant="primary"
                size="sm"
                icon="Plus"
                @click="handleAdd()"
              >
                {{ t('system.menu.action.create') }}
              </AppButton>
            </template>
          </PageFilterBar>
        </template>
      </PageControlBar>
      <PageListSection :loading="loading">
        <AppTable
          :data="tableData"
          :row-key="getMenuRowKey"
          :tree-props="{ children: 'children' }"
        >
          <AppTableColumn
            prop="name"
            :label="t('system.menu.table.name')"
            min-width="240"
          >
            <template #default="{ row }">
              <div class="menu-name-cell">
                <span class="menu-icon-frame">
                  <AppIcon
                    :name="row.icon || 'Folder'"
                    :size="15"
                  />
                </span>
                <span class="menu-name-text">{{ getMenuDisplayName(row) }}</span>
              </div>
            </template>
          </AppTableColumn>
          <AppTableColumn
            class-name="font-mono"
            prop="path"
            :label="t('system.menu.table.path')"
            min-width="220"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.path || '-' }}
            </template>
          </AppTableColumn>
          <AppTableColumn
            class-name="tabular-nums"
            prop="sort"
            :label="t('system.menu.table.sort')"
            width="90"
            align="center"
            header-align="center"
          />
          <TableActionColumn
            :actions="getMenuActions"
            :max-visible="3"
            :compact-max-visible="3"
            :width="locale === 'en-US' ? 256 : 216"
            :mobile-width="96"
          />
          <template #empty>
            <TableEmptyState @refresh="fetchData" />
          </template>
        </AppTable>
      </PageListSection>
    </div>

    <!-- 菜单表单对话框 -->
    <BaseDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      @closed="handleDialogClosed"
    >
      <AppForm
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="right"
        :label-width="formLabelWidth"
      >
        <AppFormItem :label="t('system.menu.form.parent')">
          <AppSelect
            :model-value="form.parent_id"
            :options="parentOptions"
            clearable
            :placeholder="t('system.menu.form.noParent')"
            @update:model-value="handleParentChange"
          />
        </AppFormItem>
        <AppFormItem
          :label="t('system.menu.form.name')"
          prop="name"
        >
          <AppInput v-model="form.name" />
        </AppFormItem>
        <AppFormItem
          :label="t('system.menu.form.path')"
          prop="path"
        >
          <AppSelect
            :model-value="form.path"
            :options="pathOptions"
            clearable
            filterable
            :placeholder="t('common.selectPlaceholder')"
            @update:model-value="form.path = typeof $event === 'string' ? $event : ''"
          />
        </AppFormItem>
        <AppFormItem :label="t('system.menu.form.icon')">
          <IconPicker
            v-model="form.icon"
            :placeholder="t('common.selectPlaceholder')"
          />
        </AppFormItem>
        <AppFormItem :label="t('system.menu.form.sort')">
          <AppInputNumber
            :model-value="form.sort"
            :min="0"
            @update:model-value="form.sort = $event ?? 0"
          />
        </AppFormItem>
      </AppForm>
      <template #footer>
        <AppButton
          variant="secondary"
          @click="dialogVisible = false"
        >
          {{ t('common.cancel') }}
        </AppButton>
        <AppButton
          variant="primary"
          @click="handleSubmit"
        >
          {{ t('common.confirm') }}
        </AppButton>
      </template>
    </BaseDialog>

    <!-- 菜单详情对话框 -->
    <DetailDialog
      v-model="detailVisible"
      :title="t('system.menu.dialog.detail')"
      width="560px"
      :loading="detailLoading"
      :empty="!detailData"
      @closed="handleDetailClosed"
    >
      <AppDescriptions
        v-if="detailData"
        :column="2"
        border
      >
        <AppDescriptionsItem label="ID">
          {{ detailData.id ?? detailData.ID }}
        </AppDescriptionsItem>
        <AppDescriptionsItem :label="t('system.menu.detail.parentId')">
          {{ detailData.parent_id }}
        </AppDescriptionsItem>
        <AppDescriptionsItem :label="t('system.menu.table.name')">
          {{ detailData.name }}
        </AppDescriptionsItem>
        <AppDescriptionsItem :label="t('system.menu.table.path')">
          {{ detailData.path }}
        </AppDescriptionsItem>
        <AppDescriptionsItem :label="t('system.menu.table.icon')">
          {{ detailData.icon || '-' }}
        </AppDescriptionsItem>
        <AppDescriptionsItem :label="t('system.menu.table.sort')">
          {{ detailData.sort }}
        </AppDescriptionsItem>
        <AppDescriptionsItem :label="t('system.menu.detail.permissionId')">
          {{ detailData.permission_id }}
        </AppDescriptionsItem>
      </AppDescriptions>
    </DetailDialog>
  </div>
</template>

<style lang="scss" scoped>
.menu-name-cell {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  max-width: 100%;
}

.menu-icon-frame {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--app-radius-sm);
  background: var(--surface-subtle);
  color: var(--text-secondary);
}

.menu-name-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
}
</style>

