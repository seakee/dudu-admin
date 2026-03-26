<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { MoreFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useWindowSize } from '@vueuse/core'
import CryptoJS from 'crypto-js'
import {
  getUserList,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserPasskeys,
  resetUserPassword,
  disableUserTfa,
  deleteUserPasskey,
  deleteAllUserPasskeys,
  setUserRoles,
  getUserRoles
} from '@/api/user'
import { getAllRoles } from '@/api/role'
import type { PasskeyItem, UserInfo, Role } from '@/types/api'
import { formatDateTime } from '@/utils/datetime'
import { useI18n } from 'vue-i18n'
import { useFormLabelWidth } from '@/composables/useFormLabelWidth'

const loading = ref(false)
const tableData = ref<UserInfo[]>([])
const total = ref(0)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const roleDialogVisible = ref(false)
const passwordDialogVisible = ref(false)
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<UserInfo | null>(null)
const tfaDisablingUserId = ref<number | null>(null)
const passkeyDialogVisible = ref(false)
const passkeyLoading = ref(false)
const passkeyDeletingId = ref<number | null>(null)
const passkeyDeletingAll = ref(false)
const passkeyTableData = ref<PasskeyItem[]>([])
const currentPasskeyUser = ref<UserInfo | null>(null)
const { t } = useI18n()
const formLabelWidth = useFormLabelWidth()
const searchLabelWidth = useFormLabelWidth('88px', '110px')
const { width } = useWindowSize()
const isCompactTable = computed(() => width.value < 1280)
const isNarrowTable = computed(() => width.value < 1100)
const actionColumnWidth = computed(() => {
  if (isNarrowTable.value) {
    return 96
  }

  if (isCompactTable.value) {
    return 168
  }

  return 248
})

const queryParams = reactive({
  page: 1,
  page_size: 10,
  user_name: '',
  email: '',
  phone: '',
  status: undefined as number | undefined
})

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

