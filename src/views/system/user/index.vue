<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import type { SelectOption, TableActionItem } from '@/components/types'
import { notify } from '@/utils/notify'
import { confirmDialog } from '@/utils/confirm'
import type { FormInstance, FormRules } from '@/types/form'
import { useWindowSize } from '@vueuse/core'
import CryptoJS from 'crypto-js'
import {
  getUserList,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  disableUserTfa
} from '@/api/user'
import type { UserInfo } from '@/types/api'
import { formatDateTime } from '@/utils/datetime'
import { useI18n } from 'vue-i18n'
import { useHeaderRefresh } from '@/composables/useHeaderRefresh'
import { useFormLabelWidth } from '@/composables/useFormLabelWidth'
import UserRoleDialog from './components/UserRoleDialog.vue'
import UserResetPasswordDialog from './components/UserResetPasswordDialog.vue'
import UserPasskeyDialog from './components/UserPasskeyDialog.vue'

const loading = ref(false)
const tableData = ref<UserInfo[]>([])
const total = ref(0)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const userRoleDialogRef = ref<InstanceType<typeof UserRoleDialog> | null>(null)
const resetPasswordDialogRef = ref<InstanceType<typeof UserResetPasswordDialog> | null>(null)
const passkeyDialogRef = ref<InstanceType<typeof UserPasskeyDialog> | null>(null)
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<UserInfo | null>(null)
const tfaDisablingUserId = ref<number | null>(null)
const { t, locale } = useI18n()
const formLabelWidth = useFormLabelWidth()
const { width } = useWindowSize()
const isCompactTable = computed(() => width.value < 1280)
const isNarrowTable = computed(() => width.value < 1100)

const queryParams = reactive({
  page: 1,
  page_size: 10,
  user_name: '',
  email: '',
  phone: '',
  status: undefined as number | undefined
})

const statusOptions = computed<SelectOption[]>(() => [
  { value: 1, label: t('common.enabled') },
  { value: 0, label: t('common.disabled') }
])

const statusFilter = computed({
  get: () => queryParams.status,
  set: (value: SelectOption['value'] | null | undefined) => {
    queryParams.status = typeof value === 'number' ? value : undefined
  }
})

const hasActiveFilters = computed(() => Boolean(
  queryParams.user_name || queryParams.email || queryParams.phone || queryParams.status != null
))

const formRef = ref<FormInstance>()
const form = reactive({
  id: 0,
  user_name: '',
  email: '',
  phone: '',
  password: '',
  status: 1,
  avatar: ''
})

const statusEnabled = computed({
  get: () => form.status === 1,
  set: (enabled: boolean) => {
    form.status = enabled ? 1 : 0
  }
})

const rules = computed<FormRules>(() => ({
  user_name: [{ required: true, message: t('system.user.validation.userNameRequired'), trigger: 'blur' }],
  email: [{
    validator: (_rule, value, callback) => {
      if (value && (typeof value !== 'string' || !/^\S+@\S+\.\S+$/.test(value))) {
        callback(new Error(t('system.user.validation.emailInvalid')))
        return
      }
      callback()
    },
    trigger: 'blur'
  }],
  phone: [{
    validator: (_rule, value, callback) => {
      if (value && (typeof value !== 'string' || !/^\+?\d{6,20}$/.test(value))) {
        callback(new Error(t('system.user.validation.phoneInvalid')))
        return
      }
      callback()
    },
    trigger: 'blur'
  }],
  password: [{
    validator: (_rule, value, callback) => {
      if (!form.id && !value) {
        callback(new Error(t('system.user.validation.passwordRequired')))
        return
      }
      callback()
    },
    trigger: 'blur'
  }]
}))

