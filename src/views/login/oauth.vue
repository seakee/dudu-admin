<script setup lang="ts">
import { ref, onMounted, reactive, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { isHandledHttpError } from '@/utils/httpError'
import { confirmOAuthBind, reauthLocal } from '@/api/auth'
import type { OAuthProfilePreview } from '@/types/api'
import CryptoJS from 'crypto-js'
import ThemeSelect from '@/components/ThemeSelect/index.vue'
import LocaleSelect from '@/components/LocaleSelect/index.vue'

const OAUTH_STATE_MAP_KEY = 'admin-oauth-state-map'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const errorMsg = ref('')
const bindTicket = ref('')
const oauthProfile = ref<OAuthProfilePreview | null>(null)
const syncableFields = ref<string[]>([])
const selectedSyncFields = ref<string[]>([])
const bindLoading = ref(false)
const bindStep = ref<'profile' | 'credentials' | 'totp'>('profile')
const bindSafeCode = ref('')
const bindFormRef = ref<FormInstance>()
const bindOtpInputRef = ref<{
  focusFirst?: () => void
  clear?: () => void
} | null>(null)
const bindForm = reactive({
  identifier: '',
  password: '',
  totp_code: ''
})

const showBindDialog = ref(false)

const bindRules = computed<FormRules>(() => {
  if (bindStep.value === 'totp') {
    return {
      totp_code: [
        { required: true, message: t('login.validation.codeRequired'), trigger: 'blur' },
        {
          validator: (_rule, value, callback) => {
            if (!/^\d{6}$/.test(value || '')) {
              callback(new Error(t('login.validation.codeInvalid')))
            } else {
              callback()
            }
          },
          trigger: ['blur', 'change']
        }
      ]
    }
  }

  return {
    identifier: [{ required: true, message: t('oauth.bind.validation.identifierRequired'), trigger: 'blur' }],
    password: [{ required: true, message: t('oauth.bind.validation.passwordRequired'), trigger: 'blur' }]
  }
})

const canSubmitBind = computed(() => {
  if (bindStep.value === 'totp') {
    return /^\d{6}$/.test(bindForm.totp_code || '')
  }

  return !!bindForm.identifier.trim() && !!bindForm.password
})

onMounted(async () => {
  const { code, state, type } = route.query
  const oauthState = typeof state === 'string' ? state : ''
  const oauthType = resolveOAuthType(type, oauthState)

  if (!code || !oauthType) {
    handleError(t('oauth.missingParams'))
    return
  }

  try {
    const result = await authStore.login({
      grant_type: oauthType,
      credentials: code as string,
      state: oauthState,
      identifier: ''
    })

    if (result.code === 0 && result.data?.token) {
      clearOAuthState(oauthState)
      ElMessage.success(t('oauth.success'))
      router.push('/')
      return
    }

    if (result.code === 11042) {
      clearOAuthState(oauthState)

      if (!result.data?.bind_ticket) {
        throw new Error(t('oauth.bind.ticketMissing'))
      }

      bindTicket.value = result.data.bind_ticket
      oauthProfile.value = result.data.oauth_profile || null
      syncableFields.value = result.data.syncable_fields || []
      selectedSyncFields.value = [...syncableFields.value]
      showBindDialog.value = true
      return
    }

    handleError(result.msg || t('oauth.accountNotBound'))
  } catch (error: any) {
    console.error('Login error:', error)
    if (isHandledHttpError(error)) {
      errorMsg.value = error.message || t('oauth.exception')
      setTimeout(() => {
        router.push('/login')
      }, 1500)
      return
    }

    handleError(error.message || t('oauth.exception'))
  }
})

function resolveOAuthType(type: unknown, state: string): 'feishu' | 'wechat' | '' {
  if (type === 'feishu' || type === 'wechat') {
    return type
  }

  if (!state) {
    return ''
  }

  try {
    const rawMap = sessionStorage.getItem(OAUTH_STATE_MAP_KEY)
    if (!rawMap) {
      return ''
    }

    const stateMap = JSON.parse(rawMap) as Record<string, string>
    const mappedType = stateMap[state]
    if (mappedType === 'feishu' || mappedType === 'wechat') {
      return mappedType
    }
  } catch {
    // ignore
  }

  return ''
}

function clearOAuthState(state: string) {
  if (!state) {
    return
  }

  try {
    const rawMap = sessionStorage.getItem(OAUTH_STATE_MAP_KEY)
    if (!rawMap) {
      return
    }

    const stateMap = JSON.parse(rawMap) as Record<string, string>
    delete stateMap[state]
    sessionStorage.setItem(OAUTH_STATE_MAP_KEY, JSON.stringify(stateMap))
  } catch {
    // ignore
  }
}

function handleError(msg: string) {
  errorMsg.value = msg
  ElMessage.error(msg)
  setTimeout(() => {
    router.push('/login')
  }, 1500)
}

function resetBindForm() {
  bindStep.value = 'profile'
  bindSafeCode.value = ''
  bindForm.identifier = ''
  bindForm.password = ''
  bindForm.totp_code = ''
  selectedSyncFields.value = [...syncableFields.value]
  nextTick(() => {
    bindOtpInputRef.value?.clear?.()
  })
}

function getSyncFieldLabel(field: string) {
  if (field === 'user_name') {
    return t('oauth.bind.syncUserName')
  }

  if (field === 'avatar') {
    return t('oauth.bind.syncAvatar')
  }

  return field
}

function focusBindTotp() {
  nextTick(() => {
    bindFormRef.value?.clearValidate()
    bindOtpInputRef.value?.focusFirst?.()
  })
}

function handleProfileNext() {
  bindStep.value = 'credentials'
}

async function completeOAuthBind(reauthTicket: string) {
  const { data } = await confirmOAuthBind({
    bind_ticket: bindTicket.value,
    reauth_ticket: reauthTicket,
    sync_fields: selectedSyncFields.value
  })

  if (!data.data || !authStore.applySession(data.data)) {
    throw new Error(t('oauth.exception'))
  }

  ElMessage.success(t('oauth.bind.success'))
  resetBindForm()
  showBindDialog.value = false
  router.replace('/')
}

async function handleBindSubmit() {
  if (bindLoading.value) {
    return
  }

  if (bindStep.value === 'totp') {
    bindForm.totp_code = bindForm.totp_code.replace(/\D/g, '').slice(0, 6)
  }

  const valid = await bindFormRef.value?.validate()
  if (valid === false) return

  if (!bindTicket.value) {
    ElMessage.error(t('oauth.bind.ticketMissing'))
    return
  }

  bindLoading.value = true
  try {
    const reauthResponse = bindStep.value === 'totp'
      ? await reauthLocal({
          safe_code: bindSafeCode.value,
          totp_code: bindForm.totp_code
        })
      : await reauthLocal({
          identifier: bindForm.identifier.trim(),
          password: CryptoJS.MD5(bindForm.password).toString()
        })

    if (reauthResponse.data.code === 11028) {
      const safeCode = reauthResponse.data.data?.safe_code
      if (!safeCode) {
        throw new Error(t('login.error.safeCodeMissing'))
      }

      bindStep.value = 'totp'
      bindSafeCode.value = safeCode
      bindForm.password = ''
      bindForm.totp_code = ''
      focusBindTotp()
      return
    }

    const reauthTicket = reauthResponse.data.data?.reauth_ticket
    if (!reauthTicket) {
      throw new Error(t('oauth.exception'))
    }

    await completeOAuthBind(reauthTicket)
  } catch (error: any) {
    if (!isHandledHttpError(error)) {
      ElMessage.error(error.message || t('oauth.exception'))
    }
  } finally {
    bindLoading.value = false
  }
}

async function handleBindOtpComplete() {
  if (bindStep.value !== 'totp' || !canSubmitBind.value || bindLoading.value) {
    return
  }

  await handleBindSubmit()
}
</script>

<template>
  <div class="login-wrapper">
    <div class="login-tools">
      <ThemeSelect class="login-tool" />
      <LocaleSelect
        class="login-tool"
        icon-only
      />
    </div>
    
    <div class="login-content">
      <div class="login-form-container">
        <!-- Initial Loading / Error State -->
        <PageCard
          v-if="!showBindDialog"
          class="login-card"
        >
          <div class="card-branding">
            <div class="logo-icon">
              D
            </div>
            <h1>Dudu Admin</h1>
          </div>
          <div
            v-if="errorMsg"
            class="error-message"
          >
            {{ errorMsg }}
          </div>
          <div
            v-else
            class="loading-message"
          >
            {{ t('oauth.loading') }}
          </div>
        </PageCard>

        <PageCard
          v-else
          class="login-card oauth-bind-card"
        >
          <!-- Info Header Section -->
          <div class="oauth-bind-header">
            <div class="bind-info-content">
              <h2 class="bind-alert-title">
                <template v-if="bindStep === 'profile'">
                  {{ t('oauth.bind.step1Title') }}
                </template>
                <template v-else-if="bindStep === 'credentials'">
                  {{ t('oauth.bind.step2Title') }}
                </template>
                <template v-else>
                  {{ t('oauth.bind.step3Title') }}
                </template>
              </h2>
              <p class="bind-alert-desc">
                <template v-if="bindStep === 'profile'">
                  {{ t('oauth.bind.step1Desc') }}
                </template>
                <template v-else-if="bindStep === 'credentials'">
                  {{ t('oauth.bind.step2Desc') }}
                </template>
                <template v-else>
                  {{ t('oauth.bind.step3Desc') }}
                </template>
              </p>
            </div>
          </div>

          <!-- Step 1: Profile and Sync Fields -->
          <template v-if="bindStep === 'profile'">
            <div
              v-if="oauthProfile"
              class="oauth-preview"
            >
              <div class="oauth-preview__title">
                {{ t('oauth.bind.profilePreview') }}
              </div>
              <div class="oauth-preview__content">
                <el-avatar
                  :size="64"
                  :src="oauthProfile.avatar || undefined"
                  class="oauth-preview__avatar"
                >
                  {{ oauthProfile.user_name?.charAt(0)?.toUpperCase() || 'O' }}
                </el-avatar>
                <div class="oauth-preview__meta">
                  <strong>{{ oauthProfile.user_name || '-' }}</strong>
                  <span>{{ oauthProfile.avatar || '-' }}</span>
                </div>
              </div>
            </div>

            <div class="oauth-sync">
              <div class="oauth-sync__title">
                {{ t('oauth.bind.syncFields') }}
              </div>
              <el-checkbox-group
                v-if="syncableFields.length > 0"
                v-model="selectedSyncFields"
                class="oauth-sync__group"
              >
                <el-checkbox
                  v-for="field in syncableFields"
                  :key="field"
                  :label="field"
                  :value="field"
                >
                  {{ getSyncFieldLabel(field) }}
                </el-checkbox>
              </el-checkbox-group>
              <div
                v-else
                class="oauth-sync__empty"
              >
                {{ t('oauth.bind.syncEmpty') }}
              </div>
            </div>

            <el-button
              type="primary"
              class="submit-btn"
              @click="handleProfileNext"
            >
              {{ t('common.next') }}
            </el-button>

            <div class="form-actions profile-actions">
              <el-button
                link
                @click="router.push('/login')"
              >
                {{ t('reset.backLogin') }}
              </el-button>
            </div>
          </template>

          <!-- Step 2: Account Verification & TOTP -->
          <template v-else>
            <el-form
              ref="bindFormRef"
              :model="bindForm"
              :rules="bindRules"
              class="login-form"
              size="large"
              @keyup.enter="handleBindSubmit"
            >
              <template v-if="bindStep === 'credentials'">
                <el-form-item prop="identifier">
                  <el-input
                    v-model="bindForm.identifier"
                    :placeholder="t('oauth.bind.identifierPlaceholder')"
                    clearable
                  />
                </el-form-item>

                <el-form-item prop="password">
                  <el-input
                    v-model="bindForm.password"
                    type="password"
                    :placeholder="t('oauth.bind.password')"
                    show-password
                    clearable
                  />
                </el-form-item>
              </template>

              <template v-else>
                <el-form-item
                  prop="totp_code"
                  class="totp-form-item"
                >
                  <OtpCodeInput
                    ref="bindOtpInputRef"
                    v-model="bindForm.totp_code"
                    :length="6"
                    @complete="handleBindOtpComplete"
                  />
                </el-form-item>
              </template>

              <el-button
                type="primary"
                :loading="bindLoading"
                :disabled="!canSubmitBind"
                class="submit-btn"
                @click="handleBindSubmit"
              >
                {{ bindStep === 'totp' ? t('login.submitTotp') : t('common.next') }}
              </el-button>
            
              <div class="form-actions">
                <el-button
                  link
                  @click="router.push('/login')"
                >
                  {{ t('reset.backLogin') }}
                </el-button>
              </div>
            </el-form>
          </template>
        </PageCard>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  width: 100%;
  overflow: hidden;
  position: relative;
}

