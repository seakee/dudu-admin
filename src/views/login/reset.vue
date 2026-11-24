<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { notify } from '@/utils/notify'
import type { FormInstance, FormRules } from '@/types/form'
import CryptoJS from 'crypto-js'
import { resetPassword } from '@/api/auth'
import { useI18n } from 'vue-i18n'
import { isHandledHttpError } from '@/utils/httpError'
import AuthPageShell from '@/components/AuthPageShell/index.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const formRef = ref<FormInstance>()
const loading = ref(false)
const safeCode = ref('')

const form = reactive({
  password: '',
  confirmPassword: ''
})

const rules = computed<FormRules>(() => ({
  password: [{ required: true, message: t('reset.validation.passwordRequired'), trigger: 'blur' }],
  confirmPassword: [
    { required: true, message: t('reset.validation.confirmRequired'), trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== form.password) {
          callback(new Error(t('reset.validation.passwordMismatch')))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}))

onMounted(() => {
  const code = route.query.safe_code
  if (typeof code === 'string' && code) {
    safeCode.value = code
  } else {
    notify.error(t('reset.error.safeCodeMissing'))
    router.replace('/login')
  }
})

async function handleReset() {
  const valid = await formRef.value?.validate()
  if (valid === false) return

  if (!safeCode.value) {
    notify.error(t('reset.error.safeCodeMissing'))
    return
  }

  loading.value = true
  try {
    const encryptedPassword = CryptoJS.MD5(form.password).toString()
    const { data } = await resetPassword({
      safe_code: safeCode.value,
      password: encryptedPassword
    })

    if (data.code === 0) {
      notify.success(t('reset.success'))
      router.push('/login')
    } else {
      throw new Error(data.msg || t('reset.error.failed'))
    }
  } catch (error: unknown) {
    if (!isHandledHttpError(error)) {
      const message = error instanceof Error ? error.message : ''
      notify.error(message || t('reset.error.failed'))
    }
  } finally {
    loading.value = false
  }
}

function handleBack() {
  router.push('/login')
}
</script>

<template>
  <AuthPageShell
    max-width="420px"
    card-padding="compact"
    :centered="false"
  >
    <h2 class="reset-title">
      {{ t('reset.title') }}
    </h2>
    <p class="tips">
      {{ t('reset.tips') }}
    </p>
    <AppForm
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="reset-form"
      @keyup.enter="handleReset"
    >
      <AppFormItem
        :label="t('reset.password')"
        prop="password"
      >
        <AppInput
          v-model="form.password"
          size="lg"
          type="password"
          show-password
          prefix-icon="Lock"
        />
      </AppFormItem>
      <AppFormItem
        :label="t('reset.confirmPassword')"
        prop="confirmPassword"
      >
        <AppInput
          v-model="form.confirmPassword"
          size="lg"
          type="password"
          show-password
          prefix-icon="Lock"
        />
      </AppFormItem>
    </AppForm>
    <div class="actions">
      <AppButton @click="handleBack">
        {{ t('reset.backLogin') }}
      </AppButton>
      <AppButton
        variant="primary"
        :loading="loading"
        @click="handleReset"
      >
        {{ t('reset.confirm') }}
      </AppButton>
    </div>
  </AuthPageShell>
</template>

<style lang="scss" scoped>
.reset-title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}

.tips {
  margin: 0 0 24px;
  color: var(--text-tertiary);
  font-size: 13px;
  line-height: 1.6;
}

.reset-form {
  :deep(.app-form-item) {
    margin-bottom: 18px;
  }

  :deep(.app-form-item__label) {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  :deep(.app-input__inner) {
    font-size: 14px;
  }
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;

  :deep(.btn) {
    min-width: 96px;
    height: var(--control-height-md);
    border-radius: var(--app-radius-sm);
    font-weight: 600;
    box-shadow: none;
  }

  @include mobile {
    justify-content: stretch;
    margin-top: 12px;

    :deep(.btn) {
      flex: 1;
    }
  }
}
</style>
