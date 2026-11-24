<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAllRoles } from '@/api/role'
import { getUserRoles, setUserRoles } from '@/api/user'
import type { Role, UserInfo } from '@/types/api'
import { notify } from '@/utils/notify'

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()

const visible = ref(false)
const loading = ref(false)
const submitting = ref(false)
const allRoles = ref<Role[]>([])
const selectedRoleIds = ref<number[]>([])
const currentUserId = ref(0)
const roleTableRef = ref<{
  clearSelection: () => void
  toggleRowSelection: (row: Role, selected?: boolean) => void
}>()

let openRequestSeq = 0
let rolesFetchPromise: Promise<void> | null = null

function getRoleId(role: Role): number {
  return role.id ?? role.ID ?? 0
}

async function fetchRoles() {
  if (!rolesFetchPromise) {
    rolesFetchPromise = (async () => {
      const { data } = await getAllRoles()
      allRoles.value = data.data || []
    })().finally(() => {
      rolesFetchPromise = null
    })
  }
  await rolesFetchPromise
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

async function open(user: UserInfo) {
  if (!user?.id) {
    return
  }

  const requestSeq = ++openRequestSeq
  currentUserId.value = user.id
  selectedRoleIds.value = []
  visible.value = true
  loading.value = true

  try {
    const [, userRolesRes] = await Promise.all([
      allRoles.value.length ? Promise.resolve() : fetchRoles(),
      getUserRoles(user.id)
    ])

    if (requestSeq !== openRequestSeq || !visible.value) {
      return
    }

    selectedRoleIds.value = (userRolesRes.data.data || [])
      .map((id) => Number(id))
      .filter((id) => id > 0)

    await nextTick()
    if (requestSeq !== openRequestSeq || !visible.value) {
      return
    }
    syncRoleTableSelection()
  } finally {
    if (requestSeq === openRequestSeq) {
      loading.value = false
    }
  }
}

async function handleSubmit() {
  if (!currentUserId.value || loading.value || submitting.value) {
    return
  }

  submitting.value = true
  try {
    await setUserRoles(currentUserId.value, selectedRoleIds.value)
    notify.success(t('system.user.message.roleSuccess'))
    visible.value = false
    emit('saved')
  } finally {
    submitting.value = false
  }
}

function handleClosed() {
  openRequestSeq += 1
  currentUserId.value = 0
  selectedRoleIds.value = []
  loading.value = false
  roleTableRef.value?.clearSelection()
}

defineExpose({
  open
})
</script>

<template>
  <BaseDialog
    v-model="visible"
    :title="t('system.user.dialog.role')"
    width="760px"
    @closed="handleClosed"
  >
    <AppTable
      ref="roleTableRef"
      :data="allRoles"
      :loading="loading"
      :row-key="(row: Role) => String(getRoleId(row))"
      border
      class="role-dialog-table"
      @selection-change="handleRoleSelectionChange"
    >
      <AppTableColumn
        type="selection"
        width="52"
        align="center"
      />
      <AppTableColumn
        label="ID"
        width="120"
        align="center"
      >
        <template #default="{ row }">
          <span class="font-mono tabular-nums">{{ getRoleId(row) || '-' }}</span>
        </template>
      </AppTableColumn>
      <AppTableColumn
        :label="t('system.role.table.description')"
        min-width="220"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.description || '-' }}
        </template>
      </AppTableColumn>
      <AppTableColumn
        :label="t('system.role.table.name')"
        min-width="180"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <span class="font-mono">{{ row.name || '-' }}</span>
        </template>
      </AppTableColumn>
    </AppTable>
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
        {{ t('system.user.dialog.role') }}
      </AppButton>
    </template>
  </BaseDialog>
</template>

<style lang="scss" scoped>
.role-dialog-table {
  width: 100%;
}
</style>