.login-tools {
  position: absolute;
  top: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 20;

  :deep(.theme-select-container),
  :deep(.locale-select-container) {
    width: 36px;
    height: 36px;
    padding: 0;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--app-surface-muted);
    border: 1px solid var(--glass-border);
    color: var(--app-text-regular);
    transition: all 0.3s;
    box-shadow: var(--app-shadow-soft);
  }

  :deep(.theme-select-container:hover),
  :deep(.locale-select-container:hover) {
    background: var(--app-surface-strong);
    color: var(--el-color-primary);
    transform: translateY(-2px);
  }
}

@media (max-width: 640px) {
  .login-tools {
    top: 16px;
    right: 16px;

    :deep(.theme-select-container),
    :deep(.locale-select-container) {
      width: 32px;
      height: 32px;
      border-radius: 8px;
    }
  }
}

.login-content {
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 0 20px;
  position: relative;
  z-index: 10;
}

.login-form-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.login-card {
  width: 100%;
  max-width: 440px;
  animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: center;
  will-change: transform, opacity;
  backface-visibility: hidden;
  transform: translateZ(0);

  &.oauth-bind-card {
     max-width: 480px;
  }
}

.login-card :deep(.el-card__body) {
  padding: 30px 35px;
}

.card-branding {
  margin-bottom: 25px;
  display: flex;
  flex-direction: column;
  align-items: center;

  .logo-icon {
    width: 60px;
    height: 60px;
    background: var(--primary-gradient);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 800;
    margin-bottom: 12px;
    color: #fff;
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
  }

  h1 {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin: 0;
    color: var(--app-text-primary);
  }
}

