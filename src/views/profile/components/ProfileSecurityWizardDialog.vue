<script setup lang="ts">
import CryptoJS from 'crypto-js'
import { useI18n } from 'vue-i18n'
import {
  changePassword,
  disableTfa,
  enableTfa,
  getTfaKey,
  updateIdentifier
} from '@/api/auth'
import { useAdminReauth } from '@/composables/useAdminReauth'
import type { ReauthMethod } from '@/types/api'
import type { FormInstance, FormRules } from '@/types/form'
import { isHandledHttpError } from '@/utils/httpError'
import { notify } from '@/utils/notify'
import OtpCodeInput from '@/components/OtpCodeInput/index.vue'
import ReauthPanel from './ReauthPanel.vue'

export type SecurityWizardAction = 'password' | 'account' | 'tfa-enable' | 'tfa-disable'

type OtpInputInstance = {
  focusFirst?: () => void
  clear?: () => void
}

type ReauthPanelInstance = {
  validate: () => Promise<boolean>
  clearValidate: () => void
  focusOtp: () => void
  clearOtp: () => void
}

const props = withDefaults(
  defineProps<{
    email?: string
    phone?: string
    tfaEnabled?: boolean
  }>(),
  {
    email: '',
    phone: '',
    tfaEnabled: false
  }
)

const emit = defineEmits<{
  success: [action: SecurityWizardAction]
}>()

const { t } = useI18n()

const dialogVisible = ref(false)
const activeStep = ref(0)
const currentAction = ref<SecurityWizardAction>('password')
const actionLoading = ref(false)
const tfaKeyLoading = ref(false)

const passwordFormRef = ref<FormInstance>()
const accountFormRef = ref<FormInstance>()
const tfaSetupFormRef = ref<FormInstance>()
const tfaSetupOtpInputRef = ref<OtpInputInstance | null>(null)
const actionReauthPanelRef = ref<ReauthPanelInstance | null>(null)

const actionReauth = useAdminReauth(t)

const actionData = reactive({
  password: '',
  confirmPassword: '',
  email: '',
  phone: '',
  totp_key: '',
  qr_code: '',
  setup_totp_code: ''
})

const passwordRules = computed<FormRules>(() => ({
  password: [{ required: true, message: t('profile.validation.passwordRequired'), trigger: 'blur' }],
  confirmPassword: [
    { required: true, message: t('profile.validation.passwordConfirmRequired'), trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== actionData.password) {
          callback(new Error(t('profile.validation.passwordMismatch')))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ]
}))

const accountRules = computed<FormRules>(() => ({
  email: [{
    validator: (_rule, value, callback) => {
      const email = typeof value === 'string' ? value : ''
      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        callback(new Error(t('profile.validation.emailInvalid')))
        return
      }
      callback()
    },
    trigger: 'blur'
  }],
  phone: [{
    validator: (_rule, value, callback) => {
      const phone = typeof value === 'string' ? value : ''
      if (phone && !/^\+?\d{6,20}$/.test(phone)) {
        callback(new Error(t('profile.validation.phoneInvalid')))
        return
      }
      callback()
    },
    trigger: 'blur'
  }]
}))

const tfaSetupRules = computed<FormRules>(() => ({
  setup_totp_code: [
    { required: true, message: t('profile.validation.codeRequired'), trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        const code = typeof value === 'string' ? value : ''
        if (!/^\d{6}$/.test(code)) {
          callback(new Error(t('profile.validation.codeInvalid')))
          return
        }
        callback()
      },
      trigger: ['blur', 'change']
    }
  ]
}))

const dialogTitle = computed(() => {
  switch (currentAction.value) {
    case 'password':
      return t('profile.sectionPassword')
    case 'account':
      return t('profile.sectionAccount')
    case 'tfa-enable':
      return t('profile.enableTfa')
    case 'tfa-disable':
      return t('profile.disableTfa')
    default:
      return ''
  }
})

const isTfaEnableAction = computed(() => currentAction.value === 'tfa-enable')
const dialogWidth = computed(() => (isTfaEnableAction.value ? '560px' : '460px'))

