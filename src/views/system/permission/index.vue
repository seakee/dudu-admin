<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed, nextTick } from 'vue'
import type { SelectOption, TableActionItem } from '@/components/types'
import { notify } from '@/utils/notify'
import { confirmDialog } from '@/utils/confirm'
import type { FormInstance, FormRules } from '@/types/form'
import {
  getPermissionList,
  createPermission,
  updatePermission,
  deletePermission,
  getPermissionGroups,
  getAvailablePermissions
} from '@/api/permission'
import type { Permission } from '@/types/api'
import { formatDateTime } from '@/utils/datetime'
import { useI18n } from 'vue-i18n'
import { useHeaderRefresh } from '@/composables/useHeaderRefresh'
import { useFormLabelWidth } from '@/composables/useFormLabelWidth'
import { HTTP_METHOD_OPTIONS, getHttpMethodTone } from '@/utils/httpMethod'

const loading = ref(false)
const tableData = ref<Permission[]>([])
const total = ref(0)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const groups = ref<string[]>([])
const availableRoutes = ref<Array<{ method: string; path: string }>>([])
const selectedRoute = ref('')

let listRequestId = 0
let groupsRequestId = 0
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<Permission | null>(null)
const { t, locale } = useI18n()
const formLabelWidth = useFormLabelWidth('100px', '140px')

const queryParams = reactive({
  page: 1,
  page_size: 10,
  name: '',
  type: 'api',
  group: '',
  method: ''
})

const hasActiveFilters = computed(() => Boolean(queryParams.name || queryParams.group || queryParams.method))

const formRef = ref<FormInstance>()
const form = reactive({
  id: 0,
  name: '',
  description: '',
  type: 'api',
  method: '',
  path: '',
  group: ''
})

const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('system.permission.validation.nameRequired'), trigger: 'blur' }],
  type: [{ required: true, message: t('system.permission.validation.typeRequired'), trigger: 'change' }],
  method: [{ required: true, message: t('system.permission.validation.methodRequired'), trigger: 'change' }],
  path: [{ required: true, message: t('system.permission.validation.pathRequired'), trigger: 'change' }],
  description: [{ required: true, message: t('system.permission.validation.descriptionRequired'), trigger: 'blur' }],
  group: [{ required: true, message: t('system.permission.validation.groupRequired'), trigger: 'change' }]
}))

const methodOptions = HTTP_METHOD_OPTIONS

const groupOptions = computed<SelectOption[]>(() => groups.value.map((group) => ({
  value: group,
  label: group
})))

const permissionTypes = computed<SelectOption[]>(() => [
  { label: t('system.permission.typeMenu'), value: 'menu' },
  { label: t('system.permission.typeApi'), value: 'api' }
])

const permissionTabItems = computed(() => [
  { id: 'api', label: t('system.permission.typeApi') },
  { id: 'menu', label: t('system.permission.typeMenu') }
])

function getRouteValue(route: { method: string; path: string }) {
  return `${route.method} ${route.path}`
}

const filteredAvailableRoutes = computed(() => {
  const currentMethod = form.method?.toUpperCase() || ''
  if (!currentMethod) {
    return []
  }

  return availableRoutes.value.filter((item) => item.method === currentMethod)
})

const routeOptions = computed<SelectOption[]>(() =>
  filteredAvailableRoutes.value.map((route) => {
    const value = getRouteValue(route)
    return { value, label: value }
  })
)

async function fetchData() {
  const requestId = ++listRequestId
  loading.value = true
  try {
    const { data } = await getPermissionList(queryParams)
    if (requestId === listRequestId) {
      tableData.value = data.data.list
      total.value = data.data.total
    }
  } finally {
    if (requestId === listRequestId) {
      loading.value = false
    }
  }
}

async function fetchGroups() {
  const requestId = ++groupsRequestId
  const { data } = await getPermissionGroups(queryParams.type)
  if (requestId === groupsRequestId) {
    groups.value = data.data
  }
}

async function fetchAvailableRoutes() {
  const { data } = await getAvailablePermissions()
  availableRoutes.value = data.data
}

function handleSearch() {
  if (!queryParams.type) {
    notify.warning(t('system.permission.message.selectType'))
    return
  }
  queryParams.page = 1
  fetchData()
}

function handleReset() {
  queryParams.name = ''
  queryParams.group = ''
  queryParams.method = ''
  handleSearch()
}

function handleTypeTabChange() {
  queryParams.group = ''
  groups.value = []
  tableData.value = []
  total.value = 0
  handleSearch()
  fetchGroups()
}

async function handleAdd() {
  dialogTitle.value = t('system.permission.dialog.create')
  form.id = 0
  form.name = ''
  form.description = ''
  form.type = queryParams.type
  form.method = ''
  form.path = ''
  form.group = ''
  selectedRoute.value = ''

  await fetchAvailableRoutes().catch(() => undefined)
  dialogVisible.value = true
  await nextTick()
  formRef.value?.clearValidate()
}

