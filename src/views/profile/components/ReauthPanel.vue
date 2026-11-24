<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ReauthMethod } from '@/types/api'
import type { FormInstance, FormRules } from '@/types/form'

type ReauthStep = ReauthMethod | 'totp'

type OtpInputInstance = {
  focusFirst?: () => void
  clear?: () => void
}

const props = withDefaults(
  defineProps<{
    step: ReauthStep
    form: {
      password: string
      totp_code: string
    }
    title?: string
    description?: string
    passwordRules?: FormRules
    totpRules?: FormRules
    passkeySupported: boolean
    canSwitchToPasskey: boolean
    canSwitchToPassword: boolean
    busy?: boolean
  }>(),
  {
    title: undefined,
    description: undefined,
    passwordRules: undefined,
    totpRules: undefined,
    busy: false
  }
)

const emit = defineEmits<{
  submit: []
  'switch-method': [method: ReauthMethod]
  'otp-complete': []
  'update:password': [value: string]
  'update:totpCode': [value: string]
}>()

const { t } = useI18n()

const passwordFormRef = ref<FormInstance>()
const totpFormRef = ref<FormInstance>()
const otpInputRef = ref<OtpInputInstance | null>(null)

const resolvedTitle = computed(() => {
  if (props.title) {
    return props.title
  }
  if (props.step === 'passkey') {
    return t('profile.reauth.passkeyTitle')
  }
  if (props.step === 'totp') {
    return t('profile.reauth.totpTitle')
  }
  return t('profile.reauth.passwordTitle')
})

const resolvedDescription = computed(() => {
  if (props.description) {
    return props.description
  }
  if (props.step === 'passkey') {
    return t('profile.reauth.passkeyDesc')
  }
  if (props.step === 'totp') {
    return t('profile.reauth.totpDesc')
  }
  return t('profile.reauth.passwordDesc')
})

const resolvedPasswordRules = computed<FormRules>(() => props.passwordRules ?? {
  password: [{ required: true, message: t('oauth.bind.validation.passwordRequired'), trigger: 'blur' }]
})

const resolvedTotpRules = computed<FormRules>(() => props.totpRules ?? {
  totp_code: [
    { required: true, message: t('login.validation.codeRequired'), trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        const code = typeof value === 'string' ? value : ''
        if (!/^\d{6}$/.test(code)) {
          callback(new Error(t('login.validation.codeInvalid')))
          return
        }
        callback()
      },
      trigger: ['blur', 'change']
    }
  ]
})

const stepIcon = computed(() => {
  if (props.step === 'passkey') {
    return 'KeyRound'
  }
  if (props.step === 'totp') {
    return 'ShieldCheck'
  }
  return 'Lock'
})

async function validate() {
  if (props.step === 'passkey') {
    return true
  }

  if (props.step === 'totp') {
    return await totpFormRef.value?.validate() ?? false
  }

  return await passwordFormRef.value?.validate() ?? false
}

function clearValidate() {
  passwordFormRef.value?.clearValidate?.()
  totpFormRef.value?.clearValidate?.()
}

function focusOtp() {
  if (props.step === 'totp') {
    otpInputRef.value?.focusFirst?.()
  }
}

function clearOtp() {
  otpInputRef.value?.clear?.()
}

defineExpose({
  validate,
  clearValidate,
  focusOtp,
  clearOtp
})
</script>

<template>
  <div class="reauth-panel">
    <div class="reauth-panel__header">
      <div class="reauth-panel__title-group">
        <span class="reauth-panel__badge">
          <AppIcon
            :name="stepIcon"
            :size="15"
          />
        </span>
        <div class="reauth-panel__heading">
          <h4 class="reauth-panel__title">
            {{ resolvedTitle }}
          </h4>
          <p class="reauth-panel__desc">
            {{ resolvedDescription }}
          </p>
        </div>
      </div>

      <AppButton
        v-if="props.canSwitchToPasskey"
        variant="ghost"
        size="sm"
        class="reauth-panel__switch"
        :disabled="props.busy"
        @click="emit('switch-method', 'passkey')"
      >
        {{ t('profile.reauth.switchToPasskey') }}
      </AppButton>
      <AppButton
        v-else-if="props.canSwitchToPassword"
        variant="ghost"
        size="sm"
        class="reauth-panel__switch"
        :disabled="props.busy"
        @click="emit('switch-method', 'password')"
      >
        {{ t('profile.reauth.switchToPassword') }}
      </AppButton>
    </div>

    <div
      v-if="props.step === 'passkey'"
      class="reauth-panel__passkey-box"
    >
      <div class="reauth-panel__passkey-icon">
        <AppIcon
          name="Fingerprint"
          :size="20"
        />
      </div>
      <div class="reauth-panel__passkey-body">
        <p class="reauth-panel__passkey-text">
          {{ props.passkeySupported ? t('passkey.loginHint') : t('passkey.unsupported') }}
        </p>
      </div>
    </div>

    <AppForm
      v-else-if="props.step === 'totp'"
      ref="totpFormRef"
      :model="props.form"
      :rules="resolvedTotpRules"
      class="reauth-panel__form"
      @submit.prevent="emit('submit')"
    >
      <AppFormItem
        prop="totp_code"
        class="reauth-panel__otp-item"
      >
        <div class="reauth-panel__otp-box">
          <OtpCodeInput
            ref="otpInputRef"
            :model-value="props.form.totp_code"
            :disabled="props.busy"
            @update:model-value="emit('update:totpCode', $event)"
            @complete="emit('otp-complete')"
          />
        </div>
      </AppFormItem>
    </AppForm>

    <AppForm
      v-else
      ref="passwordFormRef"
      :model="props.form"
      :rules="resolvedPasswordRules"
      class="reauth-panel__form"
      @submit.prevent="emit('submit')"
    >
      <AppFormItem prop="password">
        <AppInput
          :model-value="props.form.password"
          type="password"
          show-password
          prefix-icon="Lock"
          :placeholder="t('profile.reauth.passwordPlaceholder')"
          @update:model-value="emit('update:password', String($event ?? ''))"
          @enter="emit('submit')"
        />
      </AppFormItem>
    </AppForm>
  </div>
</template>

<style lang="scss" scoped>
.reauth-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--app-radius-md);
  background: var(--surface-subtle);
}

.reauth-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.reauth-panel__title-group {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}

.reauth-panel__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-top: 1px;
  flex-shrink: 0;
  border-radius: var(--app-radius-sm);
  background: var(--primary-subtle);
  color: var(--primary-text);
}

.reauth-panel__heading {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.reauth-panel__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-primary);
}

.reauth-panel__desc {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.reauth-panel__switch {
  flex-shrink: 0;
  color: var(--primary-text);
}

.reauth-panel__passkey-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--app-radius-sm);
  background: var(--bg-primary);
}

.reauth-panel__passkey-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: var(--app-radius-sm);
  background: var(--primary-subtle);
  color: var(--primary-text);
}

.reauth-panel__passkey-body {
  min-width: 0;
}

.reauth-panel__passkey-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.reauth-panel__form {
  :deep(.app-form-item) {
    margin-bottom: 0;
  }
}

.reauth-panel__otp-box {
  display: flex;
  justify-content: center;
  padding: 14px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--app-radius-sm);
  background: var(--bg-primary);
}

.reauth-panel__otp-item {
  :deep(.app-form-item__error) {
    text-align: center;
  }
}

@include mobile {
  .reauth-panel__header {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
