<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  deleteAllUserPasskeys,
  deleteUserPasskey,
  getUserPasskeys
} from '@/api/user'
import type { PasskeyItem, UserInfo } from '@/types/api'
import { confirmDialog } from '@/utils/confirm'
import { formatDateTime } from '@/utils/datetime'
import { notify } from '@/utils/notify'
import type { TableActionItem } from '@/components/types'

const emit = defineEmits<{
  changed: [payload: { userId: number; count: number }]
}>()

const { t } = useI18n()

const visible = ref(false)
const loading = ref(false)
const deletingId = ref<number | null>(null)
const deletingAll = ref(false)
const passkeyTableData = ref<PasskeyItem[]>([])
const currentUser = ref<UserInfo | null>(null)

let openRequestSeq = 0

function formatPasskeyTransports(transports?: string[]) {
  if (!transports?.length) {
    return '-'
  }

  return transports.join(' / ')
}

async function fetchUserPasskeys(userId: number, requestSeq: number) {
  loading.value = true
  try {
    const { data } = await getUserPasskeys(userId)
    if (requestSeq !== openRequestSeq || !visible.value) {
      return
    }
    passkeyTableData.value = data.data.list || []
  } finally {
    if (requestSeq === openRequestSeq) {
      loading.value = false
    }
  }
}

async function open(user: UserInfo) {
  if (!user?.id) {
    return
  }

  const requestSeq = ++openRequestSeq
  currentUser.value = user
  passkeyTableData.value = []
  visible.value = true
  await fetchUserPasskeys(user.id, requestSeq)
}

async function handleDeleteUserPasskey(item: PasskeyItem) {
  if (!currentUser.value || deletingAll.value || deletingId.value !== null) {
    return
  }

  const targetUserId = currentUser.value.id

  try {
    await confirmDialog(t('system.user.message.passkeyDeleteConfirm'), t('navbar.dialogTitle'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel')
    })
  } catch {
    return
  }

  if (!currentUser.value || currentUser.value.id !== targetUserId) {
    return
  }

  deletingId.value = item.id
  try {
    await deleteUserPasskey({
      user_id: targetUserId,
      id: item.id
    })

    passkeyTableData.value = passkeyTableData.value.filter((target) => target.id !== item.id)
    emit('changed', { userId: targetUserId, count: passkeyTableData.value.length })
    notify.success(t('system.user.message.passkeyDeleteSuccess'))
  } finally {
    deletingId.value = null
  }
}

async function handleDeleteAllUserPasskeys() {
  if (!currentUser.value || deletingAll.value || deletingId.value !== null) {
    return
  }

  const targetUserId = currentUser.value.id

  try {
    await confirmDialog(t('system.user.message.passkeyDeleteAllConfirm'), t('navbar.dialogTitle'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel')
    })
  } catch {
    return
  }

  if (!currentUser.value || currentUser.value.id !== targetUserId) {
    return
  }

  deletingAll.value = true
  try {
    await deleteAllUserPasskeys({ user_id: targetUserId })
    passkeyTableData.value = []
    emit('changed', { userId: targetUserId, count: 0 })
    notify.success(t('system.user.message.passkeyDeleteAllSuccess'))
  } finally {
    deletingAll.value = false
  }
}

function handleClosed() {
  openRequestSeq += 1
  currentUser.value = null
  passkeyTableData.value = []
  loading.value = false
  deletingId.value = null
  deletingAll.value = false
}
function getPasskeyActions(row: PasskeyItem): TableActionItem[] {
  return [
    {
      key: 'delete',
      label: t('passkey.delete'),
      icon: 'Trash',
      tone: 'danger',
      loading: deletingId.value === row.id,
      disabled: deletingAll.value || (deletingId.value !== null && deletingId.value !== row.id),
      onClick: () => handleDeleteUserPasskey(row)
    }
  ]
}


defineExpose({
  open
})
</script>

<template>
  <BaseDialog
    v-model="visible"
    :title="t('system.user.dialog.passkey')"
    width="760px"
    @closed="handleClosed"
  >
    <div class="user-passkey-dialog">
      <div class="user-passkey-toolbar">
        <div class="user-passkey-summary">
          <strong>{{ currentUser?.user_name || '-' }}</strong>
          <span>{{ t('passkey.summary', { count: passkeyTableData.length }) }}</span>
        </div>
        <AppButton
          variant="danger"
          :disabled="loading || passkeyTableData.length === 0 || deletingId !== null"
          :loading="deletingAll"
          @click="handleDeleteAllUserPasskeys"
        >
          {{ t('passkey.deleteAll') }}
        </AppButton>
      </div>

      <div
        v-loading="loading"
        class="user-passkey-list"
      >
        <EmptyState
          v-if="!loading && passkeyTableData.length === 0"
          variant="inline"
          :title="t('passkey.empty')"
        />

        <AppTable
          v-else
          :data="passkeyTableData"
          border
        >
          <AppTableColumn
            prop="display_name"
            :label="t('passkey.displayName')"
            min-width="180"
          />
          <AppTableColumn
            :label="t('passkey.transports')"
            min-width="140"
          >
            <template #default="{ row }">
              {{ formatPasskeyTransports(row.transports) }}
            </template>
          </AppTableColumn>
          <AppTableColumn
            :label="t('passkey.lastUsedAt')"
            min-width="170"
          >
            <template #default="{ row }">
              <span class="tabular-nums">{{ row.last_used_at ? formatDateTime(row.last_used_at) : t('passkey.notUsed') }}</span>
            </template>
          </AppTableColumn>
          <AppTableColumn
            prop="created_at"
            class-name="tabular-nums"
            :label="t('passkey.createdAt')"
            min-width="170"
          >
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </AppTableColumn>
          <TableActionColumn
            :fixed="false"
            :width="84"
            :mobile-width="64"
            :max-visible="1"
            :compact-max-visible="1"
            :mobile-max-visible="1"
            :actions="getPasskeyActions"
          />
        </AppTable>
      </div>
    </div>

    <template #footer>
      <AppButton
        variant="secondary"
        @click="visible = false"
      >
        {{ t('common.close') }}
      </AppButton>
    </template>
  </BaseDialog>
</template>

<style lang="scss" scoped>
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
