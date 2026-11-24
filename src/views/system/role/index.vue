<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { notify } from '@/utils/notify'
import { confirmDialog } from '@/utils/confirm'
import type { FormInstance, FormRules } from '@/types/form'
import {
  getRoleList,
  createRole,
  updateRole,
  deleteRole
} from '@/api/role'
import type { Role } from '@/types/api'
import { formatDateTime } from '@/utils/datetime'
import { useI18n } from 'vue-i18n'
import { useHeaderRefresh } from '@/composables/useHeaderRefresh'
import { useFormLabelWidth } from '@/composables/useFormLabelWidth'
import RolePermissionDialog from './components/RolePermissionDialog.vue'
import type { TableActionItem } from '@/components/types'

const loading = ref(false)
const tableData = ref<Role[]>([])
const total = ref(0)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const permissionDialogRef = ref<InstanceType<typeof RolePermissionDialog> | null>(null)
const { t, locale } = useI18n()
const formLabelWidth = useFormLabelWidth()

const queryParams = reactive({
  page: 1,
  page_size: 10,
  name: ''
})

const hasActiveFilters = computed(() => Boolean(queryParams.name))

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

        if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z_]*$/.test(value)) {
          callback(new Error(t('system.role.validation.nameFormat')))
          return
        }

        callback()
      },
      trigger: 'blur'
    }
  ]
}))

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

function getRoleId(role?: Role | null): number {
  return role?.id ?? role?.ID ?? 0
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
  try {
    await confirmDialog(t('system.role.message.deleteConfirm'), t('navbar.dialogTitle'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel')
    })
  } catch (error) {
    if (error === 'cancel') return
    throw error
  }
  await deleteRole(getRoleId(row))
  notify.success(t('system.role.message.deleteSuccess'))
  fetchData()
}

async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  if (form.id) {
    await updateRole(form.id, { name: form.name, description: form.description })
    notify.success(t('system.role.message.updateSuccess'))
  } else {
    await createRole({ name: form.name, description: form.description })
    notify.success(t('system.role.message.createSuccess'))
  }
  dialogVisible.value = false
  fetchData()
}

function handlePermission(row: Role) {
  permissionDialogRef.value?.open(row)
}

function getRoleActions(row: Role): TableActionItem[] {
  return [
    {
      key: 'edit',
      label: t('system.role.action.edit'),
      icon: 'Pencil',
      onClick: () => handleEdit(row)
    },
    {
      key: 'permission',
      label: t('system.role.action.permission'),
      icon: 'Shield',
      onClick: () => handlePermission(row)
    },
    {
      key: 'delete',
      label: t('system.role.action.delete'),
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
            control-width="220px"
            @search="handleSearch"
            @reset="handleReset"
          >
            <AppInput
              v-model="queryParams.name"
              size="sm"
              :suffix-icon="queryParams.name ? undefined : 'Search'"
              :aria-label="t('system.role.search.name')"
              :placeholder="t('system.role.search.name')"
              clearable
              @enter="handleSearch"
            />
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
          </PageFilterBar>
        </template>
      </PageControlBar>

      <PageListSection :loading="loading">
        <AppTable :data="tableData">
          <AppTableColumn
            prop="name"
            :label="t('system.role.table.name')"
            min-width="190"
          >
            <template #default="{ row }">
              <TableCellStack
                :primary="row.name"
                :secondary="'#' + getRoleId(row)"
                mono-primary
                mono-secondary
                tabular
              />
            </template>
          </AppTableColumn>
          <AppTableColumn
            prop="description"
            :label="t('system.role.table.description')"
            min-width="220"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.description || '-' }}
            </template>
          </AppTableColumn>
          <AppTableColumn
            :label="`${t('system.role.table.createdAt')} / ${t('system.role.table.updatedAt')}`"
            width="248"
          >
            <template #default="{ row }">
              <TableCellStack
                class="role-time-stack"
                tabular
              >
                <template #primary>
                  <span class="role-time-label">{{ t('system.role.table.createdAt') }}:</span>
                  {{ formatDateTime(row.created_at || row.CreatedAt) }}
                </template>
                <template #secondary>
                  <span class="role-time-label">{{ t('system.role.table.updatedAt') }}:</span>
                  {{ formatDateTime(row.updated_at || row.UpdatedAt) }}
                </template>
              </TableCellStack>
            </template>
          </AppTableColumn>
          <TableActionColumn
            :actions="getRoleActions"
            :max-visible="3"
            :compact-max-visible="3"
            :mobile-max-visible="1"
            :width="locale === 'en-US' ? 268 : 204"
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

    <!-- 角色表单对话框 -->
    <BaseDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
    >
      <AppForm
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="right"
        :label-width="formLabelWidth"
      >
        <AppFormItem
          :label="t('system.role.form.name')"
          prop="name"
        >
          <AppInput v-model="form.name" />
        </AppFormItem>
        <AppFormItem :label="t('system.role.form.description')">
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

    <!-- 权限分配对话框 -->
    <RolePermissionDialog ref="permissionDialogRef" />
  </div>
</template>

<style lang="scss" scoped>
.role-time-stack {
  :deep(.table-cell-stack__primary) {
    font-size: 12.5px;
    font-weight: 500;
  }
}

.role-time-label {
  font-size: 11.5px;
  font-weight: 400;
  color: var(--text-tertiary);
}
</style>
