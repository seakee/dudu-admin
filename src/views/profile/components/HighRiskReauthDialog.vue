<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  deleteMyPasskey,
  finishPasskeyRegister,
  getPasskeyRegisterOptions,
  unbindOAuth
} from '@/api/auth'
import { useAdminReauth } from '@/composables/useAdminReauth'
import type { OAuthAccount, PasskeyItem, ReauthMethod } from '@/types/api'
import { isHandledHttpError } from '@/utils/httpError'
import { notify } from '@/utils/notify'
import { getOAuthProviderMeta } from '@/utils/oauthProvider'
import { getWebAuthnErrorI18nKey, startPasskeyRegistration } from '@/utils/webauthn'
import ReauthPanel from './ReauthPanel.vue'

export type HighRiskAction = 'oauth-unbind' | 'passkey-delete' | 'passkey-register'

type HighRiskStep = 'confirm' | 'reauth'

type ReauthPanelInstance = {
  validate: () => Promise<boolean>
  clearValidate: () => void
  focusOtp: () => void
  clearOtp: () => void
}

const emit = defineEmits<{
  success: [action: HighRiskAction]
  'deleting-id-change': [value: number | null]
  'register-busy-change': [value: boolean]
}>()

const { t } = useI18n()

const dialogVisible = ref(false)
const highRiskActionLoading = ref(false)
const highRiskStep = ref<HighRiskStep>('confirm')
const currentHighRiskAction = ref<HighRiskAction>('oauth-unbind')
const currentOAuthAccount = ref<OAuthAccount | null>(null)
const currentPasskey = ref<PasskeyItem | null>(null)
const pendingPasskeyDisplayName = ref('')
const passkeyRegistering = ref(false)
const passkeyDeletingId = ref<number | null>(null)

const highRiskReauthPanelRef = ref<ReauthPanelInstance | null>(null)
const highRiskReauth = useAdminReauth(t)

const canSubmitHighRisk = computed(() => (
  highRiskStep.value === 'confirm' || highRiskReauth.canSubmit
))

const highRiskBusy = computed(() => (
  highRiskActionLoading.value || highRiskReauth.loading || highRiskReauth.methodsLoading
))

const passkeyRegisterBusy = computed(() => (
  passkeyRegistering.value || (
    dialogVisible.value
    && currentHighRiskAction.value === 'passkey-register'
    && highRiskBusy.value
  )
))

watch(passkeyDeletingId, (value) => {
  emit('deleting-id-change', value)
})

watch(passkeyRegisterBusy, (value) => {
  emit('register-busy-change', value)
})

const highRiskRequiresConfirm = computed(() => currentHighRiskAction.value !== 'passkey-register')

const highRiskConfirmButtonText = computed(() => (
  currentHighRiskAction.value === 'oauth-unbind'
    ? t('profile.oauth.unbindConfirmBtn')
    : t('profile.passkey.deleteConfirmBtn')
))

const highRiskFinalActionText = computed(() => {
  if (currentHighRiskAction.value === 'oauth-unbind') {
    return t('profile.oauth.completeUnbindBtn')
  }
  if (currentHighRiskAction.value === 'passkey-delete') {
    return t('profile.passkey.completeDeleteBtn')
  }
  return t('passkey.startRegister')
})

const highRiskDialogTitle = computed(() => {
  if (highRiskStep.value === 'confirm') {
    return currentHighRiskAction.value === 'oauth-unbind'
      ? t('profile.oauth.unbindConfirmTitle')
      : t('profile.passkey.deleteConfirmTitle')
  }
  if (currentHighRiskAction.value === 'passkey-register') {
    return t('passkey.startRegister')
  }
  return t('profile.reauth.title')
})

const highRiskTargetTitle = computed(() => {
  if (currentHighRiskAction.value === 'oauth-unbind') {
    return getOAuthProviderLabel(currentOAuthAccount.value?.provider)
  }
  return currentPasskey.value?.display_name || t('passkey.displayName')
})

const highRiskTargetMeta = computed(() => {
  if (currentHighRiskAction.value === 'oauth-unbind') {
    return currentOAuthAccount.value?.display_name || '-'
  }
  return currentPasskey.value?.last_used_at || currentPasskey.value?.created_at || '-'
})

const highRiskConfirmDescription = computed(() => {
  if (currentHighRiskAction.value === 'oauth-unbind') {
    return t('profile.oauth.unbindConfirmDesc', {
      provider: getOAuthProviderLabel(currentOAuthAccount.value?.provider),
      account: currentOAuthAccount.value?.display_name || '-'
    })
  }
  return t('profile.passkey.deleteConfirmDesc', {
    name: currentPasskey.value?.display_name || '-'
  })
})

const highRiskWarningText = computed(() => (
  currentHighRiskAction.value === 'oauth-unbind'
    ? t('profile.oauth.unbindWarning')
    : t('profile.passkey.deleteWarning')
))

const highRiskPrimaryButtonVariant = computed<'danger' | 'primary'>(() => (
  currentHighRiskAction.value === 'passkey-delete' ? 'danger' : 'primary'
))

