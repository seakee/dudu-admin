<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import type { RouteRecordRaw } from 'vue-router'
import { getMenuTree, createMenu, updateMenu, deleteMenu } from '@/api/permission'
import router, { resetRouter } from '@/router'
import { constantRoutes, asyncRoutes } from '@/router/routes'
import { useAuthStore, usePermissionStore } from '@/stores'
import type { Menu } from '@/types/api'
import { useI18n } from 'vue-i18n'
import { useFormLabelWidth } from '@/composables/useFormLabelWidth'

const loading = ref(false)
const tableData = ref<Menu[]>([])
const dialogVisible = ref(false)
const dialogTitle = ref('')
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<Menu | null>(null)
const iconPickerVisible = ref(false)
const iconSearchKeyword = ref('')
const { t } = useI18n()
const formLabelWidth = useFormLabelWidth()
const authStore = useAuthStore()
const permissionStore = usePermissionStore()

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

const allElementPlusIconNameList = Object.keys(ElementPlusIconsVue).sort((left, right) => {
  return left.localeCompare(right)
})

const preferredElementPlusIconNames: string[] = [
  'HomeFilled',
  'House',
  'Setting',
  'Tools',
  'Odometer',
  'Histogram',
  'DataAnalysis',
  'TrendCharts',
  'PieChart',
  'User',
  'UserFilled',
  'Avatar',
  'Files',
  'FolderOpened',
  'Document',
  'Tickets',
  'Memo',
  'Reading',
  'CollectionTag',
  'Message',
  'Bell',
  'Notification',
  'Connection',
  'Link',
  'Cloudy',
  'MapLocation',
  'LocationFilled',
  'Position',
  'Compass',
  'Flag',
  'Trophy',
  'Shop',
  'OfficeBuilding',
  'Calendar',
  'Timer',
  'AlarmClock',
  'Lock',
  'Key',
  'Search',
  'Menu'
]

const orderedElementPlusIconNameList = computed(() => {
  const availablePreferredIcons = preferredElementPlusIconNames.filter((iconName) => {
    return allElementPlusIconNameList.includes(iconName)
  })

  const uniquePreferredIcons = Array.from(new Set(availablePreferredIcons))
  const remainingIcons = allElementPlusIconNameList.filter((iconName) => {
    return !uniquePreferredIcons.includes(iconName)
  })

  return [...uniquePreferredIcons, ...remainingIcons]
})

const fontAwesomeIconNameList: string[] = [
  'house',
  'house-user',
  'building',
  'city',
  'shop',
  'warehouse',
  'gauge-high',
  'chart-column',
  'chart-line',
  'chart-pie',
  'chart-area',
  'signal',
  'gear',
  'sliders',
  'screwdriver-wrench',
  'wrench',
  'toolbox',
  'users',
  'user',
  'user-gear',
  'user-shield',
  'user-tie',
  'user-group',
  'cloud',
  'cloud-arrow-up',
  'cloud-arrow-down',
  'server',
  'database',
  'map',
  'map-location-dot',
  'location-dot',
  'compass',
  'route',
  'globe',
  'folder',
  'folder-open',
  'file',
  'file-lines',
  'book',
  'book-open',
  'newspaper',
  'clipboard',
  'bell',
  'envelope',
  'message',
  'comments',
  'paper-plane',
  'calendar',
  'clock',
  'hourglass-half',
  'stopwatch',
  'lock',
  'key',
  'shield-halved',
  'fingerprint',
  'magnifying-glass',
  'filter',
  'bars',
  'list',
  'table-cells-large',
  'sitemap',
  'link',
  'flag',
  'trophy',
  'star',
  'heart',
  'thumbs-up',
  'cart-shopping',
  'credit-card',
  'wallet',
  'coins',
  'receipt',
  'microchip',
  'robot',
  'code',
  'terminal',
  'bug'
]

const fontAwesomeIconValueList = computed(() => {
  return fontAwesomeIconNameList.map((iconName) => `fa-solid fa-${iconName}`)
})

const selectedElementPlusIconName = computed(() => {
  if (!form.icon) return ''
  return allElementPlusIconNameList.includes(form.icon) ? form.icon : ''
})

