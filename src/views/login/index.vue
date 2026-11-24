<script setup lang="ts">
import { reactive, ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import { notify } from '@/utils/notify'
import type { FormInstance, FormRules } from '@/types/form'
import CryptoJS from 'crypto-js'
import { finishPasskeyLogin, getOAuthUrl, getPasskeyLoginOptions } from '@/api/auth'
import { useI18n } from 'vue-i18n'
import { isHandledHttpError } from '@/utils/httpError'
import { getWebAuthnErrorI18nKey, isWebAuthnSupported, startPasskeyAuthentication } from '@/utils/webauthn'
import AuthPageShell from '@/components/AuthPageShell/index.vue'
import AppBrandMark from '@/components/AppBrandMark/index.vue'
import OAuthProviderIcon from '@/components/OAuthProviderIcon/index.vue'
import type { KnownOAuthProvider } from '@/utils/oauthProvider'

const OAUTH_STATE_MAP_KEY = 'admin-oauth-state-map'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const loginFormRef = ref<FormInstance>()
const loading = ref(false)
const showTotp = ref(false)
const safeCode = ref('')
const passkeySupported = ref(isWebAuthnSupported())

const loginForm = reactive({
  identifier: '',
  password: '',
  totpCode: ''
})


const rules = computed<FormRules>(() => ({
  identifier: [{ required: true, message: t('login.validation.identifierRequired'), trigger: 'blur' }],
  password: [{ required: true, message: t('login.validation.passwordRequired'), trigger: 'blur' }],
  totpCode: [
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
}))

const canSubmit = computed(() => {
  if (showTotp.value) {
    return /^\d{6}$/.test(loginForm.totpCode || '')
  }

  return !!loginForm.identifier.trim() && !!loginForm.password
})

const canUsePasskey = computed(() => !loading.value && passkeySupported.value)


onMounted(() => {
  autoTriggerOAuthLogin()
})

async function handleLogin() {
  if (loading.value || !canSubmit.value) return

  if (showTotp.value) {
    loginForm.totpCode = loginForm.totpCode.replace(/\D/g, '').slice(0, 6)
  }

  const valid = await loginFormRef.value?.validate()
  if (valid === false) return

  loading.value = true
  try {
    // 密码加密
    const encryptedPassword = CryptoJS.MD5(loginForm.password).toString()

    const result = await authStore.login({
      identifier: showTotp.value ? safeCode.value : loginForm.identifier, // TOTP 模式下 identifier 传 safeCode
      credentials: showTotp.value ? loginForm.totpCode : encryptedPassword,
      grant_type: showTotp.value ? 'totp' : 'password'
    })

    const { code, data, msg } = result

    if (code === 0) {
      if (!data?.token) {
        throw new Error(msg || t('login.error.failed'))
      }

      const redirect = route.query.redirect as string | undefined
      router.push(safeDecodeRedirect(redirect))
    } else if (code === 11028) {
      // 需要双因子认证
      if (!data?.safe_code) {
        throw new Error(t('login.error.safeCodeMissing'))
      }
      showTotp.value = true
      safeCode.value = data.safe_code
    } else if (code === 11015) {
      // 需要重置密码
      if (!data?.safe_code) {
        throw new Error(t('login.error.safeCodeMissing'))
      }
      router.push({
        path: '/password/reset',
        query: { safe_code: data.safe_code }
      })
    } else {
      throw new Error(msg || t('login.error.failed'))
    }

  } catch (error: unknown) {
    if (!isHandledHttpError(error)) {
      const message = error instanceof Error ? error.message : ''
      notify.error(message || t('login.error.failed'))
    }
    console.error('Login failed:', error)
  } finally {
    loading.value = false
  }
}

async function handleOtpComplete() {
  if (!showTotp.value || !canSubmit.value || loading.value) return

  await handleLogin()
}

async function handlePasskeyLogin() {
  if (loading.value) {
    return
  }

  if (!passkeySupported.value) {
    notify.warning(t('passkey.unsupported'))
    return
  }

  loading.value = true
  try {
    const { data: optionsResponse } = await getPasskeyLoginOptions()
    const optionData = optionsResponse.data

    if (!optionData?.challenge_id || !optionData.options) {
      throw new Error(t('passkey.failed'))
    }

    const credential = await startPasskeyAuthentication(optionData.options)
    const { data: finishResponse } = await finishPasskeyLogin({
      challenge_id: optionData.challenge_id,
      credential
    })

    if (!finishResponse.data || !authStore.applySession(finishResponse.data)) {
      throw new Error(t('passkey.failed'))
    }

    const redirect = route.query.redirect as string | undefined
    router.push(safeDecodeRedirect(redirect))
  } catch (error: unknown) {
    if (!isHandledHttpError(error)) {
      notify.error(t(getWebAuthnErrorI18nKey(error)))
    }
    console.error('Passkey login failed:', error)
  } finally {
    loading.value = false
  }
}

async function handleOAuth(platform: KnownOAuthProvider) {
  let login_type = ''
  if (platform === 'wechat' && isDesktopBrowser()) {
    login_type = 'qrcode'
  }

  try {
    const { data } = await getOAuthUrl(platform, login_type)
    const oauthUrl = data.data.url
    
    if (oauthUrl && oauthUrl.startsWith('http')) {
      cacheOAuthState(oauthUrl, platform)
      window.location.href = oauthUrl
    } else {
      console.error('Invalid OAuth URL')
    }
  } catch (error) {
    console.error('OAuth URL error:', error)
  }
}

/**
 * 检测当前环境是否为飞书客户端
 */
function isFeishuClient() {
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('lark') || ua.includes('feishu')
}

/**
 * 检测当前环境是否为企业微信客户端
 */
function isWeChatWorkClient() {
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('wxwork') || ua.includes('micromessenger')
}

/**
 * 检测当前环境是否为桌面浏览器(非移动端)
 */
function isDesktopBrowser() {
  const ua = navigator.userAgent.toLowerCase()
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)
  const isInAppBrowser = isWeChatWorkClient() || isFeishuClient()
  return !isMobile && !isInAppBrowser
}

/**
 * 自动触发 OAuth 登录
 */
function autoTriggerOAuthLogin() {
  if (route.path.includes('/auth/callback') || route.query.from_oauth) {
    return
  }

  if (isFeishuClient()) {
    handleOAuth('feishu')
    return
  }

  if (isWeChatWorkClient()) {
    handleOAuth('wechat')
  }
}

function safeDecodeRedirect(redirect?: string): string {
  if (!redirect) return '/'

  try {
    return decodeURIComponent(redirect)
  } catch {
    return redirect
  }
}

function cacheOAuthState(oauthUrl: string, platform: KnownOAuthProvider) {
  try {
    const state = new URL(oauthUrl).searchParams.get('state')
    if (!state) return

    const rawMap = sessionStorage.getItem(OAUTH_STATE_MAP_KEY)
    const stateMap = rawMap ? JSON.parse(rawMap) as Record<string, string> : {}
    stateMap[state] = platform
    sessionStorage.setItem(OAUTH_STATE_MAP_KEY, JSON.stringify(stateMap))
  } catch {
    // ignore
  }
}
</script>

<template>
  <AuthPageShell>
    <AppBrandMark
      class="login-brand"
      :subtitle="t('login.slogan')"
    />

    <AppForm
      ref="loginFormRef"
      :model="loginForm"
      :rules="rules"
      class="login-form"
      @keyup.enter="handleLogin"
    >
      <template v-if="!showTotp">
        <AppFormItem prop="identifier">
          <AppInput
            v-model="loginForm.identifier"
            size="lg"
            :placeholder="t('login.identifierPlaceholder')"
            prefix-icon="User"
          />
        </AppFormItem>

        <AppFormItem prop="password">
          <AppInput
            v-model="loginForm.password"
            size="lg"
            type="password"
            :placeholder="t('login.passwordPlaceholder')"
            prefix-icon="Lock"
            show-password
          />
        </AppFormItem>
      </template>

      <template v-else>
        <AppFormItem
          prop="totpCode"
          class="totp-form-item"
        >
          <OtpCodeInput
            v-model="loginForm.totpCode"
            :length="6"
            @complete="handleOtpComplete"
          />
        </AppFormItem>
      </template>

      <div class="form-options">
        <!-- Future: Remember me / Forgot password -->
      </div>

      <AppButton
        variant="primary"
        size="lg"
        block
        :loading="loading"
        :disabled="!canSubmit"
        class="submit-btn"
        @click="handleLogin"
      >
        {{ showTotp ? t('login.submitTotp') : t('login.submit') }}
      </AppButton>

      <template v-if="!showTotp">
        <AppButton
          variant="secondary"
          size="lg"
          block
          icon="Key"
          class="passkey-btn"
          :disabled="!canUsePasskey"
          :loading="loading"
          @click="handlePasskeyLogin"
        >
          {{ t('passkey.startLogin') }}
        </AppButton>
      </template>
    </AppForm>

    <div class="divider">
      <span>{{ t('login.otherLogin') }}</span>
    </div>

    <div class="oauth-group">
      <button
        type="button"
        class="oauth-btn"
        :title="t('login.oauthFeishu')"
        :aria-label="t('login.oauthFeishu')"
        @click="handleOAuth('feishu')"
      >
        <OAuthProviderIcon
          provider="feishu"
          :size="20"
        />
      </button>
      <button
        type="button"
        class="oauth-btn"
        :title="t('login.oauthWechat')"
        :aria-label="t('login.oauthWechat')"
        @click="handleOAuth('wechat')"
      >
        <OAuthProviderIcon
          provider="wechat"
          :size="20"
        />
      </button>
    </div>
  </AuthPageShell>
</template>

<style lang="scss" scoped>
.login-brand {
  margin-bottom: 28px;
}

.login-form {
  text-align: left;

  :deep(.app-input__inner) {
    font-size: 14px;
  }

  .form-options {
    margin: 8px 0 16px;
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

  .passkey-btn {
    width: 100%;
    height: 44px;
    margin-top: 12px;
    margin-left: 0;
    border-radius: var(--app-radius-sm);
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: none;

    &:not(:disabled) {
      border: 1px solid var(--data-badge-info-border);
      background: var(--surface-subtle);
      color: var(--primary-text);

      &:hover {
        background: var(--app-accent-soft);
        border-color: var(--border-hover);
        color: var(--primary-text);
      }

      &:active {
        background: var(--app-accent-soft);
        border-color: var(--primary-color);
        color: var(--primary-text);
      }
    }

    &:disabled {
      border: 1px solid var(--border-subtle);
      background: var(--surface-subtle);
      color: var(--text-tertiary);
      box-shadow: none;
    }

    :deep(.app-icon) {
      font-size: 16px;
    }
  }

  .totp-form-item {
    :deep(.app-form-item__content) {
      justify-content: center;
    }
  }
}

.divider {
  margin: 28px 0 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-tertiary);
  font-size: 12px;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border-color);
  }

  span {
    padding: 0 4px;
    white-space: nowrap;
  }
}

.oauth-group {
  display: flex;
  justify-content: center;
  gap: 16px;

  .oauth-btn {
    @include button-reset;
    width: 44px;
    height: 44px;
    border-radius: var(--app-radius-md);
    border: 1px solid var(--border-color);
    background-color: var(--surface-subtle);
    box-shadow: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    transition:
      background-color $transition-fast,
      border-color $transition-fast,
      color $transition-fast;

    &:hover {
      background-color: var(--app-accent-soft);
      border-color: var(--border-hover);
      color: var(--primary-text);
    }
  }
}
</style>