const actionSteps = computed(() => (
  isTfaEnableAction.value
    ? [
        { title: t('profile.tfaStepInfo') },
        { title: t('profile.tfaStepCode') },
        { title: t('profile.stepVerify') }
      ]
    : [
        { title: t('profile.stepInfo') },
        { title: t('profile.stepVerify') }
      ]
))

const actionFinalStep = computed(() => (isTfaEnableAction.value ? 2 : 1))
const isVerifyAction = computed(() => (
  currentAction.value === 'tfa-disable' || activeStep.value === actionFinalStep.value
))
const canSubmitCurrentAction = computed(() => isVerifyAction.value && actionReauth.canSubmit)
const actionBusy = computed(() => (
  actionLoading.value || actionReauth.loading || actionReauth.methodsLoading
))

const actionSubmitButtonText = computed(() => {
  if (actionReauth.step === 'passkey') {
    return t('profile.reauth.passkeyBtn')
  }
  if (actionReauth.step === 'password') {
    return t('profile.reauth.passwordBtn')
  }
  return currentAction.value === 'tfa-disable' ? t('common.disable') : t('common.confirm')
})

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : ''
}

function resetActionDialog() {
  actionData.password = ''
  actionData.confirmPassword = ''
  actionData.email = props.email
  actionData.phone = props.phone
  actionData.totp_key = ''
  actionData.qr_code = ''
  actionData.setup_totp_code = ''
  actionReauth.reset()

  nextTick(() => {
    actionReauthPanelRef.value?.clearOtp()
    tfaSetupOtpInputRef.value?.clear?.()
  })
}

async function loadTfaKey() {
  tfaKeyLoading.value = true
  try {
    const { data } = await getTfaKey()
    if (data.code === 0) {
      actionData.totp_key = data.data.totp_key
      actionData.qr_code = data.data.qr_code
    }
  } catch {
    // 请求层已处理错误提示
  } finally {
    tfaKeyLoading.value = false
  }
}

function syncActionReauthUi() {
  nextTick(() => {
    actionReauthPanelRef.value?.clearValidate()
    actionReauthPanelRef.value?.focusOtp()
  })
}

async function open(action: SecurityWizardAction) {
  currentAction.value = action
  activeStep.value = 0
  resetActionDialog()
  dialogVisible.value = true

  if (action === 'tfa-enable') {
    await loadTfaKey()
  } else if (action === 'tfa-disable') {
    try {
      await actionReauth.prepare()
      syncActionReauthUi()
    } catch (error: unknown) {
      if (!isHandledHttpError(error)) {
        notify.error(getErrorMessage(error) || t('profile.message.getFailed'))
      }
      dialogVisible.value = false
    }
  }
}

function handleActionClosed() {
  activeStep.value = 0
  resetActionDialog()
}

function prevStep() {
  if (activeStep.value > 0) {
    activeStep.value--
    if (activeStep.value === 1 && isTfaEnableAction.value) {
      nextTick(() => {
        tfaSetupFormRef.value?.clearValidate()
        tfaSetupOtpInputRef.value?.focusFirst?.()
      })
    }
  }
}

async function nextStep() {
  if (currentAction.value === 'password') {
    const valid = await passwordFormRef.value?.validate()
    if (valid === false) return
  } else if (currentAction.value === 'account') {
    const email = actionData.email.trim()
    const phone = actionData.phone.trim()
    if (!email && !phone) {
      notify.warning(t('profile.validation.identifierRequired'))
      return
    }
    if (email === props.email && phone === props.phone) {
      notify.warning(t('profile.validation.identifierUnchanged'))
      return
    }
    const valid = await accountFormRef.value?.validate()
    if (valid === false) return
  } else if (currentAction.value === 'tfa-enable') {
    if (activeStep.value === 0) {
      if (!actionData.totp_key) {
        notify.warning(t('profile.message.keyRequired'))
        return
      }
      activeStep.value = 1
      nextTick(() => {
        tfaSetupFormRef.value?.clearValidate()
        tfaSetupOtpInputRef.value?.focusFirst?.()
      })
      return
    }

    if (activeStep.value === 1) {
      const valid = await tfaSetupFormRef.value?.validate()
      if (valid === false) return
    }
  }

  try {
    await actionReauth.prepare()
    activeStep.value = actionFinalStep.value
    syncActionReauthUi()
  } catch (error: unknown) {
    if (!isHandledHttpError(error)) {
      notify.error(getErrorMessage(error) || t('profile.message.getFailed'))
    }
  }
}