const highRiskSubmitButtonText = computed(() => {
  if (highRiskStep.value === 'confirm') {
    return highRiskConfirmButtonText.value
  }
  if (highRiskReauth.step === 'passkey') {
    return t('profile.reauth.passkeyBtn')
  }
  if (highRiskReauth.step === 'password') {
    return t('profile.reauth.passwordBtn')
  }
  return highRiskFinalActionText.value
})

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : ''
}

function getOAuthProviderLabel(provider?: string) {
  if (!provider) return '-'
  const meta = getOAuthProviderMeta(provider)
  return meta.i18nKey ? t(meta.i18nKey) : provider
}

function resetHighRiskDialog() {
  highRiskStep.value = 'confirm'
  highRiskActionLoading.value = false
  currentOAuthAccount.value = null
  currentPasskey.value = null
  pendingPasskeyDisplayName.value = ''
  highRiskReauth.reset()

  nextTick(() => {
    highRiskReauthPanelRef.value?.clearOtp()
  })
}

function syncHighRiskReauthUi() {
  nextTick(() => {
    highRiskReauthPanelRef.value?.clearValidate()
    highRiskReauthPanelRef.value?.focusOtp()
  })
}

function handleHighRiskClosed() {
  resetHighRiskDialog()
}

function openOAuthUnbind(account: OAuthAccount) {
  resetHighRiskDialog()
  currentHighRiskAction.value = 'oauth-unbind'
  currentOAuthAccount.value = account
  highRiskStep.value = 'confirm'
  dialogVisible.value = true
}

function openPasskeyDelete(item: PasskeyItem) {
  resetHighRiskDialog()
  currentHighRiskAction.value = 'passkey-delete'
  currentPasskey.value = item
  highRiskStep.value = 'confirm'
  dialogVisible.value = true
}

async function openPasskeyRegister(displayName = '') {
  if (passkeyRegisterBusy.value) return

  resetHighRiskDialog()
  currentHighRiskAction.value = 'passkey-register'
  pendingPasskeyDisplayName.value = displayName
  highRiskStep.value = 'reauth'
  dialogVisible.value = true

  try {
    await highRiskReauth.prepare()
    syncHighRiskReauthUi()
  } catch (error: unknown) {
    if (!isHandledHttpError(error)) {
      notify.error(getErrorMessage(error) || t('profile.message.getFailed'))
    }
    dialogVisible.value = false
  }
}

async function handleProceedHighRiskReauth() {
  if (highRiskBusy.value) return

  try {
    await highRiskReauth.prepare()
    highRiskStep.value = 'reauth'
    syncHighRiskReauthUi()
  } catch (error: unknown) {
    if (!isHandledHttpError(error)) {
      notify.error(getErrorMessage(error) || t('profile.message.getFailed'))
    }
  }
}

function handleHighRiskBack() {
  if (highRiskBusy.value) return
  highRiskReauth.reset()
  highRiskStep.value = 'confirm'
  nextTick(() => {
    highRiskReauthPanelRef.value?.clearValidate()
    highRiskReauthPanelRef.value?.clearOtp()
  })
}

function handleHighRiskReauthMethodSwitch(method: ReauthMethod) {
  if (highRiskBusy.value) return
  highRiskReauth.switchMethod(method)
  syncHighRiskReauthUi()
}

function handleHighRiskReauthOtpComplete() {
  if (canSubmitHighRisk.value && !highRiskBusy.value) {
    void handleSubmitHighRisk()
  }
}

async function executeHighRiskOAuthUnbind(reauthTicket: string) {
  const account = currentOAuthAccount.value
  if (!account) return

  const { data } = await unbindOAuth({
    identity_id: account.id,
    reauth_ticket: reauthTicket
  })

  if (data.code !== 0) {
    throw new Error(data.msg || t('profile.message.updateFailed'))
  }

  notify.success(t('profile.message.oauthUnbindSuccess'))
  dialogVisible.value = false
  emit('success', 'oauth-unbind')
}

async function executeHighRiskPasskeyDelete(reauthTicket: string) {
  const item = currentPasskey.value
  if (!item) return

  passkeyDeletingId.value = item.id
  try {
    const { data } = await deleteMyPasskey({
      id: item.id,
      reauth_ticket: reauthTicket
    })
    if (data.code !== 0) {
      throw new Error(data.msg || t('passkey.failed'))
    }
    notify.success(t('passkey.deleted'))
    dialogVisible.value = false
    emit('success', 'passkey-delete')
  } finally {
    passkeyDeletingId.value = null
  }
}

async function executeHighRiskPasskeyRegister(reauthTicket: string) {
  passkeyRegistering.value = true
  try {
    const trimmedName = pendingPasskeyDisplayName.value.trim()
    const { data: optionsResponse } = await getPasskeyRegisterOptions({
      reauth_ticket: reauthTicket,
      display_name: trimmedName || undefined
    })

    const optionData = optionsResponse.data
    if (!optionData?.challenge_id || !optionData.options) {
      throw new Error(t('passkey.failed'))
    }

    const credential = await startPasskeyRegistration(optionData.options)

    const { data: finishResponse } = await finishPasskeyRegister({
      challenge_id: optionData.challenge_id,
      credential
    })

    if (finishResponse.code !== 0) {
      throw new Error(finishResponse.msg || t('passkey.failed'))
    }

    notify.success(t('passkey.registered'))
    dialogVisible.value = false
    emit('success', 'passkey-register')
  } catch (error: unknown) {
    if (!isHandledHttpError(error)) {
      const webAuthnKey = getWebAuthnErrorI18nKey(error)
      notify.error(webAuthnKey ? t(webAuthnKey) : getErrorMessage(error) || t('passkey.failed'))
    }
  } finally {
    passkeyRegistering.value = false
  }
}

