<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CryptoJS from 'crypto-js'
import { resetUserPassword } from '@/api/user'
import type { UserInfo } from '@/types/api'
import { notify } from '@/utils/notify'

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()

const visible = ref(false)
const submitting = ref(false)
const currentUserId = ref(0)
const passwordForm = reactive({ password: '' })

function open(user: UserInfo) {
  if (!user?.id) {
    return
  }

  currentUserId.value = user.id
  passwordForm.password = ''
  visible.value = true
}

async function handleSubmit() {
  if (!currentUserId.value || submitting.value) {
    return
  }

  if (!passwordForm.password) {
    notify.warning(t('system.user.validation.newPasswordRequired'))
    return
  }

  submitting.value = true
  try {
    const encryptedPassword = CryptoJS.MD5(passwordForm.password).toString()
    await resetUserPassword(currentUserId.value, encryptedPassword)
    notify.success(t('system.user.message.resetSuccess'))
    visible.value = false
    emit('saved')
  } finally {
    submitting.value = false
  }
}

function handleClosed() {
  currentUserId.value = 0
  passwordForm.password = ''
}

defineExpose({
  open
})
</script>

<template>
  <BaseDialog
    v-model="visible"
    :title="t('system.user.dialog.resetPassword')"
    width="400px"
    @closed="handleClosed"
  >
    <AppForm
      :model="passwordForm"
      @submit="handleSubmit"
    >
      <AppFormItem :label="t('system.user.form.newPassword')">
        <AppInput
          v-model="passwordForm.password"
          type="password"
          show-password
        />
      </AppFormItem>
    </AppForm>
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
        @click="handleSubmit"
      >
        {{ t('common.confirm') }}
      </AppButton>
    </template>
  </BaseDialog>
</template>