function handleActionReauthMethodSwitch(method: ReauthMethod) {
  if (actionBusy.value) return
  actionReauth.switchMethod(method)
  syncActionReauthUi()
}

function handleActionReauthOtpComplete() {
  if (canSubmitCurrentAction.value && !actionBusy.value) {
    void handleSubmitAction()
  }
}

function handleTfaSetupOtpComplete() {
  if (!actionBusy.value && activeStep.value === 1 && isTfaEnableAction.value) {
    void nextStep()
  }
}

async function handleSubmitAction() {
  if (!isVerifyAction.value || actionBusy.value) {
    return
  }

  const valid = await actionReauthPanelRef.value?.validate()
  if (valid === false) return

  actionLoading.value = true
  try {
    const reauthTicket = await actionReauth.submit()
    if (!reauthTicket) {
      syncActionReauthUi()
      return
    }

    if (currentAction.value === 'password') {
      const { data } = await changePassword({
        password: CryptoJS.MD5(actionData.password).toString(),
        reauth_ticket: reauthTicket
      })
      if (data.code !== 0) {
        throw new Error(data.msg || t('profile.message.updateFailed'))
      }
      notify.success(t('profile.message.passwordUpdated'))
      emit('success', 'password')
      return
    }

    if (currentAction.value === 'account') {
      const { data } = await updateIdentifier({
        email: actionData.email.trim() || undefined,
        phone: actionData.phone.trim() || undefined,
        reauth_ticket: reauthTicket
      })
      if (data.code !== 0) {
        throw new Error(data.msg || t('profile.message.updateFailed'))
      }
      notify.success(t('profile.message.accountUpdated'))
      dialogVisible.value = false
      emit('success', 'account')
      return
    }

    if (currentAction.value === 'tfa-enable') {
      const { data } = await enableTfa({
        totp_key: actionData.totp_key,
        totp_code: actionData.setup_totp_code,
        reauth_ticket: reauthTicket
      })
      if (data.code !== 0) {
        throw new Error(data.msg || t('profile.message.enableFailed'))
      }
      notify.success(t('profile.message.enableSuccess'))
      emit('success', 'tfa-enable')
      return
    }

    if (currentAction.value === 'tfa-disable') {
      const { data } = await disableTfa({
        reauth_ticket: reauthTicket
      })
      if (data.code !== 0) {
        throw new Error(data.msg || t('profile.message.disableFailed'))
      }
      notify.success(t('profile.message.disableSuccess'))
      emit('success', 'tfa-disable')
    }
  } catch (error: unknown) {
    if (!isHandledHttpError(error)) {
      notify.error(getErrorMessage(error) || t('profile.message.updateFailed'))
    }
  } finally {
    actionLoading.value = false
  }
}

async function copyTotpKey() {
  if (!actionData.totp_key) return
  try {
    await navigator.clipboard.writeText(actionData.totp_key)
    notify.success(t('profile.message.keyCopied'))
  } catch {
    notify.error(t('profile.message.copyFailed'))
  }
}

defineExpose({
  open
})
</script>