.oauth-bind-header {
  margin-bottom: 30px;
  text-align: left;
  
  .bind-info-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .bind-alert-title {
    font-size: 22px;
    font-weight: 700;
    color: var(--app-text-primary);
    margin: 0;
  }

  .bind-alert-desc {
    font-size: 14px;
    color: var(--app-text-regular);
    line-height: 1.6;
    margin: 0;
  }
}

.error-message {
  color: var(--el-color-danger);
  font-size: 15px;
  padding: 20px 0;
}

.loading-message {
  color: var(--app-text-regular);
  font-size: 15px;
  padding: 20px 0;
}

.oauth-preview {
  margin-bottom: 30px;
  text-align: left;
}

.oauth-preview__title {
  font-size: 14px;
  font-weight: 500;
  color: var(--app-text-muted);
  margin-bottom: 16px;
}

.oauth-preview__content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.oauth-preview__avatar {
  border: 2px solid var(--app-border);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.oauth-preview__meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.oauth-preview__meta strong,
.oauth-preview__meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oauth-preview__meta strong {
  font-size: 18px;
  font-weight: 600;
  color: var(--app-text-primary);
}

.oauth-preview__meta span {
  font-size: 13px;
  color: var(--app-text-muted);
}

.oauth-sync {
  margin-bottom: 30px;
  text-align: left;
}

.oauth-sync__title {
  font-size: 14px;
  font-weight: 500;
  color: var(--app-text-muted);
  margin-bottom: 16px;
}

.oauth-sync__group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.oauth-sync__empty {
  font-size: 13px;
  color: var(--app-text-muted);
}

.submit-btn {
  width: 100%;
  height: 50px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 10px;
  letter-spacing: 1px;
  margin-top: 15px;
  background: var(--primary-gradient);
  border: none;
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.3);
  color: #fff;
  transition: all 0.3s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
    color: #fff;
  }
  
  &:active {
    transform: translateY(0);
  }
}