const rules = computed<FormRules>(() => ({
  user_name: [{ required: true, message: t('system.user.validation.userNameRequired'), trigger: 'blur' }],
  email: [{
    validator: (_rule, value, callback) => {
      if (value && !/^\S+@\S+\.\S+$/.test(value)) {
        callback(new Error(t('system.user.validation.emailInvalid')))
        return
      }
      callback()
    },
    trigger: 'blur'
  }],
  phone: [{
    validator: (_rule, value, callback) => {
      if (value && !/^\+?\d{6,20}$/.test(value)) {
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

const allRoles = ref<Role[]>([])
const selectedRoleIds = ref<number[]>([])
const currentUserId = ref(0)
const roleTableRef = ref<{
  clearSelection: () => void
  toggleRowSelection: (row: Role, selected?: boolean) => void
}>()

const newPassword = ref('')

function getRoleId(role: Role): number {
  return role.id ?? role.ID ?? 0
}

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

async function fetchRoles() {
  const { data } = await getAllRoles()
  allRoles.value = data.data
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
  await ElMessageBox.confirm(t('system.user.message.deleteConfirm'), t('navbar.dialogTitle'), {
    type: 'warning',
    confirmButtonText: t('common.confirm'),
    cancelButtonText: t('common.cancel')
  })
  await deleteUser(row.id)
  ElMessage.success(t('system.user.message.deleteSuccess'))
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
    ElMessage.warning(t('system.user.validation.identifierRequired'))
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
    ElMessage.success(t('system.user.message.updateSuccess'))
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
    ElMessage.success(t('system.user.message.createSuccess'))
  }
  dialogVisible.value = false
  fetchData()
}

async function handleRole(row: UserInfo) {
  currentUserId.value = row.id
  if (!allRoles.value.length) {
    await fetchRoles()
  }
  const { data } = await getUserRoles(row.id)
  selectedRoleIds.value = data.data
  roleDialogVisible.value = true
  await nextTick()
  syncRoleTableSelection()
}

async function handleRoleSubmit() {
  await setUserRoles(currentUserId.value, selectedRoleIds.value)
  ElMessage.success(t('system.user.message.roleSuccess'))
  roleDialogVisible.value = false
}

function syncRoleTableSelection() {
  if (!roleTableRef.value) {
    return
  }

  const selectedSet = new Set(selectedRoleIds.value)
  roleTableRef.value.clearSelection()

  allRoles.value.forEach((role) => {
    if (selectedSet.has(getRoleId(role))) {
      roleTableRef.value?.toggleRowSelection(role, true)
    }
  })
}

function handleRoleSelectionChange(selection: Role[]) {
  selectedRoleIds.value = selection.map((role) => getRoleId(role)).filter((id) => id > 0)
}

function handleResetPassword(row: UserInfo) {
  currentUserId.value = row.id
  newPassword.value = ''
  passwordDialogVisible.value = true
}

async function handlePasswordSubmit() {
  if (!newPassword.value) {
    ElMessage.warning(t('system.user.validation.newPasswordRequired'))
    return
  }
  const encryptedPassword = CryptoJS.MD5(newPassword.value).toString()
  await resetUserPassword(currentUserId.value, encryptedPassword)
  ElMessage.success(t('system.user.message.resetSuccess'))
  passwordDialogVisible.value = false
}

async function handleDisableTfa(row: UserInfo) {
  if (!row.id || tfaDisablingUserId.value === row.id) {
    return
  }

  try {
    await ElMessageBox.confirm(t('system.user.message.disableTfaConfirm'), t('navbar.dialogTitle'), {
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

    ElMessage.success(t('system.user.message.disableTfaSuccess'))
    fetchData()
  } finally {
    tfaDisablingUserId.value = null
  }
}

async function openPasskeyDialog(row: UserInfo) {
  currentPasskeyUser.value = row
  passkeyDialogVisible.value = true
  await fetchUserPasskeys(row.id)
}

async function fetchUserPasskeys(userId: number) {
  passkeyLoading.value = true
  try {
    const { data } = await getUserPasskeys(userId)
    passkeyTableData.value = data.data.list || []
  } finally {
    passkeyLoading.value = false
  }
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

async function handleDeleteUserPasskey(item: PasskeyItem) {
  if (!currentPasskeyUser.value) {
    return
  }

  try {
    await ElMessageBox.confirm(t('system.user.message.passkeyDeleteConfirm'), t('navbar.dialogTitle'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel')
    })
  } catch {
    return
  }

  passkeyDeletingId.value = item.id
  try {
    await deleteUserPasskey({
      user_id: currentPasskeyUser.value.id,
      id: item.id
    })

    passkeyTableData.value = passkeyTableData.value.filter((target) => target.id !== item.id)
    updateUserPasskeyCount(currentPasskeyUser.value.id, passkeyTableData.value.length)
    ElMessage.success(t('system.user.message.passkeyDeleteSuccess'))
  } finally {
    passkeyDeletingId.value = null
  }
}

async function handleDeleteAllUserPasskeys() {
  if (!currentPasskeyUser.value || passkeyDeletingAll.value) {
    return
  }

  try {
    await ElMessageBox.confirm(t('system.user.message.passkeyDeleteAllConfirm'), t('navbar.dialogTitle'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel')
    })
  } catch {
    return
  }

  passkeyDeletingAll.value = true
  try {
    await deleteAllUserPasskeys({ user_id: currentPasskeyUser.value.id })
    passkeyTableData.value = []
    updateUserPasskeyCount(currentPasskeyUser.value.id, 0)
    ElMessage.success(t('system.user.message.passkeyDeleteAllSuccess'))
  } finally {
    passkeyDeletingAll.value = false
  }
}

function handlePasskeyDialogClosed() {
  currentPasskeyUser.value = null
  passkeyTableData.value = []
}

function shouldShowDisableTfaAction(row: UserInfo) {
  return row.totp_enabled !== false
}

function handleMoreCommand(command: string | number | object, row: UserInfo) {
  switch (command) {
    case 'edit':
      handleEdit(row)
      break
    case 'role':
      handleRole(row)
      break
    case 'password':
      handleResetPassword(row)
      break
    case 'disableTfa':
      handleDisableTfa(row)
      break
    case 'passkey':
      openPasskeyDialog(row)
      break
    case 'delete':
      handleDelete(row)
      break
    default:
      break
  }
}

function getUserIdentifierLabel(row: UserInfo) {
  const values = [row.email, row.phone].filter((item) => !!item)
  if (!values.length) {
    return '-'
  }
  return values.join(' / ')
}

function getUserInitial(name?: string) {
  const trimmed = name?.trim() || ''
  if (!trimmed) return '#'
  const [firstChar] = Array.from(trimmed)
  if (!firstChar) return '#'
  return /[a-zA-Z]/.test(firstChar) ? firstChar.toUpperCase() : firstChar
}

function formatPasskeyTransports(transports?: string[]) {
  if (!transports?.length) {
    return '-'
  }

  return transports.join(' / ')
}

onMounted(() => {
  fetchData()
  fetchRoles()
})
</script>

<template>
  <div class="user-container">
    <PageSearchSection
      :model="queryParams"
      :label-width="searchLabelWidth"
      @submit="handleSearch"
    >
      <el-form-item :label="t('system.user.search.userName')">
        <el-input
          v-model="queryParams.user_name"
          :placeholder="t('system.user.search.userName')"
          clearable
        />
      </el-form-item>
      <el-form-item :label="t('system.user.search.email')">
        <el-input
          v-model="queryParams.email"
          :placeholder="t('system.user.search.email')"
          clearable
        />
      </el-form-item>
      <el-form-item :label="t('system.user.search.phone')">
        <el-input
          v-model="queryParams.phone"
          :placeholder="t('system.user.search.phone')"
          clearable
        />
      </el-form-item>
      <el-form-item :label="t('system.user.search.status')">
        <el-select
          v-model="queryParams.status"
          :placeholder="t('common.selectPlaceholder')"
          clearable
        >
          <el-option
            :label="t('common.enabled')"
            :value="1"
          />
          <el-option
            :label="t('common.disabled')"
            :value="0"
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
            prop="id"
            label="ID"
            width="80"
          >
            <template #default="{ row }">
              <el-button
                link
                type="primary"
                size="small"
                @click="handleDetail(row)"
              >
                {{ row.id }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column
            prop="user_name"
            :label="t('system.user.table.userName')"
            min-width="220"
          >
            <template #default="{ row }">
              <span class="user-name-cell">
                <el-avatar
                  :size="32"
                  :src="row.avatar || undefined"
                  class="user-avatar"
                >
                  {{ getUserInitial(row.user_name) }}
                </el-avatar>
                <span class="user-name-content">
                  <el-tooltip
                    :content="row.user_name || '-'"
                    placement="top"
                  >
                    <el-button
                      link
                      type="primary"
                      size="small"
                      class="user-name-button"
                      @click="handleDetail(row)"
                    >
                      <span class="user-name-text">{{ row.user_name || '-' }}</span>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip
                    v-if="isNarrowTable"
                    :content="getUserIdentifierLabel(row)"
                    placement="top"
                  >
                    <span class="user-identifier-text">{{ getUserIdentifierLabel(row) }}</span>
                  </el-tooltip>
                </span>
              </span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="!isNarrowTable"
            prop="email"
            :label="t('system.user.table.email')"
            min-width="180"
            show-overflow-tooltip
          />
          <el-table-column
            v-if="!isNarrowTable"
            prop="phone"
            :label="t('system.user.table.phone')"
            min-width="140"
            show-overflow-tooltip
          />
          <el-table-column
            prop="status"
            :label="t('system.user.table.status')"
            width="100"
          >
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'danger'">
                {{ row.status === 1 ? t('common.enabled') : t('common.disabled') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="totp_enabled"
            :label="t('system.user.table.tfa')"
            width="100"
          >
            <template #default="{ row }">
              <el-tag :type="row.totp_enabled ? 'success' : 'info'">
                {{ row.totp_enabled ? t('profile.tfaEnabled') : t('profile.tfaDisabled') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            v-if="!isCompactTable"
            prop="passkey_count"
            :label="t('system.user.table.passkeyCount')"
            width="110"
          >
            <template #default="{ row }">
              {{ row.passkey_count ?? 0 }}
            </template>
          </el-table-column>
          <el-table-column
            v-if="!isCompactTable"
            prop="created_at"
            :label="t('system.user.table.createdAt')"
            width="180"
          >
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <TableActionColumn :width="actionColumnWidth">
            <template #default="{ row }">
              <div class="user-row-actions">
                <el-button
                  v-if="!isNarrowTable"
                  link
                  type="primary"
                  size="small"
                  @click="handleEdit(row)"
                >
                  {{ t('system.user.action.edit') }}
                </el-button>
                <el-button
                  v-if="!isCompactTable"
                  link
                  type="primary"
                  size="small"
                  @click="handleRole(row)"
                >
                  {{ t('system.user.action.role') }}
                </el-button>
                <el-dropdown
                  placement="bottom-end"
                  trigger="click"
                  @command="handleMoreCommand($event, row)"
                >
                  <el-button
                    link
                    type="primary"
                    size="small"
                    class="user-more-button"
                    :class="{ 'is-standalone': isNarrowTable }"
                  >
                    {{ t('system.user.action.more') }}
                    <el-icon class="user-more-icon">
                      <MoreFilled />
                    </el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        v-if="isNarrowTable"
                        command="edit"
                      >
                        {{ t('system.user.action.edit') }}
                      </el-dropdown-item>
                      <el-dropdown-item
                        v-if="isCompactTable"
                        command="role"
                      >
                        {{ t('system.user.action.role') }}
                      </el-dropdown-item>
                      <el-dropdown-item command="password">
                        {{ t('system.user.action.password') }}
                      </el-dropdown-item>
                      <el-dropdown-item
                        v-if="shouldShowDisableTfaAction(row)"
                        command="disableTfa"
                        :disabled="tfaDisablingUserId === row.id"
                      >
                        {{ t('system.user.action.disableTfa') }}
                      </el-dropdown-item>
                      <el-dropdown-item command="passkey">
                        {{ t('system.user.action.passkey') }}
                      </el-dropdown-item>
                      <el-dropdown-item
                        divided
                        command="delete"
                      >
                        {{ t('system.user.action.delete') }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
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

    <!-- 用户表单对话框 -->
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
      >
        <el-form-item
          :label="t('system.user.form.userName')"
          prop="user_name"
        >
          <el-input v-model="form.user_name" />
        </el-form-item>
        <el-form-item
          :label="t('system.user.form.email')"
          prop="email"
        >
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item
          :label="t('system.user.form.phone')"
          prop="phone"
        >
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item
          :label="t('system.user.form.password')"
          prop="password"
        >
          <el-input
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
        </el-form-item>
        <el-form-item :label="t('system.user.form.avatar')">
          <el-input
            v-model="form.avatar"
            placeholder="https://..."
          />
        </el-form-item>
        <el-form-item :label="t('system.user.form.status')">
          <el-switch
            v-model="form.status"
            :active-value="1"
            :inactive-value="0"
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

    <!-- 用户详情对话框 -->
    <BaseDialog
      v-model="detailVisible"
      :title="t('system.user.dialog.detail')"
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
            {{ detailData.id }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('profile.account')">
            {{ getUserIdentifierLabel(detailData) }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('system.user.table.phone')">
            {{ detailData.phone || '-' }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('system.user.table.userName')">
            {{ detailData.user_name }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('system.user.table.status')">
            <el-tag :type="detailData.status === 1 ? 'success' : 'danger'">
              {{ detailData.status === 1 ? t('common.enabled') : t('common.disabled') }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item :label="t('system.user.table.avatar')">
            <el-avatar
              :size="32"
              :src="detailData.avatar || undefined"
              class="user-avatar"
            >
              {{ getUserInitial(detailData.user_name) }}
            </el-avatar>
          </el-descriptions-item>
          <el-descriptions-item :label="t('system.user.table.tfa')">
            <el-tag :type="detailData.totp_enabled ? 'success' : 'info'">
              {{ detailData.totp_enabled ? t('profile.tfaEnabled') : t('profile.tfaDisabled') }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item :label="t('system.user.table.passkeyCount')">
            {{ detailData.passkey_count ?? 0 }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('system.user.table.createdAt')">
            {{ formatDateTime(detailData.created_at) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </BaseDialog>

    <!-- 角色分配对话框 -->
    <BaseDialog
      v-model="roleDialogVisible"
      :title="t('system.user.dialog.role')"
      width="760px"
    >
      <PageListSection naked>
        <template #table>
          <el-table
            ref="roleTableRef"
            :data="allRoles"
            :row-key="(row: Role) => String(getRoleId(row))"
            border
            class="role-dialog-table"
            @selection-change="handleRoleSelectionChange"
          >
            <el-table-column
              type="selection"
              width="52"
              align="center"
            />
            <el-table-column
              label="ID"
              width="120"
              align="center"
            >
              <template #default="{ row }">
                {{ getRoleId(row) || '-' }}
              </template>
            </el-table-column>
            <el-table-column
              :label="t('system.role.table.description')"
              min-width="220"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.description || '-' }}
              </template>
            </el-table-column>
            <el-table-column
              :label="t('system.role.table.name')"
              min-width="180"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.name || '-' }}
              </template>
            </el-table-column>
          </el-table>
        </template>
      </PageListSection>
      <template #footer>
        <el-button
          type="primary"
          @click="handleRoleSubmit"
        >
          {{ t('system.user.dialog.role') }}
        </el-button>
      </template>
    </BaseDialog>

    <!-- 重置密码对话框 -->
    <BaseDialog
      v-model="passwordDialogVisible"
      :title="t('system.user.dialog.resetPassword')"
      width="400px"
    >
      <el-form>
        <el-form-item :label="t('system.user.form.newPassword')">
          <el-input
            v-model="newPassword"
            type="password"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">
          {{ t('common.cancel') }}
        </el-button>
        <el-button
          type="primary"
          @click="handlePasswordSubmit"
        >
          {{ t('common.confirm') }}
        </el-button>
      </template>
    </BaseDialog>

    <BaseDialog
      v-model="passkeyDialogVisible"
      :title="t('system.user.dialog.passkey')"
      width="760px"
      @closed="handlePasskeyDialogClosed"
    >
      <div class="user-passkey-dialog">
        <div class="user-passkey-toolbar">
          <div class="user-passkey-summary">
            <strong>{{ currentPasskeyUser?.user_name || '-' }}</strong>
            <span>{{ t('passkey.summary', { count: passkeyTableData.length }) }}</span>
          </div>
          <el-button
            type="danger"
            plain
            :disabled="passkeyTableData.length === 0"
            :loading="passkeyDeletingAll"
            @click="handleDeleteAllUserPasskeys"
          >
            {{ t('passkey.deleteAll') }}
          </el-button>
        </div>

        <div
          v-loading="passkeyLoading"
          class="user-passkey-list"
        >
          <el-empty
            v-if="!passkeyLoading && passkeyTableData.length === 0"
            :description="t('passkey.empty')"
          />

          <el-table
            v-else
            :data="passkeyTableData"
            border
          >
            <el-table-column
              prop="display_name"
              :label="t('passkey.displayName')"
              min-width="180"
            />
            <el-table-column
              :label="t('passkey.transports')"
              min-width="140"
            >
              <template #default="{ row }">
                {{ formatPasskeyTransports(row.transports) }}
              </template>
            </el-table-column>
            <el-table-column
              :label="t('passkey.lastUsedAt')"
              min-width="170"
            >
              <template #default="{ row }">
                {{ row.last_used_at ? formatDateTime(row.last_used_at) : t('passkey.notUsed') }}
              </template>
            </el-table-column>
            <el-table-column
              prop="created_at"
              :label="t('passkey.createdAt')"
              min-width="170"
            >
              <template #default="{ row }">
                {{ formatDateTime(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column
              :label="t('common.actions')"
              width="100"
            >
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  size="small"
                  :loading="passkeyDeletingId === row.id"
                  @click="handleDeleteUserPasskey(row)"
                >
                  {{ t('passkey.delete') }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <template #footer>
        <el-button @click="passkeyDialogVisible = false">
          {{ t('common.close') }}
        </el-button>
      </template>
    </BaseDialog>
  </div>
</template>

<style lang="scss" scoped>
.user-container {
  .page-card--table {
    .user-name-cell {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      min-width: 0;
      line-height: 1;
    }

    .user-name-content {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .user-avatar {
      flex-shrink: 0;
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
      border: 1px solid var(--el-color-primary-light-7);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.2px;
    }

    .user-name-button {
      --el-button-hover-link-text-color: var(--el-color-primary);
      --el-button-active-color: var(--el-color-primary);
      padding: 0;
      width: 100%;
      height: auto;
      line-height: 1;
      justify-content: flex-start;
      font-weight: 500;
      overflow: hidden;
    }

    .user-name-text {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 500;
      color: inherit;
    }

    .user-identifier-text {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      line-height: 1.4;
      color: var(--app-text-muted);
    }

    .user-row-actions {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
    }

    .user-more-button {
      padding: 0;
      height: auto;
      line-height: 1.2;
    }

    .user-more-button:not(.is-standalone) {
      position: relative;
      padding-left: 16px;
    }

    .user-more-button:not(.is-standalone)::before {
      content: '｜';
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translate(-50%, -50%);
      color: var(--el-text-color-placeholder);
      font-weight: 400;
      line-height: 1;
      pointer-events: none;
    }

    .user-more-icon {
      margin-left: 4px;
      font-size: 12px;
    }

    .form-tip {
      margin-top: 6px;
      font-size: 12px;
      line-height: 1.4;
      color: var(--el-text-color-secondary);
    }

  }
}

:global(html.dark) .user-container .page-card--table .user-avatar {
  background: rgba(255, 255, 255, 0.14);
  color: #f5f5f5;
  border-color: rgba(255, 255, 255, 0.28);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.4);
}

@media (max-width: 1100px) {
  .user-container .page-card--table .user-name-cell {
    max-width: 220px;
  }
}

.role-dialog-table {
  width: 100%;
}

.user-passkey-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-passkey-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.user-passkey-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;

  strong {
    color: var(--app-text-primary);
  }

  span {
    font-size: 12px;
    color: var(--app-text-muted);
  }
}

.user-passkey-list {
  min-height: 180px;
}
</style>