async function handleEdit(row: Permission) {
  dialogTitle.value = t('system.permission.dialog.edit')
  form.id = getPermissionId(row)
  form.name = row.name
  form.description = row.description
  form.type = row.type
  form.method = row.method?.toUpperCase() || ''
  form.path = row.path || ''
  form.group = row.group || ''
  selectedRoute.value = form.method && form.path ? getRouteValue({ method: form.method, path: form.path }) : ''
  dialogVisible.value = true
  await nextTick()
  formRef.value?.clearValidate()
}

async function handleDelete(row: Permission) {
  try {
    await confirmDialog(t('system.permission.message.deleteConfirm'), t('navbar.dialogTitle'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel')
    })
  } catch (error) {
    if (error === 'cancel') return
    throw error
  }
  await deletePermission(getPermissionId(row))
  notify.success(t('system.permission.message.deleteSuccess'))
  await fetchData()
  await fetchAvailableRoutes()
}

function handleDialogClosed() {
  formRef.value?.clearValidate()
}

function handleDetailClosed() {
  detailData.value = null
}

async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  if (form.id) {
    await updatePermission(form.id, {
      name: form.name,
      description: form.description,
      type: form.type,
      method: form.method,
      path: form.path,
      group: form.group
    })
    notify.success(t('system.permission.message.updateSuccess'))
  } else {
    await createPermission({
      name: form.name,
      description: form.description,
      type: form.type,
      method: form.method,
      path: form.path,
      group: form.group
    })
    notify.success(t('system.permission.message.createSuccess'))
  }
  dialogVisible.value = false
  await fetchData()
  await fetchGroups()
  await fetchAvailableRoutes()
}

function getPermissionId(permission: Permission): number {
  return permission.id ?? permission.ID ?? 0
}

function getPermissionTypeLabel(type: string): string {
  return permissionTypes.value.find((t) => t.value === type)?.label || type
}

function getPermissionTypeTone(type: string) {
  if (type === 'menu') return 'info'
  if (type === 'api') return 'warning'
  return 'neutral'
}


function handleRouteSelect(value: SelectOption['value'] | null | undefined) {
  selectedRoute.value = typeof value === 'string' ? value : ''
  const target = filteredAvailableRoutes.value.find((item) => getRouteValue(item) === selectedRoute.value)
  if (target) {
    form.path = target.path
  } else {
    form.path = ''
  }
}

useHeaderRefresh(() => fetchData())

onMounted(() => {
  fetchData()
  fetchGroups()
  fetchAvailableRoutes()
})

watch(
  () => form.method,
  (method, previousMethod) => {
    if (method === previousMethod || !selectedRoute.value) {
      return
    }

    const matched = filteredAvailableRoutes.value.some((item) => getRouteValue(item) === selectedRoute.value)
    if (!matched) {
      selectedRoute.value = ''
      form.path = ''
    }
  }
)

function getPermissionActions(row: Permission): TableActionItem[] {
  return [
    {
      key: 'edit',
      label: t('system.permission.action.edit'),
      icon: 'Pencil',
      onClick: () => handleEdit(row)
    },
    {
      key: 'delete',
      label: t('system.permission.action.delete'),
      icon: 'Trash',
      tone: 'danger',
      onClick: () => handleDelete(row)
    }
  ]
}
</script>

