<script setup lang="ts">
import { Key, Lock } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { ReauthMethod } from '@/types/api'
import OtpCodeInput from '@/components/OtpCodeInput/index.vue'

type ReauthStep = ReauthMethod | 'totp'

interface ReauthState {
  methodsLoading: boolean
  step: ReauthStep
  availableMethods: ReauthMethod[]
  hasPasskeyMethod: boolean
  hasPasswordMethod: boolean
  passkeySupported: boolean
}

const props = withDefaults(defineProps<{
  model: ReauthState
  password: string
  totpCode: string
  title: string
  description: string
  unavailableText: string
  passwordPlaceholder: string
  passwordRules: FormRules
  totpRules: FormRules
  showIcon?: boolean
}>(), {
  showIcon: false
})

const emit = defineEmits<{
  'switch-method': [method: ReauthMethod]
  'otp-complete': []
  'update:password': [value: string]
  'update:totpCode': [value: string]
}>()

const formRef = ref<FormInstance>()
const otpInputRef = ref<{
  focusFirst?: () => void
  clear?: () => void
} | null>(null)

const passwordModel = computed({
  get: () => props.password,
  set: (value: string) => emit('update:password', value)
})

const totpCodeModel = computed({
  get: () => props.totpCode,
  set: (value: string) => emit('update:totpCode', value)
})

const formModel = computed(() => ({
  password: props.password,
  totp_code: props.totpCode
}))

async function validate() {
  if (props.model.step === 'passkey') {
    return true
  }

  const valid = await formRef.value?.validate()
  return valid !== false
}

function clearValidate() {
  formRef.value?.clearValidate()
}

function focusOtp() {
  if (props.model.step === 'totp') {
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
  <div
    v-loading="props.model.methodsLoading"
    class="reauth-panel"
  >
    <div
      v-if="props.showIcon"
      class="reauth-panel__icon"
    >
      <el-icon><Key /></el-icon>
    </div>

    <div class="reauth-panel__copy">
      <h4>{{ props.title }}</h4>
      <p v-if="props.model.step !== 'passkey'">
        {{ props.description }}
      </p>
    </div>

    <el-empty
      v-if="!props.model.methodsLoading && props.model.availableMethods.length === 0"
      :description="props.unavailableText"
      class="reauth-panel__empty"
    />

    <div
      v-else-if="props.model.step === 'passkey'"
      class="reauth-panel__passkey"
    >
      <div class="reauth-panel__passkey-card">
        <el-icon><Key /></el-icon>
        <span>{{ props.description }}</span>
      </div>
    </div>

    <el-form
      v-else
      ref="formRef"
      :model="formModel"
      :rules="props.model.step === 'totp' ? props.totpRules : props.passwordRules"
      class="reauth-panel__form"
      @submit.prevent
    >
      <el-form-item
        v-if="props.model.step === 'password'"
        prop="password"
      >
        <el-input
          v-model="passwordModel"
          type="password"
          show-password
          :placeholder="props.passwordPlaceholder"
          :prefix-icon="Lock"
          class="reauth-panel__password-input"
          size="large"
        />
      </el-form-item>

      <el-form-item
        v-else
        prop="totp_code"
        class="reauth-panel__otp-item"
      >
        <OtpCodeInput
          ref="otpInputRef"
          v-model="totpCodeModel"
          :length="6"
          @complete="emit('otp-complete')"
        />
      </el-form-item>
    </el-form>

    <div
      v-if="props.model.step !== 'passkey' && props.model.hasPasskeyMethod && props.model.passkeySupported"
      class="reauth-panel__switch"
    >
      <el-button
        link
        @click="emit('switch-method', 'passkey')"
      >
        {{ $t('profile.reauth.switchToPasskey') }}
      </el-button>
    </div>

    <div
      v-else-if="props.model.step === 'passkey' && props.model.hasPasswordMethod"
      class="reauth-panel__switch"
    >
      <el-button
        link
        @click="emit('switch-method', 'password')"
      >
        {{ $t('profile.reauth.switchToPassword') }}
      </el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.reauth-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  text-align: center;
}

.reauth-panel__icon {
  display: inline-flex;
  height: 56px;
  width: 56px;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  background: var(--app-accent-soft);
  color: var(--el-color-primary);
  font-size: 28px;
}

.reauth-panel__copy {
  display: flex;
  flex-direction: column;
  gap: 8px;

  h4 {
    margin: 0;
    font-size: 20px;
    color: var(--app-text-primary);
  }

  p {
    margin: 0;
    line-height: 1.6;
    color: var(--app-text-regular);
  }
}

.reauth-panel__empty,
.reauth-panel__form,
.reauth-panel__passkey {
  width: 100%;
}

.reauth-panel__passkey-card {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: 16px;
  border: 1px dashed var(--app-border-strong);
  background: var(--app-surface-muted);
  padding: 18px 16px;
  color: var(--app-text-regular);
  line-height: 1.5;
}

.reauth-panel__password-input {
  :deep(.el-input__wrapper) {
    min-height: 52px;
    border-radius: 14px;
    padding: 0 14px;
    background-color: var(--app-surface-muted);
    box-shadow: none;
    border: 1px solid var(--app-border);
    transition: all 0.3s;
    
    &:hover {
        background-color: var(--app-surface-strong);
    }

    &.is-focus {
      background-color: var(--app-surface-strong);
      box-shadow: 0 0 0 2px var(--el-color-primary) inset !important;
    }
  }

  :deep(.el-input__inner) {
    font-size: 15px;
  }
}

.reauth-panel__otp-item {
  margin-bottom: 18px;

  :deep(.el-form-item__content) {
    justify-content: center;
  }

  :deep(.el-form-item__error) {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    padding-top: 10px;
    text-align: center;
    font-size: 13px;
  }
}

.reauth-panel__switch {
  display: flex;
  justify-content: center;
}
</style>