const mergedIconOptionList = computed(() => {
  const keyword = iconSearchKeyword.value.trim().toLowerCase()

  const elementPlusOptions = orderedElementPlusIconNameList.value.map((iconName) => {
    return {
      value: iconName,
      type: 'element-plus' as const
    }
  })

  const fontAwesomeOptions = fontAwesomeIconValueList.value.map((iconName) => {
    return {
      value: iconName,
      type: 'font-awesome' as const
    }
  })

  const mergedOptions = [...elementPlusOptions, ...fontAwesomeOptions]
  if (!keyword) return mergedOptions

  return mergedOptions.filter((option) => option.value.toLowerCase().includes(keyword))
})

function isElementPlusIcon(icon?: string): boolean {
  return !!icon && allElementPlusIconNameList.includes(icon)
}

function isFontAwesomeIcon(icon?: string): boolean {
  if (!icon) return false
  return icon.split(/\s+/).some((className) => className.startsWith('fa-'))
}

function getFontAwesomeClassList(icon?: string): string[] {
  if (!icon) return []

  const iconClassList = icon.split(/\s+/).filter(Boolean)
  if (!iconClassList.some((className) => className.startsWith('fa-'))) {
    return []
  }

  const hasStyleClass = iconClassList.some((className) => {
    return ['fa-solid', 'fa-regular', 'fa-brands', 'fa-light', 'fa-thin', 'fa-duotone'].includes(className)
  })

  if (!hasStyleClass) {
    iconClassList.unshift('fa-solid')
  }

  return Array.from(new Set(iconClassList))
}

function getCustomIconClassList(icon?: string): string[] {
  if (!icon) return []

  const iconClassList = icon.split(/\s+/).filter(Boolean)
  if (iconClassList.includes('iconfont')) {
    return iconClassList
  }

  return ['iconfont', ...iconClassList]
}

function getMenuDisplayName(menu: Menu): string {
  return menu.i18n_key ? t(menu.i18n_key) : menu.name
}

async function refreshGlobalMenuData() {
  const menus = await authStore.getMenus()

  resetRouter()
  permissionStore.resetRoutes()

  const routesToAdd = permissionStore.generateRoutes(menus)
  routesToAdd.forEach((route) => {
    router.addRoute(route)
  })
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
  iconPickerVisible.value = false
  iconSearchKeyword.value = ''
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
  iconPickerVisible.value = false
  iconSearchKeyword.value = ''
  await nextTick()
  formRef.value?.clearValidate()
}

async function handleDelete(row: Menu) {
  await ElMessageBox.confirm(t('system.menu.message.deleteConfirm'), t('navbar.dialogTitle'), {
    type: 'warning',
    confirmButtonText: t('common.confirm'),
    cancelButtonText: t('common.cancel')
  })
  await deleteMenu(getMenuId(row))
  ElMessage.success(t('system.menu.message.deleteSuccess'))
  await Promise.all([fetchData(), refreshGlobalMenuData().catch(() => undefined)])
}

function handleDetailClosed() {
  detailData.value = null
}

function handleDialogClosed() {
  formRef.value?.clearValidate()
  iconPickerVisible.value = false
  iconSearchKeyword.value = ''
}

function handleIconSelect(iconName: string) {
  if (!iconName) {
    iconPickerVisible.value = false
    return
  }

  form.icon = iconName
  iconPickerVisible.value = false
}

function handleIconPreviewSelect(iconName: string) {
  form.icon = iconName
}