.login-form {
  text-align: left;

  :deep(.el-input__wrapper) {
    padding: 10px 15px;
    background-color: var(--app-surface-muted);
    box-shadow: none;
    border: 1px solid var(--app-border);
    border-radius: 10px;
    transition: all 0.3s;
    
    &:hover {
        background-color: var(--app-surface-strong);
    }

    &.is-focus {
      background-color: var(--app-surface-strong);
      box-shadow: 0 0 0 2px var(--el-color-primary) inset !important;
    }
  }

  .totp-form-item {
    margin-top: 10px;
    margin-bottom: 25px;
    :deep(.el-form-item__content) {
      justify-content: space-between;
    }
    :deep(.otp-code-input) {
      width: 100% !important;
      max-width: none !important;
      gap: 12px;
      .otp-code-input__cell {
        max-width: none;
        height: auto;
        aspect-ratio: 1 / 1;
        margin: 0;
      }
    }
  }
}

.profile-actions {
  margin-top: 15px;
}

.reauth-form__hint {
  margin: 10px 0 15px;
  text-align: center;
  font-size: 12px;
  color: var(--app-text-muted);
}

.form-actions {
  display: flex;
  justify-content: center;
  margin-top: 15px;
  gap: 15px;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate3d(0, 40px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}
</style>