<template>
  <BaseDialog
    v-model="dialogVisible"
    :title="dialogTitle"
    :width="dialogWidth"
    destroy-on-close
    @closed="handleActionClosed"
  >
    <div class="wizard-dialog">
      <AppSteps
        v-if="currentAction !== 'tfa-disable'"
        :active="activeStep"
        :steps="actionSteps"
        finish-status="success"
        class="wizard-dialog__steps"
      />

      <!-- Step 0: Password -->
      <AppForm
        v-if="currentAction === 'password' && activeStep === 0"
        ref="passwordFormRef"
        :model="actionData"
        :rules="passwordRules"
        label-position="top"
        class="wizard-dialog__form"
        @submit.prevent="nextStep"
      >
        <AppFormItem
          :label="t('profile.newPassword')"
          prop="password"
        >
          <AppInput
            v-model="actionData.password"
            type="password"
            show-password
            prefix-icon="Lock"
            :placeholder="t('common.placeholder')"
          />
        </AppFormItem>
        <AppFormItem
          :label="t('profile.confirmNewPassword')"
          prop="confirmPassword"
        >
          <AppInput
            v-model="actionData.confirmPassword"
            type="password"
            show-password
            prefix-icon="Lock"
            :placeholder="t('common.placeholder')"
            @enter="nextStep"
          />
        </AppFormItem>
      </AppForm>

      <!-- Step 0: Account Identifiers -->
      <AppForm
        v-else-if="currentAction === 'account' && activeStep === 0"
        ref="accountFormRef"
        :model="actionData"
        :rules="accountRules"
        label-position="top"
        class="wizard-dialog__form"
        @submit.prevent="nextStep"
      >
        <AppFormItem
          :label="t('profile.newEmail')"
          prop="email"
        >
          <AppInput
            v-model="actionData.email"
            prefix-icon="Mail"
            :placeholder="t('common.placeholder')"
          />
        </AppFormItem>
        <AppFormItem
          :label="t('profile.newPhone')"
          prop="phone"
        >
          <AppInput
            v-model="actionData.phone"
            prefix-icon="Phone"
            :placeholder="t('common.placeholder')"
            @enter="nextStep"
          />
        </AppFormItem>
      </AppForm>

      <!-- Step 0: TOTP Bind (Horizontal 2-col layout) -->
      <div
        v-else-if="currentAction === 'tfa-enable' && activeStep === 0"
        v-loading="tfaKeyLoading"
        class="wizard-dialog__tfa-setup"
      >
        <div class="wizard-dialog__qr-panel">
          <div class="wizard-dialog__qr-box">
            <img
              v-if="actionData.qr_code"
              :src="actionData.qr_code"
              alt="2FA QR Code"
              class="wizard-dialog__qr-img"
            >
            <AppIcon
              v-else
              name="QrCode"
              :size="32"
              class="wizard-dialog__qr-placeholder"
            />
          </div>
        </div>

        <div class="wizard-dialog__tfa-info">
          <h4 class="wizard-dialog__panel-title">
            {{ t('profile.tfaSetupTitle') }}
          </h4>
          <p class="wizard-dialog__panel-desc">
            {{ t('profile.tfaSetupDesc') }}
          </p>

          <div class="wizard-dialog__secret-card">
            <span class="wizard-dialog__secret-label">{{ t('profile.tfaKey') }}</span>
            <div class="wizard-dialog__secret-row">
              <code class="wizard-dialog__secret-code font-mono">
                {{ actionData.totp_key || '-' }}
              </code>
              <AppButton
                variant="secondary"
                size="sm"
                icon="Copy"
                :disabled="!actionData.totp_key"
                @click="copyTotpKey"
              >
                {{ t('common.copy') }}
              </AppButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 1: TOTP Verification Code -->
      <div
        v-else-if="currentAction === 'tfa-enable' && activeStep === 1"
        class="wizard-dialog__tfa-verify"
      >
        <div class="wizard-dialog__tfa-verify-head">
          <h4 class="wizard-dialog__panel-title">
            {{ t('profile.tfaCodeTitle') }}
          </h4>
          <p class="wizard-dialog__panel-desc">
            {{ t('profile.tfaCodeDesc') }}
          </p>
        </div>

        <AppForm
          ref="tfaSetupFormRef"
          :model="actionData"
          :rules="tfaSetupRules"
          class="wizard-dialog__otp-form"
          @submit.prevent="nextStep"
        >
          <AppFormItem
            prop="setup_totp_code"
            class="wizard-dialog__otp-item"
          >
            <div class="wizard-dialog__otp-box">
              <OtpCodeInput
                ref="tfaSetupOtpInputRef"
                v-model="actionData.setup_totp_code"
                :disabled="actionBusy"
                @complete="handleTfaSetupOtpComplete"
              />
            </div>
          </AppFormItem>
        </AppForm>
      </div>

      <!-- Final Step (or Disable TFA): Single ReauthPanel -->
      <div
        v-else
        v-loading="actionReauth.methodsLoading"
        class="wizard-dialog__verify"
      >
        <AppAlert
          v-if="currentAction === 'tfa-disable'"
          type="warning"
          :title="t('profile.disableConfirm')"
          show-icon
          :closable="false"
        />

        <ReauthPanel
          ref="actionReauthPanelRef"
          :step="actionReauth.step"
          :form="actionReauth.form"
          :passkey-supported="actionReauth.passkeySupported"
          :can-switch-to-passkey="actionReauth.hasPasskeyMethod && actionReauth.step === 'password' && actionReauth.passkeySupported"
          :can-switch-to-password="actionReauth.hasPasswordMethod && actionReauth.step === 'passkey'"
          :busy="actionBusy"
          @update:password="actionReauth.form.password = $event"
          @update:totp-code="actionReauth.form.totp_code = $event"
          @submit="handleSubmitAction"
          @switch-method="handleActionReauthMethodSwitch"
          @otp-complete="handleActionReauthOtpComplete"
        />
      </div>
    </div>

    <template #footer>
      <AppButton
        variant="secondary"
        @click="dialogVisible = false"
      >
        {{ t('common.cancel') }}
      </AppButton>
      <AppButton
        v-if="currentAction !== 'tfa-disable' && activeStep > 0"
        variant="secondary"
        :disabled="actionBusy"
        @click="prevStep"
      >
        {{ t('common.back') }}
      </AppButton>
      <AppButton
        v-if="currentAction !== 'tfa-disable' && activeStep < actionFinalStep"
        variant="primary"
        :loading="actionReauth.methodsLoading"
        :disabled="tfaKeyLoading"
        @click="nextStep"
      >
        {{ t('common.next') }}
      </AppButton>
      <AppButton
        v-else
        :variant="currentAction === 'tfa-disable' ? 'danger' : 'primary'"
        :loading="actionLoading || actionReauth.loading"
        :disabled="!canSubmitCurrentAction"
        @click="handleSubmitAction"
      >
        {{ actionSubmitButtonText }}
      </AppButton>
    </template>
  </BaseDialog>