function handleIconClear() {
  form.icon = ''
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
    ElMessage.success(t('system.menu.message.updateSuccess'))
  } else {
    await createMenu(data)
    ElMessage.success(t('system.menu.message.createSuccess'))
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

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="menu-container">
    <PageCard variant="toolbar">
      <el-button
        type="success"
        @click="handleAdd()"
      >
        {{ t('system.menu.action.create') }}
      </el-button>
    </PageCard>

    <PageListSection>
      <template #table>
        <el-table
          :data="tableData"
          :row-key="getMenuRowKey"
          :tree-props="{ children: 'children' }"
          stripe
        >
          <el-table-column
            prop="name"
            :label="t('system.menu.table.name')"
            width="240"
          >
            <template #default="{ row }">
              {{ getMenuDisplayName(row) }}
            </template>
          </el-table-column>
          <el-table-column
            prop="icon"
            :label="t('system.menu.table.icon')"
            width="100"
          >
            <template #default="{ row }">
              <el-icon v-if="isElementPlusIcon(row.icon)">
                <component :is="row.icon" />
              </el-icon>
              <i
                v-else-if="isFontAwesomeIcon(row.icon)"
                :class="getFontAwesomeClassList(row.icon)"
              />
              <i
                v-else-if="row.icon"
                :class="getCustomIconClassList(row.icon)"
              />
            </template>
          </el-table-column>
          <el-table-column
            prop="path"
            :label="t('system.menu.table.path')"
          />
          <el-table-column
            prop="sort"
            :label="t('system.menu.table.sort')"
            width="80"
          />
          <TableActionColumn>
            <template #default="{ row }">
              <el-button
                v-if="isTopLevelMenu(row)"
                link
                type="primary"
                size="small"
                @click="handleAdd(row)"
              >
                {{ t('system.menu.action.createChild') }}
              </el-button>
              <el-button
                link
                type="primary"
                size="small"
                @click="handleEdit(row)"
              >
                {{ t('system.menu.action.edit') }}
              </el-button>
              <el-button
                link
                type="primary"
                size="small"
                @click="handleDelete(row)"
              >
                {{ t('system.menu.action.delete') }}
              </el-button>
            </template>
          </TableActionColumn>
        </el-table>
      </template>
    </PageListSection>

    <!-- 菜单表单对话框 -->
    <BaseDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      @closed="handleDialogClosed"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        :label-width="formLabelWidth"
      >
        <el-form-item :label="t('system.menu.form.parent')">
          <el-select
            v-model="form.parent_id"
            clearable
            :placeholder="t('system.menu.form.noParent')"
          >
            <el-option
              :value="0"
              :label="t('system.menu.form.noParent')"
            />
            <el-option
              v-for="menu in flatMenuList"
              :key="menu.id"
              :value="menu.id"
              :label="'　'.repeat(menu.level) + menu.name"
              :disabled="!isMenuSelectableAsParent(menu)"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          :label="t('system.menu.form.name')"
          prop="name"
        >
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item
          :label="t('system.menu.form.path')"
          prop="path"
        >
          <el-select
            v-model="form.path"
            clearable
            filterable
            :placeholder="t('common.selectPlaceholder')"
          >
            <el-option
              v-for="path in selectablePathList"
              :key="path"
              :value="path"
              :label="path"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('system.menu.form.icon')">
          <el-popover
            v-model:visible="iconPickerVisible"
            trigger="click"
            placement="bottom-start"
            :width="420"
            :teleported="true"
            popper-class="menu-icon-picker-popper"
          >
            <template #reference>
              <el-input
                v-model="form.icon"
                clearable
                readonly
                :placeholder="t('system.menu.form.iconPlaceholder')"
                @clear="handleIconClear"
              >
                <template #prefix>
                  <el-icon v-if="selectedElementPlusIconName">
                    <component :is="selectedElementPlusIconName" />
                  </el-icon>
                  <i
                    v-else-if="isFontAwesomeIcon(form.icon)"
                    :class="getFontAwesomeClassList(form.icon)"
                  />
                  <i
                    v-else-if="form.icon"
                    :class="getCustomIconClassList(form.icon)"
                  />
                </template>
              </el-input>
            </template>

            <el-input
              v-model="iconSearchKeyword"
              clearable
              :placeholder="t('common.placeholder')"
              class="menu-icon-search"
            />
            <div class="menu-icon-grid">
              <button
                v-for="iconOption in mergedIconOptionList"
                :key="iconOption.value"
                type="button"
                class="menu-icon-item"
                :class="{ 'is-active': form.icon === iconOption.value }"
                :title="iconOption.value"
                @click="handleIconPreviewSelect(iconOption.value)"
              >
                <el-icon v-if="iconOption.type === 'element-plus'">
                  <component :is="iconOption.value" />
                </el-icon>
                <i
                  v-else
                  :class="getFontAwesomeClassList(iconOption.value)"
                />
              </button>
            </div>

            <div class="menu-icon-actions">
              <el-button
                size="small"
                link
                @click="iconPickerVisible = false"
              >
                {{ t('common.cancel') }}
              </el-button>
              <el-button
                size="small"
                type="primary"
                @click="handleIconSelect(form.icon)"
              >
                {{ t('common.confirm') }}
              </el-button>
            </div>
          </el-popover>
        </el-form-item>
        <el-form-item :label="t('system.menu.form.sort')">
          <el-input-number
            v-model="form.sort"
            :min="0"
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

    <!-- 菜单详情对话框 -->
    <BaseDialog
      v-model="detailVisible"
      :title="t('system.menu.dialog.detail')"
      width="560px"
      @closed="handleDetailClosed"
    >
      <div v-loading="detailLoading">
        <el-descriptions
          v-if="detailData"
          :column="2"
          border
        >
          <el-descriptions-item label="ID">
            {{ detailData.id ?? detailData.ID }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('system.menu.detail.parentId')">
            {{ detailData.parent_id }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('system.menu.table.name')">
            {{ detailData.name }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('system.menu.table.path')">
            {{ detailData.path }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('system.menu.table.icon')">
            {{ detailData.icon || '-' }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('system.menu.table.sort')">
            {{ detailData.sort }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('system.menu.detail.permissionId')">
            {{ detailData.permission_id }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </BaseDialog>
  </div>
</template>

<style scoped lang="scss">
.menu-icon-search {
  margin-bottom: 12px;

  :deep(.el-input__wrapper) {
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.72);
    border-color: rgba(148, 163, 184, 0.24);
  }
}

:deep(.menu-icon-picker-popper) {
  padding: 10px 10px 8px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  overflow: hidden;
}

:deep(.menu-icon-picker-popper .el-popper__arrow::before) {
  border-color: rgba(148, 163, 184, 0.24);
}

html.dark :deep(.menu-icon-picker-popper) {
  background: rgba(24, 28, 40, 0.96);
  border-color: var(--glass-border);
  box-shadow: var(--glass-shadow);
}

html.dark :deep(.menu-icon-picker-popper .el-popper__arrow::before) {
  border-color: var(--glass-border);
  background: rgba(24, 28, 40, 0.96);
}

:deep(.el-table__indent),
:deep(.el-table__expand-icon) {
  vertical-align: middle;
}

:deep(.el-table__placeholder) {
  vertical-align: middle;
}

.menu-icon-grid {
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
  padding: 2px 4px 6px 2px;
  scrollbar-gutter: stable;
}

.menu-icon-grid::-webkit-scrollbar {
  width: 5px;
}

.menu-icon-grid::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.34);
  border-radius: 999px;
}

.menu-icon-grid::-webkit-scrollbar-track {
  background: transparent;
}

.menu-icon-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 10px;
  margin-top: 8px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);

  :deep(.el-button) {
    min-width: 68px;
    border-radius: 8px;
  }
}

.menu-icon-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 32px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.64);
  color: var(--el-text-color-regular);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--el-color-primary-light-5);
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &.is-active {
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &:focus-visible {
    outline: none;
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 1px var(--el-color-primary);
  }

  :deep(.el-icon) {
    font-size: 18px;
  }
}

html.dark .menu-icon-search {
  :deep(.el-input__wrapper) {
    background: var(--app-input-bg);
    border-color: var(--app-border-strong);
  }
}

html.dark .menu-icon-item {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.15);
  color: var(--app-text-regular);

  &:hover {
    background: rgba(var(--el-color-primary-rgb), 0.15);
    border-color: var(--el-color-primary-light-5);
    color: var(--el-color-primary);
  }

  &.is-active {
    background: rgba(var(--el-color-primary-rgb), 0.2);
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
  }
}

html.dark .menu-icon-actions {
  border-top-color: var(--app-border-strong);
}

html.dark .menu-icon-grid {
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
  }
}

</style>