async function fetchData() {
  loading.value = true
  try {
    const { data } = await getUserList(queryParams)
    tableData.value = data.data.list
    total.value = data.data.total
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  queryParams.page = 1
  fetchData()
}

function handleReset() {
  queryParams.user_name = ''
  queryParams.email = ''
  queryParams.phone = ''
  queryParams.status = undefined
  handleSearch()
}

function handleAdd() {
  dialogTitle.value = t('system.user.dialog.create')
  form.id = 0
  form.user_name = ''
  form.email = ''
  form.phone = ''
  form.password = ''
  form.status = 1
  form.avatar = ''
  dialogVisible.value = true
}

function handleEdit(row: UserInfo) {
  dialogTitle.value = t('system.user.dialog.edit')
  form.id = row.id ?? 0
  form.user_name = row.user_name
  form.email = row.email || ''
  form.phone = row.phone || ''
  form.password = ''
  form.status = row.status ?? 1
  form.avatar = row.avatar || ''
  dialogVisible.value = true
}

async function handleDelete(row: UserInfo) {
  try {
    await confirmDialog(t('system.user.message.deleteConfirm'), t('navbar.dialogTitle'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel')
    })
  } catch (error) {
    if (error === 'cancel') return
    throw error
  }
  await deleteUser(row.id)
  notify.success(t('system.user.message.deleteSuccess'))
  fetchData()
}

async function handleDetail(row: UserInfo) {
  detailVisible.value = true
  detailLoading.value = true
  try {
    const { data } = await getUser(row.id)
    detailData.value = data.data
  } finally {
    detailLoading.value = false
  }
}

function handleDetailClosed() {
  detailData.value = null
}

async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  if (!form.email.trim() && !form.phone.trim()) {
    notify.warning(t('system.user.validation.identifierRequired'))
    return
  }

  if (form.id) {
    const updatePayload: {
      user_name: string
      email?: string
      phone?: string
      status: number
      avatar: string
      password?: string
    } = {
      user_name: form.user_name,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      status: form.status,
      avatar: form.avatar
    }

    if (form.password) {
      updatePayload.password = CryptoJS.MD5(form.password).toString()
    }

    await updateUser(form.id, {
      ...updatePayload
    })
    notify.success(t('system.user.message.updateSuccess'))
  } else {
    const createPayload: {
      user_name: string
      email?: string
      phone?: string
      password: string
      status: number
      avatar: string
    } = {
      user_name: form.user_name,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      password: CryptoJS.MD5(form.password).toString(),
      status: form.status,
      avatar: form.avatar
    }

    await createUser(createPayload)
    notify.success(t('system.user.message.createSuccess'))
  }
  dialogVisible.value = false
  fetchData()
}

function handleRole(row: UserInfo) {
  userRoleDialogRef.value?.open(row)
}

function handleResetPassword(row: UserInfo) {
  resetPasswordDialogRef.value?.open(row)
}

async function handleDisableTfa(row: UserInfo) {
  if (!row.id || tfaDisablingUserId.value === row.id) {
    return
  }

  try {
    await confirmDialog(t('system.user.message.disableTfaConfirm'), t('navbar.dialogTitle'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel')
    })
  } catch {
    return
  }

  tfaDisablingUserId.value = row.id
  try {
    await disableUserTfa({ user_id: row.id })
    row.totp_enabled = false

    if (detailData.value?.id === row.id) {
      detailData.value = {
        ...detailData.value,
        totp_enabled: false
      }
    }

    notify.success(t('system.user.message.disableTfaSuccess'))
    fetchData()
  } finally {
    tfaDisablingUserId.value = null
  }
}

function openPasskeyDialog(row: UserInfo) {
  passkeyDialogRef.value?.open(row)
}

function updateUserPasskeyCount(userId: number, count: number) {
  const user = tableData.value.find((item) => item.id === userId)
  if (user) {
    user.passkey_count = count
  }

  if (detailData.value?.id === userId) {
    detailData.value = {
      ...detailData.value,
      passkey_count: count
    }
  }
}

function handlePasskeyChanged({ userId, count }: { userId: number; count: number }) {
  updateUserPasskeyCount(userId, count)
}

function shouldShowDisableTfaAction(row: UserInfo) {
  return row.totp_enabled !== false
}

function getUserActions(row: UserInfo): TableActionItem[] {
  return [
    {
      key: 'detail',
      label: t('system.user.action.detail'),
      icon: 'Eye',
      onClick: () => handleDetail(row)
    },
    {
      key: 'edit',
      label: t('system.user.action.edit'),
      icon: 'Pencil',
      onClick: () => handleEdit(row)
    },
    {
      key: 'role',
      label: t('system.user.action.role'),
      icon: 'Users',
      onClick: () => handleRole(row)
    },
    {
      key: 'password',
      label: t('system.user.action.password'),
      icon: 'KeyRound',
      onClick: () => handleResetPassword(row)
    },
    {
      key: 'disableTfa',
      label: t('system.user.action.disableTfa'),
      icon: 'LockOpen',
      hidden: !shouldShowDisableTfaAction(row),
      disabled: tfaDisablingUserId.value === row.id,
      onClick: () => handleDisableTfa(row)
    },
    {
      key: 'passkey',
      label: t('system.user.action.passkey'),
      icon: 'Shield',
      onClick: () => openPasskeyDialog(row)
    },
    {
      key: 'delete',
      label: t('system.user.action.delete'),
      icon: 'Trash',
      tone: 'danger',
      divided: true,
      onClick: () => handleDelete(row)
    }
  ]
}

function getUserIdentifierLabel(row: UserInfo) {
  const values = [row.email, row.phone].filter((item) => !!item)
  if (!values.length) {
    return '-'
  }
  return values.join(' / ')
}

function getContactSecondary(row: UserInfo) {
  if (!row.email && !row.phone) {
    return ''
  }
  return row.phone || '-'
}