</template>

<style lang="scss" scoped>
.wizard-dialog {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.wizard-dialog__steps {
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-subtle);
}

.wizard-dialog__form {
  :deep(.app-form-item:last-child) {
    margin-bottom: 0;
  }
}

.wizard-dialog__tfa-setup {
  display: flex;
  align-items: stretch;
  gap: 18px;
}

.wizard-dialog__qr-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wizard-dialog__qr-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 156px;
  height: 156px;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--app-radius-md);
  background: var(--bg-primary);
}

.wizard-dialog__qr-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.wizard-dialog__qr-placeholder {
  color: var(--text-tertiary);
}

.wizard-dialog__tfa-info {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
}

.wizard-dialog__panel-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-primary);
}

.wizard-dialog__panel-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.wizard-dialog__secret-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--app-radius-sm);
  background: var(--surface-subtle);
}

.wizard-dialog__secret-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-tertiary);
}

.wizard-dialog__secret-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.wizard-dialog__secret-code {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12.5px;
  color: var(--text-primary);
}

.wizard-dialog__tfa-verify {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.wizard-dialog__tfa-verify-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wizard-dialog__otp-form {
  :deep(.app-form-item) {
    margin-bottom: 0;
  }
}

.wizard-dialog__otp-box {
  display: flex;
  justify-content: center;
  padding: 16px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--app-radius-md);
  background: var(--surface-subtle);
}

.wizard-dialog__otp-item {
  :deep(.app-form-item__error) {
    text-align: center;
  }
}

.wizard-dialog__verify {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

@include mobile {
  .wizard-dialog__tfa-setup {
    flex-direction: column;
  }

  .wizard-dialog__qr-box {
    width: 148px;
    height: 148px;
  }
}
</style>
