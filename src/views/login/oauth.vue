<script setup lang="ts">
import { ref, onMounted, reactive, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import { notify } from '@/utils/notify'
import type { FormInstance, FormRules } from '@/types/form'
import { useI18n } from 'vue-i18n'
import { isHandledHttpError } from '@/utils/httpError'
import { confirmOAuthBind, reauthLocal } from '@/api/auth'
import type { OAuthProfilePreview } from '@/types/api'
import CryptoJS from 'crypto-js'
import AuthPageShell from '@/components/AuthPageShell/index.vue'
import AppBrandMark from '@/components/AppBrandMark/index.vue'
import type { KnownOAuthProvider } from '@/utils/oauthProvider'

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
            const code = typeof value === 'string' ? value : ''
            if (!/^\d{6}$/.test(code)) {
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
      notify.success(t('oauth.success'))
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
  } catch (error: unknown) {
    console.error('Login error:', error)
    const message = error instanceof Error ? error.message : ''
    if (isHandledHttpError(error)) {
      errorMsg.value = message || t('oauth.exception')
      setTimeout(() => {
        router.push('/login')
      }, 1500)
      return
    }

    handleError(message || t('oauth.exception'))
  }
})

function resolveOAuthType(type: unknown, state: string): KnownOAuthProvider | '' {
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
  notify.error(msg)
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

function toggleSyncField(field: string, checked: boolean) {
  if (checked) {
    if (!selectedSyncFields.value.includes(field)) {
      selectedSyncFields.value = [...selectedSyncFields.value, field]
    }
    return
  }

  selectedSyncFields.value = selectedSyncFields.value.filter((item) => item !== field)
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

  notify.success(t('oauth.bind.success'))
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
    notify.error(t('oauth.bind.ticketMissing'))
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
  } catch (error: unknown) {
    if (!isHandledHttpError(error)) {
      const message = error instanceof Error ? error.message : ''
      notify.error(message || t('oauth.exception'))
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
  <AuthPageShell
    :max-width="showBindDialog ? '480px' : '440px'"
    card-padding="compact"
  >
    <!-- Initial Loading / Error State -->
    <template v-if="!showBindDialog">
      <AppBrandMark class="oauth-brand" />
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
    </template>

    <template v-else>
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
            <AppAvatar
              :size="64"
              :src="oauthProfile.avatar || undefined"
              :alt="oauthProfile.user_name || 'OAuth'"
              :fallback="oauthProfile.user_name?.charAt(0)?.toUpperCase() || 'O'"
              class="oauth-preview__avatar"
            />
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
          <div
            v-if="syncableFields.length > 0"
            class="oauth-sync__group"
          >
            <AppCheckbox
              v-for="field in syncableFields"
              :key="field"
              :model-value="selectedSyncFields.includes(field)"
              :label="getSyncFieldLabel(field)"
              @update:model-value="toggleSyncField(field, $event)"
            />
          </div>
          <div
            v-else
            class="oauth-sync__empty"
          >
            {{ t('oauth.bind.syncEmpty') }}
          </div>
        </div>

        <AppButton
          variant="primary"
          size="lg"
          block
          class="submit-btn"
          @click="handleProfileNext"
        >
          {{ t('common.next') }}
        </AppButton>

        <div class="form-actions profile-actions">
          <AppButton
            variant="link"
            @click="router.push('/login')"
          >
            {{ t('reset.backLogin') }}
          </AppButton>
        </div>
      </template>

      <!-- Step 2: Account Verification & TOTP -->
      <template v-else>
        <AppForm
          ref="bindFormRef"
          :model="bindForm"
          :rules="bindRules"
          class="login-form"
          @keyup.enter="handleBindSubmit"
        >
          <template v-if="bindStep === 'credentials'">
            <AppFormItem prop="identifier">
              <AppInput
                v-model="bindForm.identifier"
                size="lg"
                :placeholder="t('oauth.bind.identifierPlaceholder')"
                clearable
              />
            </AppFormItem>

            <AppFormItem prop="password">
              <AppInput
                v-model="bindForm.password"
                size="lg"
                type="password"
                :placeholder="t('oauth.bind.password')"
                show-password
                clearable
              />
            </AppFormItem>
          </template>

          <template v-else>
            <AppFormItem
              prop="totp_code"
              class="totp-form-item"
            >
              <OtpCodeInput
                ref="bindOtpInputRef"
                v-model="bindForm.totp_code"
                :length="6"
                @complete="handleBindOtpComplete"
              />
            </AppFormItem>
          </template>

          <AppButton
            variant="primary"
            size="lg"
            block
            :loading="bindLoading"
            :disabled="!canSubmitBind"
            class="submit-btn"
            @click="handleBindSubmit"
          >
            {{ bindStep === 'totp' ? t('login.submitTotp') : t('common.next') }}
          </AppButton>

          <div class="form-actions">
            <AppButton
              variant="link"
              @click="router.push('/login')"
            >
              {{ t('reset.backLogin') }}
            </AppButton>
          </div>
        </AppForm>
      </template>
    </template>
  </AuthPageShell>
</template>

<style lang="scss" scoped>
.oauth-brand {
  margin-bottom: 24px;
}

.oauth-bind-header {
  margin-bottom: 24px;
  text-align: left;

  .bind-info-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .bind-alert-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .bind-alert-desc {
    font-size: 13.5px;
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0;
  }
}

.error-message {
  color: var(--data-badge-danger-text);
  font-size: 14px;
  padding: 16px 0;
}

.loading-message {
  color: var(--text-secondary);
  font-size: 14px;
  padding: 16px 0;
}

.oauth-preview {
  margin-bottom: 24px;
  padding: 16px;
  border-radius: var(--app-radius-md);
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
  text-align: left;
}

.oauth-preview__title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-tertiary);
  margin-bottom: 12px;
}

.oauth-preview__content {
  display: flex;
  align-items: center;
  gap: 14px;
}

.oauth-preview__avatar {
  border: 1px solid var(--data-badge-info-border);
  background: var(--primary-subtle);
  color: var(--primary-text);
  font-weight: 700;
  box-shadow: none;
  flex-shrink: 0;
}

.oauth-preview__meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.oauth-preview__meta strong,
.oauth-preview__meta span {
  @include text-ellipsis;
}

.oauth-preview__meta strong {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.oauth-preview__meta span {
  font-size: 12.5px;
  color: var(--text-tertiary);
}

.oauth-sync {
  margin-bottom: 24px;
  text-align: left;
}

.oauth-sync__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.oauth-sync__group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oauth-sync__empty {
  font-size: 13px;
  color: var(--text-tertiary);
}

.submit-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  border-radius: var(--app-radius-sm);
  letter-spacing: 0.5px;
  margin-top: 8px;
  box-shadow: none;
}

.login-form {
  text-align: left;

  :deep(.app-input__inner) {
    font-size: 14px;
  }

  .totp-form-item {
    margin-top: 10px;
    margin-bottom: 24px;

    :deep(.app-form-item__content) {
      justify-content: space-between;
    }

    :deep(.otp-code-input) {
      width: 100%;
      max-width: none;
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
  margin-top: 14px;
}

.form-actions {
  display: flex;
  justify-content: center;
  margin-top: 14px;
  gap: 14px;
}
</style>