<template>
  <div>
    <div class="page-workspace">
      <PageControlBar>
        <template #leading>
          <SegmentedTabs
            v-model="queryParams.type"
            :items="permissionTabItems"
            :aria-label="t('system.permission.search.type')"
            size="md"
            @change="handleTypeTabChange"
          />
        </template>
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
            {{ t('common.add') }}
          </AppButton>
        </template>
        <template #toolbar>
          <PageFilterBar
            control-width="180px"
            @search="handleSearch"
            @reset="handleReset"
          >
            <AppInput
              v-model="queryParams.name"
              size="sm"
              :suffix-icon="queryParams.name ? undefined : 'Search'"
              :aria-label="t('system.permission.search.name')"
              :placeholder="t('system.permission.search.name')"
              clearable
              @enter="handleSearch"
            />
            <AppSelect
              size="sm"
              :model-value="queryParams.group"
              :options="groupOptions"
              :aria-label="t('system.permission.search.group')"
              :placeholder="t('system.permission.search.group')"
              clearable
              @update:model-value="queryParams.group = typeof $event === 'string' ? $event : ''"
              @change="handleSearch"
            />
            <AppSelect
              size="sm"
              :model-value="queryParams.method"
              :options="methodOptions"
              :aria-label="t('system.permission.search.method')"
              :placeholder="t('system.permission.search.method')"
              clearable
              @update:model-value="queryParams.method = typeof $event === 'string' ? $event : ''"
              @change="handleSearch"
            />
          </PageFilterBar>
        </template>
      </PageControlBar>

      <PageListSection :loading="loading">
        <AppTable :data="tableData">
          <AppTableColumn
            prop="name"
            :label="t('system.permission.table.name')"
            min-width="210"
          >
            <template #default="{ row }">
              <TableCellStack
                :primary="row.name"
                :secondary="'#' + getPermissionId(row) + (row.description ? ' · ' + row.description : '')"
                mono-primary
                tabular
              />
            </template>
          </AppTableColumn>
          <AppTableColumn
            prop="type"
            :label="`${t('system.permission.table.type')} / ${t('system.permission.table.group')}`"
            width="160"
          >
            <template #default="{ row }">
              <TableCellStack>
                <template #primary>
                  <StatusPill
                    compact
                    :tone="getPermissionTypeTone(row.type)"
                    :label="getPermissionTypeLabel(row.type)"
                  />
                </template>
                <template #secondary>
                  {{ row.group || '-' }}
                </template>
              </TableCellStack>
            </template>
          </AppTableColumn>
          <AppTableColumn
            prop="path"
            :label="`${t('system.permission.table.method')} / ${t('system.permission.table.path')}`"
            min-width="280"
          >
            <template #default="{ row }">
              <TableCellStack :truncate="false">
                <template #primary>
                  <div class="perm-route-row">
                    <StatusPill
                      compact
                      mono
                      :tone="getHttpMethodTone(row.method)"
                      :label="row.method || '-'"
                    />
                    <span
                      class="font-mono perm-path-text"
                      :title="row.path || undefined"
                    >
                      {{ row.path || '-' }}
                    </span>
                  </div>
                </template>
              </TableCellStack>
            </template>
          </AppTableColumn>
          <TableActionColumn
            :actions="getPermissionActions"
            :max-visible="2"
            :compact-max-visible="2"
            :width="locale === 'en-US' ? 148 : 132"
            :mobile-width="96"
          />
          <template #empty>
            <TableEmptyState
              :filtered="hasActiveFilters"
              @reset="handleReset"
              @refresh="fetchData"
            />
          </template>
        </AppTable>
        <template #pagination>
          <PaginationFooter
            v-model:current-page="queryParams.page"
            v-model:page-size="queryParams.page_size"
            :total="total"
            variant="flush"
            show-page-jump
            @change="fetchData"
          />
        </template>
      </PageListSection>
    </div>

    <!-- 权限表单对话框 -->
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
        <AppFormItem
          :label="t('system.permission.form.type')"
          prop="type"
        >
          <AppSelect
            v-model="form.type"
            :options="permissionTypes"
          />
        </AppFormItem>
        <AppFormItem
          :label="t('system.permission.form.method')"
          prop="method"
        >
          <AppSelect
            v-model="form.method"
            :options="methodOptions"
            :placeholder="t('common.selectPlaceholder')"
          />
        </AppFormItem>
        <AppFormItem
          :label="t('system.permission.form.route')"
          prop="path"
        >
          <AppSelect
            :model-value="selectedRoute"
            :options="routeOptions"
            :disabled="!form.method"
            :placeholder="t('system.permission.form.routePlaceholder')"
            clearable
            filterable
            @update:model-value="handleRouteSelect"
          />
        </AppFormItem>
        <AppFormItem
          :label="t('system.permission.form.group')"
          prop="group"
        >
          <AppSelect
            :model-value="form.group"
            :options="groupOptions"
            filterable
            allow-create
            clearable
            :placeholder="t('system.permission.form.groupPlaceholder')"
            @update:model-value="form.group = typeof $event === 'string' ? $event : ''"
          />
        </AppFormItem>
        <AppFormItem
          :label="t('system.permission.form.name')"
          prop="name"
        >
          <AppInput v-model="form.name" />
        </AppFormItem>
        <AppFormItem
          :label="t('system.permission.form.description')"
          prop="description"
        >
          <AppInput
            v-model="form.description"
            type="textarea"
            :rows="3"
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

    <!-- 权限详情对话框 -->
    <DetailDialog
      v-model="detailVisible"
      :title="t('system.permission.dialog.detail')"
      width="600px"
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
        <AppDescriptionsItem :label="t('system.permission.table.name')">
          {{ detailData.name }}
        </AppDescriptionsItem>
        <AppDescriptionsItem :label="t('system.permission.table.type')">
          {{ getPermissionTypeLabel(detailData.type) }}
        </AppDescriptionsItem>
        <AppDescriptionsItem :label="t('system.permission.table.method')">
          {{ detailData.method || '-' }}
        </AppDescriptionsItem>
        <AppDescriptionsItem :label="t('system.permission.table.path')">
          {{ detailData.path || '-' }}
        </AppDescriptionsItem>
        <AppDescriptionsItem :label="t('system.permission.table.group')">
          {{ detailData.group || '-' }}
        </AppDescriptionsItem>
        <AppDescriptionsItem :label="t('system.permission.table.description')">
          {{ detailData.description || '-' }}
        </AppDescriptionsItem>
        <AppDescriptionsItem :label="t('system.permission.table.createdAt')">
          {{ formatDateTime(detailData.created_at) }}
        </AppDescriptionsItem>
        <AppDescriptionsItem :label="t('system.permission.table.updatedAt')">
          {{ formatDateTime(detailData.updated_at) }}
        </AppDescriptionsItem>
      </AppDescriptions>
    </DetailDialog>
  </div>
</template>

<style lang="scss" scoped>
.perm-route-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  width: 100%;

  :deep(.status-pill) {
    flex-shrink: 0;
  }
}

.perm-path-text {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}
</style>