async function handleSubmitHighRisk() {
  if (highRiskBusy.value) return

  if (highRiskStep.value === 'confirm') {
    await handleProceedHighRiskReauth()
    return
  }

  const valid = await highRiskReauthPanelRef.value?.validate()
  if (valid === false) return

  highRiskActionLoading.value = true
  try {
    const reauthTicket = await highRiskReauth.submit()
    if (!reauthTicket) {
      syncHighRiskReauthUi()
      return
    }

    if (currentHighRiskAction.value === 'oauth-unbind') {
      await executeHighRiskOAuthUnbind(reauthTicket)
      return
    }
    if (currentHighRiskAction.value === 'passkey-delete') {
      await executeHighRiskPasskeyDelete(reauthTicket)
      return
    }
    await executeHighRiskPasskeyRegister(reauthTicket)
  } catch (error: unknown) {
    if (!isHandledHttpError(error)) {
      notify.error(getErrorMessage(error) || t('profile.message.updateFailed'))
    }
  } finally {
    highRiskActionLoading.value = false
  }
}

defineExpose({
  openOAuthUnbind,
  openPasskeyDelete,
  openPasskeyRegister
})
</script>

<template>
  <BaseDialog
    v-model="dialogVisible"
    :title="highRiskDialogTitle"
    width="460px"
    destroy-on-close
    @closed="handleHighRiskClosed"
  >
    <div
      v-loading="highRiskReauth.methodsLoading"
      class="high-risk-dialog"
    >
      <template v-if="highRiskStep === 'confirm'">
        <div class="high-risk-dialog__target">
          <div class="high-risk-dialog__target-icon">
            <OAuthProviderIcon
              v-if="currentHighRiskAction === 'oauth-unbind' && currentOAuthAccount"
              :provider="currentOAuthAccount.provider"
              :size="20"
            />
            <AppIcon
              v-else
              name="KeyRound"
              :size="18"
            />
          </div>
          <div class="high-risk-dialog__target-body">
            <span class="high-risk-dialog__target-title">{{ highRiskTargetTitle }}</span>
            <span class="high-risk-dialog__target-meta font-mono tabular-nums">{{ highRiskTargetMeta }}</span>
          </div>
        </div>

        <p class="high-risk-dialog__desc">
          {{ highRiskConfirmDescription }}
        </p>

        <AppAlert
          type="warning"
          :title="highRiskWarningText"
          show-icon
          :closable="false"
        />
      </template>

      <ReauthPanel
        v-else
        ref="highRiskReauthPanelRef"
        :step="highRiskReauth.step"
        :form="highRiskReauth.form"
        :passkey-supported="highRiskReauth.passkeySupported"
        :can-switch-to-passkey="highRiskReauth.hasPasskeyMethod && highRiskReauth.step === 'password' && highRiskReauth.passkeySupported"
        :can-switch-to-password="highRiskReauth.hasPasswordMethod && highRiskReauth.step === 'passkey'"
        :busy="highRiskBusy"
        @update:password="highRiskReauth.form.password = $event"
        @update:totp-code="highRiskReauth.form.totp_code = $event"
        @submit="handleSubmitHighRisk"
        @switch-method="handleHighRiskReauthMethodSwitch"
        @otp-complete="handleHighRiskReauthOtpComplete"
      />
    </div>

    <template #footer>
      <AppButton
        variant="secondary"
        :disabled="highRiskBusy"
        @click="dialogVisible = false"
      >
        {{ t('common.cancel') }}
      </AppButton>
      <AppButton
        v-if="highRiskStep === 'reauth' && highRiskRequiresConfirm"
        variant="secondary"
        :disabled="highRiskBusy"
        @click="handleHighRiskBack"
      >
        {{ t('common.back') }}
      </AppButton>
      <AppButton
        :variant="highRiskPrimaryButtonVariant"
        :loading="highRiskBusy"
        :disabled="!canSubmitHighRisk"
        @click="handleSubmitHighRisk"
      >
        {{ highRiskSubmitButtonText }}
      </AppButton>
    </template>
  </BaseDialog>
</template>

<style lang="scss" scoped>
.high-risk-dialog {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.high-risk-dialog__target {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--app-radius-md);
  background: var(--surface-subtle);
}

.high-risk-dialog__target-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: var(--app-radius-sm);
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
  color: var(--primary-text);
}

.high-risk-dialog__target-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.high-risk-dialog__target-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.high-risk-dialog__target-meta {
  font-size: 12.5px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.high-risk-dialog__desc {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--text-secondary);
}
</style>
