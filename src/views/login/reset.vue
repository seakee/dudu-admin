<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Lock } from '@element-plus/icons-vue'
import CryptoJS from 'crypto-js'
import { resetPassword } from '@/api/auth'
import { useI18n } from 'vue-i18n'
import { isHandledHttpError } from '@/utils/httpError'

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
    ElMessage.error(t('reset.error.safeCodeMissing'))
    router.replace('/login')
  }
})

async function handleReset() {
  const valid = await formRef.value?.validate()
  if (valid === false) return

  if (!safeCode.value) {
    ElMessage.error(t('reset.error.safeCodeMissing'))
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
      ElMessage.success(t('reset.success'))
      router.push('/login')
    } else {
      throw new Error(data.msg || t('reset.error.failed'))
    }
  } catch (error: any) {
    if (!isHandledHttpError(error)) {
      ElMessage.error(error.message || t('reset.error.failed'))
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
  <div class="reset-wrapper">
    <PageCard class="reset-card">
      <h2>{{ t('reset.title') }}</h2>
      <p class="tips">
        {{ t('reset.tips') }}
      </p>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="reset-form"
      >
        <el-form-item
          :label="t('reset.password')"
          prop="password"
        >
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :prefix-icon="Lock"
          />
        </el-form-item>
        <el-form-item
          :label="t('reset.confirmPassword')"
          prop="confirmPassword"
        >
          <el-input
            v-model="form.confirmPassword"
            type="password"
            show-password
            :prefix-icon="Lock"
          />
        </el-form-item>
      </el-form>
      <div class="actions">
        <el-button @click="handleBack">
          {{ t('reset.backLogin') }}
        </el-button>
        <el-button
          type="primary"
          :loading="loading"
          @click="handleReset"
        >
          {{ t('reset.confirm') }}
        </el-button>
      </div>
    </PageCard>
  </div>
</template>

<style scoped>
.reset-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
}

.reset-card {
  width: 100%;
  max-width: 420px;
}

.reset-card :deep(.el-card__body) {
  padding: 32px 28px;
}

.reset-card h2 {
  margin: 0 0 10px;
  font-size: 24px;
  font-weight: 700;
  color: var(--app-text-primary);
}

.tips {
  margin: 0 0 24px;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.reset-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.reset-form :deep(.el-form-item__label) {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-regular);
}

.reset-form :deep(.el-input__wrapper) {
  min-height: 48px;
  padding: 0 14px;
  border-radius: 12px;
  background-color: var(--app-surface-muted);
  border: 1px solid var(--app-border);
  box-shadow: none;
  transition: all 0.25s ease;
}

.reset-form :deep(.el-input__wrapper:hover) {
  background-color: var(--app-surface-strong);
}

.reset-form :deep(.el-input__wrapper.is-focus) {
  background-color: var(--app-surface-strong);
  box-shadow: 0 0 0 1px var(--el-color-primary) inset !important;
}

.reset-form :deep(.el-input__inner) {
  font-size: 15px;
  letter-spacing: 0.2px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.actions :deep(.el-button) {
  min-width: 96px;
  height: 40px;
  border-radius: 10px;
  font-weight: 600;
}

.actions :deep(.el-button--primary) {
  background: var(--primary-gradient);
  border: none;
  box-shadow: 0 6px 14px rgba(102, 126, 234, 0.28);
}

.actions :deep(.el-button--primary:hover) {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(102, 126, 234, 0.35);
}

@media (max-width: 640px) {
  .reset-card :deep(.el-card__body) {
    padding: 26px 20px;
  }

  .actions {
    justify-content: center;
    margin-top: 12px;
  }
}
</style>
