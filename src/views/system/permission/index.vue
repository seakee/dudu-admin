<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
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
import { useFormLabelWidth } from '@/composables/useFormLabelWidth'

const loading = ref(false)
const tableData = ref<Permission[]>([])
const total = ref(0)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const groups = ref<string[]>([])
const availableRoutes = ref<Array<{ method: string; path: string }>>([])
const selectedRoute = ref('')
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<Permission | null>(null)
const { t } = useI18n()
const formLabelWidth = useFormLabelWidth('100px', '140px')
const searchLabelWidth = useFormLabelWidth('88px', '110px')

const queryParams = reactive({
  page: 1,
  page_size: 10,
  name: '',
  type: 'api',
  group: '',
  method: ''
})

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
  group: [{ required: true, message: t('system.permission.validation.groupRequired'), trigger: 'blur' }]
}))

const permissionTypes = computed(() => [
  { label: t('system.permission.typeMenu'), value: 'menu' },
  { label: t('system.permission.typeApi'), value: 'api' }
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

async function fetchData() {
  loading.value = true
  try {
    const { data } = await getPermissionList(queryParams)
    tableData.value = data.data.list
    total.value = data.data.total
  } finally {
    loading.value = false
  }
}

async function fetchGroups() {
  if (!queryParams.type) {
    groups.value = []
    return
  }
  const { data } = await getPermissionGroups(queryParams.type)
  groups.value = data.data
}

async function fetchAvailableRoutes() {
  const { data } = await getAvailablePermissions()
  availableRoutes.value = data.data
}

function handleSearch() {
  if (!queryParams.type) {
    ElMessage.warning(t('system.permission.message.selectType'))
    return
  }
  queryParams.page = 1
  fetchData()
}

function handleReset() {
  queryParams.name = ''
  queryParams.type = 'api'
  queryParams.group = ''
  queryParams.method = ''
  handleSearch()
}

async function handleAdd() {
  dialogTitle.value = t('system.permission.dialog.create')
  form.id = 0
  form.name = ''
  form.description = ''
  form.type = 'api'
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
  await ElMessageBox.confirm(t('system.permission.message.deleteConfirm'), t('navbar.dialogTitle'), {
    type: 'warning',
    confirmButtonText: t('common.confirm'),
    cancelButtonText: t('common.cancel')
  })
  await deletePermission(getPermissionId(row))
  ElMessage.success(t('system.permission.message.deleteSuccess'))
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
    ElMessage.success(t('system.permission.message.updateSuccess'))
  } else {
    await createPermission({
      name: form.name,
      description: form.description,
      type: form.type,
      method: form.method,
      path: form.path,
      group: form.group
    })
    ElMessage.success(t('system.permission.message.createSuccess'))
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

function getPermissionTypeTagType(type: string): 'primary' | 'warning' | 'info' {
  if (type === 'menu') return 'primary'
  if (type === 'api') return 'warning'
  return 'info'
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

function handleRouteSelect(value: string) {
  const target = filteredAvailableRoutes.value.find((item) => getRouteValue(item) === value)
  if (target) {
    form.path = target.path
  } else {
    form.path = ''
  }
}

onMounted(() => {
  fetchData()
  fetchGroups()
  fetchAvailableRoutes()
})

watch(
  () => queryParams.type,
  () => {
    queryParams.group = ''
    fetchGroups()
  }
)

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
</script>

<template>
  <div class="permission-container">
    <PageSearchSection
      :model="queryParams"
      :label-width="searchLabelWidth"
      @submit="handleSearch"
    >
      <el-form-item :label="t('system.permission.search.name')">
        <el-input
          v-model="queryParams.name"
          :placeholder="t('system.permission.search.name')"
          clearable
        />
      </el-form-item>
      <el-form-item :label="t('system.permission.search.type')">
        <el-select
          v-model="queryParams.type"
          :placeholder="t('common.selectPlaceholder')"
        >
          <el-option
            v-for="typeItem in permissionTypes"
            :key="typeItem.value"
            :label="typeItem.label"
            :value="typeItem.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('system.permission.search.group')">
        <el-select
          v-model="queryParams.group"
          :placeholder="t('common.selectPlaceholder')"
          clearable
        >
          <el-option
            v-for="g in groups"
            :key="g"
            :label="g"
            :value="g"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('system.permission.search.method')">
        <el-select
          v-model="queryParams.method"
          :placeholder="t('common.selectPlaceholder')"
          clearable
        >
          <el-option
            label="GET"
            value="GET"
          />
          <el-option
            label="POST"
            value="POST"
          />
          <el-option
            label="PUT"
            value="PUT"
          />
          <el-option
            label="DELETE"
            value="DELETE"
          />
        </el-select>
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
            width="72"
          >
            <template #default="{ row }">
              {{ getPermissionId(row) }}
            </template>
          </el-table-column>
          <el-table-column
            prop="name"
            :label="t('system.permission.table.name')"
            min-width="180"
            show-overflow-tooltip
          />
          <el-table-column
            prop="type"
            :label="t('system.permission.table.type')"
            width="100"
          >
            <template #default="{ row }">
              <el-tag :type="getPermissionTypeTagType(row.type)">
                {{ permissionTypes.find((t) => t.value === row.type)?.label || row.type }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="method"
            :label="t('system.permission.table.method')"
            width="110"
          >
            <template #default="{ row }">
              <el-tag :type="getMethodTagType(row.method)">
                {{ row.method || '-' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="path"
            :label="t('system.permission.table.path')"
            min-width="300"
            show-overflow-tooltip
          />
          <el-table-column
            prop="group"
            :label="t('system.permission.table.group')"
            width="150"
            show-overflow-tooltip
          />
          <TableActionColumn>
            <template #default="{ row }">
              <el-button
                link
                type="primary"
                size="small"
                @click="handleEdit(row)"
              >
                {{ t('system.permission.action.edit') }}
              </el-button>
              <el-button
                link
                type="primary"
                size="small"
                @click="handleDelete(row)"
              >
                {{ t('system.permission.action.delete') }}
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

    <!-- 权限表单对话框 -->
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
        <el-form-item
          :label="t('system.permission.form.type')"
          prop="type"
        >
          <el-select v-model="form.type">
            <el-option
              v-for="typeItem in permissionTypes"
              :key="typeItem.value"
              :label="typeItem.label"
              :value="typeItem.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          :label="t('system.permission.form.method')"
          prop="method"
        >
          <el-select
            v-model="form.method"
            :placeholder="t('common.selectPlaceholder')"
          >
            <el-option
              label="GET"
              value="GET"
            />
            <el-option
              label="POST"
              value="POST"
            />
            <el-option
              label="PUT"
              value="PUT"
            />
            <el-option
              label="DELETE"
              value="DELETE"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          :label="t('system.permission.form.route')"
          prop="path"
        >
          <el-select
            v-model="selectedRoute"
            :disabled="!form.method"
            :placeholder="t('system.permission.form.routePlaceholder')"
            clearable
            filterable
            @change="handleRouteSelect"
          >
            <el-option
              v-for="item in filteredAvailableRoutes"
              :key="getRouteValue(item)"
              :label="getRouteValue(item)"
              :value="getRouteValue(item)"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          :label="t('system.permission.form.group')"
          prop="group"
        >
          <el-select
            v-model="form.group"
            filterable
            allow-create
            clearable
            :placeholder="t('system.permission.form.groupPlaceholder')"
          >
            <el-option
              v-for="g in groups"
              :key="g"
              :label="g"
              :value="g"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          :label="t('system.permission.form.name')"
          prop="name"
        >
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item
          :label="t('system.permission.form.description')"
          prop="description"
        >
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

    <!-- 权限详情对话框 -->
    <BaseDialog
      v-model="detailVisible"
      :title="t('system.permission.dialog.detail')"
      width="600px"
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
          <el-descriptions-item :label="t('system.permission.table.name')">
            {{ detailData.name }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('system.permission.table.type')">
            {{ getPermissionTypeLabel(detailData.type) }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('system.permission.table.method')">
            {{ detailData.method || '-' }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('system.permission.table.path')">
            {{ detailData.path || '-' }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('system.permission.table.group')">
            {{ detailData.group || '-' }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('system.permission.table.description')">
            {{ detailData.description || '-' }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('system.permission.table.createdAt')">
            {{ formatDateTime(detailData.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('system.permission.table.updatedAt')">
            {{ formatDateTime(detailData.updated_at) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </BaseDialog>
  </div>
</template>