function getUserInitial(name?: string) {
  const trimmed = name?.trim() || ''
  if (!trimmed) return '#'
  const [firstChar] = Array.from(trimmed)
  if (!firstChar) return '#'
  return /[a-zA-Z]/.test(firstChar) ? firstChar.toUpperCase() : firstChar
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
            control-width="168px"
            @search="handleSearch"
            @reset="handleReset"
          >
            <AppInput
              v-model="queryParams.user_name"
              size="sm"
              :suffix-icon="queryParams.user_name ? undefined : 'Search'"
              :aria-label="t('system.user.search.userName')"
              :placeholder="t('system.user.search.userName')"
              clearable
              @enter="handleSearch"
            />
            <AppInput
              v-model="queryParams.email"
              size="sm"
              :aria-label="t('system.user.search.email')"
              :placeholder="t('system.user.search.email')"
              clearable
              @enter="handleSearch"
            />
            <AppInput
              v-model="queryParams.phone"
              size="sm"
              :aria-label="t('system.user.search.phone')"
              :placeholder="t('system.user.search.phone')"
              clearable
              @enter="handleSearch"
            />
            <AppSelect
              v-model="statusFilter"
              size="sm"
              :options="statusOptions"
              :aria-label="t('system.user.search.status')"
              :placeholder="t('system.user.search.status')"
              clearable
              @change="handleSearch"
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
            prop="user_name"
            :label="t('system.user.table.userName')"
            min-width="190"
          >
            <template #default="{ row }">
              <TableCellStack
                tabular
                :truncate="false"
              >
                <template #prefix>
                  <AppAvatar
                    :size="34"
                    :src="row.avatar || undefined"
                    :fallback="getUserInitial(row.user_name)"
                    class="user-avatar"
                  />
                </template>
                <template #primary>
                  <AppTooltip
                    :content="row.user_name || '-'"
                    placement="top"
                  >
                    <AppButton
                      variant="link"
                      size="sm"
                      class="user-name-button"
                      @click="handleDetail(row)"
                    >
                      <span class="user-name-text">{{ row.user_name || '-' }}</span>
                    </AppButton>
                  </AppTooltip>
                  <StatusPill
                    v-if="isNarrowTable && row.id != null"
                    compact
                    mono
                    tone="neutral"
                    class="cell-pill-fixed"
                    :label="`#${row.id}`"
                  />
                </template>
                <template #secondary>
                  <AppTooltip
                    v-if="isNarrowTable"
                    :content="getUserIdentifierLabel(row)"
                    placement="top"
                  >
                    <span class="cell-secondary-truncate">{{ getUserIdentifierLabel(row) }}</span>
                  </AppTooltip>
                  <span
                    v-else
                    class="font-mono tabular-nums"
                  >
                    {{ row.id != null ? `#${row.id}` : '-' }}
                  </span>
                </template>
              </tablecellstack>
            </template>
          </AppTableColumn>
          <AppTableColumn
            v-if="!isNarrowTable"
            prop="email"
            :label="`${t('system.user.table.email')} / ${t('system.user.table.phone')}`"
            min-width="180"
          >
            <template #default="{ row }">
              <TableCellStack
                :primary="row.email || '-'"
                :secondary="getContactSecondary(row)"
                mono-secondary
                tabular
              />
            </template>
          </AppTableColumn>
          <AppTableColumn
            prop="status"
            :label="t('system.user.table.status')"
            width="104"
          >
            <template #default="{ row }">
              <StatusPill
                :tone="row.status === 1 ? 'success' : 'danger'"
                dot
                :label="row.status === 1 ? t('common.enabled') : t('common.disabled')"
              />
            </template>
          </AppTableColumn>
          <AppTableColumn
            prop="totp_enabled"
            :label="`${t('system.user.table.tfa')} / ${t('system.user.action.passkey')}`"
            min-width="136"
          >
            <template #default="{ row }">
              <TableCellStack
                tabular
                :truncate="false"
              >
                <template #primary>
                  <StatusPill
                    compact
                    class="cell-pill-fixed"
                    :tone="row.totp_enabled ? 'success' : 'neutral'"
                    :dot="Boolean(row.totp_enabled)"
                    :label="row.totp_enabled ? t('profile.tfaEnabled') : t('profile.tfaDisabled')"
                  />
                </template>
                <template #secondary>
                  <span class="cell-secondary-truncate tabular-nums">
                    {{ `${t('system.user.table.passkeyCount')}: ${row.passkey_count ?? 0}` }}
                  </span>
                </template>
              </TableCellStack>
            </template>
          </AppTableColumn>
          <AppTableColumn
            v-if="!isCompactTable"
            class-name="tabular-nums"
            prop="created_at"
            :label="t('system.user.table.createdAt')"
            width="168"
          >
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </AppTableColumn>
          <TableActionColumn
            :actions="getUserActions"
            :max-visible="3"
            :compact-max-visible="2"
            :mobile-max-visible="1"
            :compact-breakpoint="1380"
            :width="locale === 'en-US' ? 286 : 254"
            :compact-width="180"
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

    <!-- 用户表单对话框 -->
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
          :label="t('system.user.form.userName')"
          prop="user_name"
        >
          <AppInput v-model="form.user_name" />
        </AppFormItem>
        <AppFormItem
          :label="t('system.user.form.email')"
          prop="email"
        >
          <AppInput v-model="form.email" />
        </AppFormItem>
        <AppFormItem
          :label="t('system.user.form.phone')"
          prop="phone"
        >
          <AppInput v-model="form.phone" />
        </AppFormItem>
        <AppFormItem
          :label="t('system.user.form.password')"
          prop="password"
        >
          <AppInput
            v-model="form.password"
            type="password"
            :placeholder="form.id ? t('system.user.form.passwordOptional') : t('system.user.form.passwordRequiredHint')"
            show-password
          />
          <div
            v-if="!form.id"
            class="form-tip"
          >
            {{ t('system.user.form.passwordRequiredHint') }}
          </div>
        </AppFormItem>
        <AppFormItem :label="t('system.user.form.avatar')">
          <AppInput
            v-model="form.avatar"
            placeholder="https://..."
          />
        </AppFormItem>
        <AppFormItem :label="t('system.user.form.status')">
          <AppSwitch v-model="statusEnabled" />
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

    <!-- 用户详情对话框 -->
    <DetailDialog
      v-model="detailVisible"
      :title="t('system.user.dialog.detail')"
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
          <span class="font-mono tabular-nums">{{ detailData.id }}</span>
        </AppDescriptionsItem>
        <AppDescriptionsItem :label="t('profile.account')">
          {{ getUserIdentifierLabel(detailData) }}
        </AppDescriptionsItem>
        <AppDescriptionsItem :label="t('system.user.table.phone')">
          {{ detailData.phone || '-' }}
        </AppDescriptionsItem>
        <AppDescriptionsItem :label="t('system.user.table.userName')">
          {{ detailData.user_name }}
        </AppDescriptionsItem>
        <AppDescriptionsItem :label="t('system.user.table.status')">
          <StatusPill
            :tone="detailData.status === 1 ? 'success' : 'danger'"
            dot
            :label="detailData.status === 1 ? t('common.enabled') : t('common.disabled')"
          />
        </AppDescriptionsItem>
        <AppDescriptionsItem :label="t('system.user.table.avatar')">
          <AppAvatar
            :size="32"
            :src="detailData.avatar || undefined"
            :fallback="getUserInitial(detailData.user_name)"
            class="user-avatar"
          />
        </AppDescriptionsItem>
        <AppDescriptionsItem :label="t('system.user.table.tfa')">
          <StatusPill
            :tone="detailData.totp_enabled ? 'success' : 'neutral'"
            :dot="Boolean(detailData.totp_enabled)"
            :label="detailData.totp_enabled ? t('profile.tfaEnabled') : t('profile.tfaDisabled')"
          />
        </AppDescriptionsItem>
        <AppDescriptionsItem :label="t('system.user.table.passkeyCount')">
          <span class="tabular-nums">{{ detailData.passkey_count ?? 0 }}</span>
        </AppDescriptionsItem>
        <AppDescriptionsItem :label="t('system.user.table.createdAt')">
          <span class="tabular-nums">{{ formatDateTime(detailData.created_at) }}</span>
        </AppDescriptionsItem>
      </AppDescriptions>
    </DetailDialog>

    <!-- 角色分配对话框 -->
    <UserRoleDialog ref="userRoleDialogRef" />

    <!-- 重置密码对话框 -->
    <UserResetPasswordDialog ref="resetPasswordDialogRef" />

    <!-- Passkey 管理对话框 -->
    <UserPasskeyDialog
      ref="passkeyDialogRef"
      @changed="handlePasskeyChanged"
    />
  </div>
</template>

<style lang="scss" scoped>
.user-avatar {
  flex-shrink: 0;
  background: var(--primary-subtle);
  color: var(--primary-text);
  border: 1px solid var(--border-subtle);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.btn.user-name-button {
  padding: 0;
  min-width: 0;
  max-width: 100%;
  height: auto;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-primary);
  justify-content: flex-start;
  overflow: hidden;

  &:hover:not(:disabled) {
    color: var(--primary-text);
  }
}

.user-name-text {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: inherit;
}

.cell-pill-fixed {
  flex-shrink: 0;
}

.cell-secondary-truncate {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.form-tip {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-secondary);
}
</style>
