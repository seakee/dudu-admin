<script setup lang="ts">
import { reactive, ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock, Key } from '@element-plus/icons-vue'
import CryptoJS from 'crypto-js'
import { finishPasskeyLogin, getOAuthUrl, getPasskeyLoginOptions } from '@/api/auth'
import { useI18n } from 'vue-i18n'
import { isHandledHttpError } from '@/utils/httpError'
import { getWebAuthnErrorI18nKey, isWebAuthnSupported, startPasskeyAuthentication } from '@/utils/webauthn'
import ThemeSelect from '@/components/ThemeSelect/index.vue'
import LocaleSelect from '@/components/LocaleSelect/index.vue'

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
        if (!/^\d{6}$/.test(value || '')) {
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

  } catch (error: any) {
    if (!isHandledHttpError(error)) {
      ElMessage.error(error.message || t('login.error.failed'))
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
    ElMessage.warning(t('passkey.unsupported'))
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
  } catch (error: any) {
    if (!isHandledHttpError(error)) {
      ElMessage.error(t(getWebAuthnErrorI18nKey(error)))
    }
    console.error('Passkey login failed:', error)
  } finally {
    loading.value = false
  }
}

async function handleOAuth(platform: 'feishu' | 'wechat') {
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

function cacheOAuthState(oauthUrl: string, platform: 'feishu' | 'wechat') {
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
  <div class="login-wrapper">
    <div class="login-tools">
      <ThemeSelect class="login-tool" />
      <LocaleSelect
        class="login-tool"
        icon-only
      />
    </div>
    <div class="login-content">
      <!-- Login Form Card -->
      <div class="login-form-container">
        <PageCard class="login-card">
          <!-- Branding now inside the card -->
          <div class="card-branding">
            <div class="logo-icon">
              D
            </div>
            <h1>Dudu Admin</h1>
            <p class="slogan">
              {{ t('login.slogan') }}
            </p>
          </div>

          <el-form
            ref="loginFormRef"
            :model="loginForm"
            :rules="rules"
            class="login-form"
            size="large"
            @keyup.enter="handleLogin"
          >
            <template v-if="!showTotp">
              <el-form-item prop="identifier">
                <el-input
                  v-model="loginForm.identifier"
                  :placeholder="t('login.identifierPlaceholder')"
                  :prefix-icon="User"
                />
              </el-form-item>

              <el-form-item prop="password">
                <el-input
                  v-model="loginForm.password"
                  type="password"
                  :placeholder="t('login.passwordPlaceholder')"
                  :prefix-icon="Lock"
                  show-password
                />
              </el-form-item>
            </template>

            <template v-else>
              <el-form-item
                prop="totpCode"
                class="totp-form-item"
              >
                <OtpCodeInput
                  v-model="loginForm.totpCode"
                  :length="6"
                  @complete="handleOtpComplete"
                />
              </el-form-item>
            </template>

            <div class="form-options">
              <!-- Future: Remember me / Forgot password -->
            </div>

            <el-button
              type="primary"
              :loading="loading"
              :disabled="!canSubmit"
              class="submit-btn"
              @click="handleLogin"
            >
              {{ showTotp ? t('login.submitTotp') : t('login.submit') }}
            </el-button>

            <template v-if="!showTotp">
              <el-button
                class="passkey-btn"
                :disabled="!canUsePasskey"
                :loading="loading"
                @click="handlePasskeyLogin"
              >
                <el-icon><Key /></el-icon>
                <span>{{ t('passkey.startLogin') }}</span>
              </el-button>
            </template>
          </el-form>

          <div class="divider">
            <span>{{ t('login.otherLogin') }}</span>
          </div>

          <div class="oauth-group">
            <div
              class="oauth-btn"
              :title="t('login.oauthFeishu')"
              @click="handleOAuth('feishu')"
            >
              <i class="iconfont dudu-feishu oauth-icon" />
            </div>
            <div
              class="oauth-btn"
              :title="t('login.oauthWechat')"
              @click="handleOAuth('wechat')"
            >
              <i class="iconfont dudu-icon-qiyeweixin oauth-icon" />
            </div>
          </div>
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
  z-index: 10; // Above bg
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
}

.login-card :deep(.el-card__body) {
  padding: 40px 35px;
}

.card-branding {
  margin-bottom: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;

  .logo-icon {
    width: 64px;
    height: 64px;
    // Gradient Icon Background
    background: var(--primary-gradient);
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    font-weight: 800;
    margin-bottom: 16px;
    color: #fff;
    box-shadow: 0 10px 25px rgba(102, 126, 234, 0.35);
  }

  h1 {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin: 0 0 8px;
    color: var(--app-text-primary);
  }
  
  .slogan {
    font-size: 14px;
    color: var(--app-text-regular);
    margin: 0;
    font-weight: 500;
  }
}

.header {
  margin-bottom: 30px;

  .title {
    font-size: 22px;
    font-weight: 600;
    color: var(--app-text-primary);
    margin-bottom: 8px;
  }

  .subtitle {
    color: var(--app-text-muted);
    font-size: 14px;
  }
}

.login-form {
  text-align: left;

  :deep(.el-input__wrapper) {
    padding: 10px 15px;
    // Lighter inputs for glass card
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
  
  .form-options {
    margin: 10px 0 20px;
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
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.3);
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
    }
    
    &:active {
      transform: translateY(0);
    }
  }

  .passkey-btn {
    width: 100%;
    height: 50px;
    margin-top: 14px;
    margin-left: 0;
    border-radius: 10px;
    border: 1px solid var(--el-color-primary-light-7);
    background: linear-gradient(180deg, var(--app-surface-strong) 0%, var(--app-surface-muted) 100%);
    color: var(--el-color-primary);
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 4px 14px rgba(64, 158, 255, 0.08);
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease, color 0.25s ease;

    &:hover:not(.is-disabled) {
      background: var(--app-surface-strong);
      color: var(--el-color-primary);
      border-color: var(--el-color-primary-light-5);
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(64, 158, 255, 0.12);
    }

    &:active:not(.is-disabled) {
      transform: translateY(0);
      box-shadow: 0 4px 12px rgba(64, 158, 255, 0.1);
    }

    &:disabled {
      box-shadow: none;
    }

    :deep(.el-icon) {
      font-size: 16px;
    }
  }

  .totp-form-item {
    :deep(.el-form-item__content) {
      justify-content: center;
    }
  }
}

.divider {
  margin: 35px 0 25px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--app-text-muted);
  font-size: 12px;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--app-border);
  }

  span {
    padding: 0 4px;
    white-space: nowrap;
  }
}

.oauth-group {
  display: flex;
  justify-content: center;
  gap: 20px;
  
  .oauth-btn {
    width: 46px;
    height: 46px;
    border-radius: 12px;
    border: none;
    background-color: transparent;
    box-shadow: none;
    outline: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s;
    color: var(--app-text-regular);
    
    &:hover {
      color: var(--el-color-primary);
      transform: translateY(-2px);
    }

    &:hover .oauth-icon {
      filter: drop-shadow(0 6px 10px rgba(0,0,0,0.18));
    }
  }

  .oauth-icon {
    font-size: 28px;
    line-height: 1;
    transition: filter 0.3s;
  }
}

// Animations
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
