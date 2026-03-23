<script setup lang="ts">
import { type FormInstance, type FormRules } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { User, Lock, Key, Iphone, Picture, CircleCheck, Connection } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import CryptoJS from 'crypto-js'
import { useAuthStore } from '@/stores'
import {
  changePassword,
  deleteMyPasskey,
  disableTfa,
  enableTfa,
  finishPasskeyRegister,
  getMyPasskeys,
  getOAuthAccounts,
  getPasskeyRegisterOptions,
  getTfaKey,
  getTfaStatus,
  unbindOAuth,
  updateIdentifier,
  updateProfile
} from '@/api/auth'
import type { OAuthAccount, PasskeyItem, ReauthMethod } from '@/types/api'
import { useAdminReauth } from '@/composables/useAdminReauth'
import { isHandledHttpError } from '@/utils/httpError'
import { formatDateTime } from '@/utils/datetime'
import { getWebAuthnErrorI18nKey, isWebAuthnSupported, startPasskeyRegistration } from '@/utils/webauthn'
import ReauthPanel from './components/ReauthPanel.vue'
import ProfileOverviewCard from './components/ProfileOverviewCard.vue'
import ProfileSettingCard from './components/ProfileSettingCard.vue'

type DialogAction = 'password' | 'account' | 'tfa-enable' | 'tfa-disable'
type HighRiskAction = 'oauth-unbind' | 'passkey-delete' | 'passkey-register'
type HighRiskStep = 'confirm' | 'reauth'
type OverviewTone = 'primary' | 'success' | 'warning' | 'neutral'
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

const reservedNameKeywords = [
  'admin',
  'root',
  'administrator',
  '管理员',
  '超级管理员',
  'seakee',
  'super_admin',
  'superAdmin'
]

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const profileLoading = ref(false)
const dialogVisible = ref(false)
const activeStep = ref(0)
const currentAction = ref<DialogAction>('password')
const actionLoading = ref(false)
const tfaKeyLoading = ref(false)
const oauthAccountsLoading = ref(false)
const oauthDialogVisible = ref(false)
const highRiskDialogVisible = ref(false)
const highRiskActionLoading = ref(false)
const highRiskStep = ref<HighRiskStep>('confirm')
const passkeysLoading = ref(false)
const passkeyDialogVisible = ref(false)
const passkeyRegistering = ref(false)
const passkeyDeletingId = ref<number | null>(null)
const passkeySupported = ref(isWebAuthnSupported())

const oauthAccounts = ref<OAuthAccount[]>([])
const currentOAuthAccount = ref<OAuthAccount | null>(null)
const currentPasskey = ref<PasskeyItem | null>(null)
const passkeys = ref<PasskeyItem[]>([])
const passkeyDisplayName = ref('')
const currentHighRiskAction = ref<HighRiskAction>('oauth-unbind')

const profileFormRef = ref<FormInstance>()
const passwordFormRef = ref<FormInstance>()
const accountFormRef = ref<FormInstance>()
const tfaSetupFormRef = ref<FormInstance>()
const tfaSetupOtpInputRef = ref<OtpInputInstance | null>(null)
const actionReauthPanelRef = ref<ReauthPanelInstance | null>(null)
const highRiskReauthPanelRef = ref<ReauthPanelInstance | null>(null)

const actionReauth = useAdminReauth(t)
const highRiskReauth = useAdminReauth(t)

const profileForm = reactive({
  user_name: '',
  role_name: '',
  avatar: '',
  email: '',
  phone: ''
})
const initialProfileUserName = ref('')

const actionData = reactive({
  password: '',
  confirmPassword: '',
  email: '',
  phone: '',
  totp_key: '',
  qr_code: '',
  setup_totp_code: ''
})

const tfaEnabled = ref(false)

const profileRules = computed<FormRules>(() => ({
  user_name: [
    { required: true, message: t('profile.validation.userNameRequired'), trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        const normalized = String(value || '').trim()
        const initialUserName = initialProfileUserName.value.trim()

        if (!normalized) {
          callback(new Error(t('profile.validation.userNameRequired')))
          return
        }

        if (normalized === initialUserName) {
          callback()
          return
        }

        const lowered = normalized.toLowerCase()
        const isReserved = reservedNameKeywords.some((keyword) => {
          const target = keyword.toLowerCase()
          return lowered.startsWith(target) || lowered.endsWith(target)
        })

        if (isReserved) {
          callback(new Error(t('profile.validation.userNameReserved')))
          return
        }

        callback()
      },
      trigger: ['blur', 'change']
    }
  ]
}))

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
      if (value && !/^\S+@\S+\.\S+$/.test(value)) {
        callback(new Error(t('profile.validation.emailInvalid')))
        return
      }
      callback()
    },
    trigger: 'blur'
  }],
  phone: [{
    validator: (_rule, value, callback) => {
      if (value && !/^\+?\d{6,20}$/.test(value)) {
        callback(new Error(t('profile.validation.phoneInvalid')))
        return
      }
      callback()
    },
    trigger: 'blur'
  }]
}))

const reauthPasswordRules: FormRules = {
  password: [{ required: true, message: t('oauth.bind.validation.passwordRequired'), trigger: 'blur' }]
}

const reauthTotpRules: FormRules = {
  totp_code: [
    { required: true, message: t('login.validation.codeRequired'), trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (!/^\d{6}$/.test(value || '')) {
          callback(new Error(t('login.validation.codeInvalid')))
          return
        }
        callback()
      },
      trigger: ['blur', 'change']
    }
  ]
}

const tfaSetupRules: FormRules = {
  setup_totp_code: [
    { required: true, message: t('profile.validation.codeRequired'), trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (!/^\d{6}$/.test(value || '')) {
          callback(new Error(t('profile.validation.codeInvalid')))
          return
        }
        callback()
      },
      trigger: ['blur', 'change']
    }
  ]
}

const passkeySummary = computed(() => {
  if (passkeysLoading.value) {
    return t('common.loading')
  }

  return passkeys.value.length > 0
    ? t('passkey.summary', { count: passkeys.value.length })
    : t('passkey.empty')
})

const profileRoleName = computed(() => profileForm.role_name || t('profile.roleAdmin'))

const overviewStats = computed<Array<{ label: string; value: string; tone: OverviewTone }>>(() => ([
  {
    label: t('profile.sectionTfa'),
    value: tfaEnabled.value ? t('profile.tfaEnabled') : t('profile.tfaDisabled'),
    tone: tfaEnabled.value ? 'success' : 'warning'
  },
  {
    label: t('profile.sectionPasskey'),
    value: String(passkeys.value.length),
    tone: passkeys.value.length > 0 ? 'primary' : 'neutral'
  },
  {
    label: t('profile.sectionOAuth'),
    value: String(oauthAccounts.value.length),
    tone: oauthAccounts.value.length > 0 ? 'primary' : 'neutral'
  }
]))

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

const actionStepTitles = computed(() => (
  isTfaEnableAction.value
    ? [
        t('profile.tfaStepInfo'),
        t('profile.tfaStepCode'),
        t('profile.stepVerify')
      ]
    : [
        t('profile.stepInfo'),
        t('profile.stepVerify')
      ]
))

const actionFinalStep = computed(() => (
  isTfaEnableAction.value ? 2 : 1
))

const isVerifyAction = computed(() => (
  currentAction.value === 'tfa-disable' || activeStep.value === actionFinalStep.value
))

const canSubmitCurrentAction = computed(() => (
  isVerifyAction.value && actionReauth.canSubmit
))

const canSubmitHighRisk = computed(() => (
  highRiskStep.value === 'confirm' || highRiskReauth.canSubmit
))

const actionBusy = computed(() => (
  actionLoading.value || actionReauth.loading || actionReauth.methodsLoading
))

const highRiskBusy = computed(() => (
  highRiskActionLoading.value || highRiskReauth.loading || highRiskReauth.methodsLoading
))

const passkeyRegisterBusy = computed(() => (
  passkeyRegistering.value || (
    highRiskDialogVisible.value
    && currentHighRiskAction.value === 'passkey-register'
    && highRiskBusy.value
  )
))

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

const highRiskPrimaryButtonType = computed(() => (
  currentHighRiskAction.value === 'passkey-delete' ? 'danger' : 'primary'
))

const highRiskVerifyTitle = computed(() => getReauthTitle(highRiskReauth.step))
const highRiskPasswordTitle = computed(() => getReauthDescription(highRiskReauth.step))
const highRiskTotpTitle = computed(() => getReauthTitle('totp'))
const highRiskTotpTip = computed(() => getReauthDescription('totp'))
const highRiskSubmitButtonText = computed(() => {
  if (highRiskStep.value === 'confirm') {
    return highRiskConfirmButtonText.value
  }

  return getReauthSubmitButtonText(highRiskReauth.step, highRiskFinalActionText.value)
})

const actionSubmitButtonText = computed(() => (
  getReauthSubmitButtonText(
    actionReauth.step,
    currentAction.value === 'tfa-disable' ? t('common.disable') : t('common.confirm')
  )
))

onMounted(async () => {
  await refreshProfile()
  await refreshTfaStatus()
  await fetchOAuthAccounts()
  await fetchPasskeys()
})

function getReauthTitle(step: ReauthMethod | 'totp') {
  if (step === 'passkey') {
    return t('profile.reauth.passkeyTitle')
  }

  if (step === 'totp') {
    return t('profile.reauth.totpTitle')
  }

  return t('profile.reauth.passwordTitle')
}

function getReauthDescription(step: ReauthMethod | 'totp') {
  if (step === 'passkey') {
    return t('profile.reauth.passkeyDesc')
  }

  if (step === 'totp') {
    return t('profile.reauth.totpDesc')
  }

  return t('profile.reauth.passwordDesc')
}

function getReauthSubmitButtonText(step: ReauthMethod | 'totp', finalLabel: string) {
  if (step === 'passkey') {
    return t('profile.reauth.passkeyBtn')
  }

  if (step === 'password') {
    return t('profile.reauth.passwordBtn')
  }

  return finalLabel
}

async function refreshProfile() {
  try {
    const data = await authStore.getProfile()
    profileForm.user_name = data.user_name || ''
    profileForm.role_name = data.role_name || ''
    profileForm.avatar = data.avatar || ''
    profileForm.email = data.email || ''
    profileForm.phone = data.phone || ''
    initialProfileUserName.value = data.user_name || ''
  } catch {
    // ignore
  }
}

async function refreshTfaStatus() {
  try {
    const { data } = await getTfaStatus()
    tfaEnabled.value = data.data.enable
  } catch {
    // ignore
  }
}

async function fetchOAuthAccounts() {
  oauthAccountsLoading.value = true
  try {
    const { data } = await getOAuthAccounts()
    oauthAccounts.value = data.data
  } catch {
    // 请求层已处理提示
  } finally {
    oauthAccountsLoading.value = false
  }
}

async function fetchPasskeys() {
  passkeysLoading.value = true
  try {
    const { data } = await getMyPasskeys()
    passkeys.value = data.data
  } catch {
    // 请求层已处理提示
  } finally {
    passkeysLoading.value = false
  }
}

async function handleUpdateProfile() {
  const valid = await profileFormRef.value?.validate()
  if (valid === false) {
    return
  }

  profileLoading.value = true
  try {
    const trimmedUserName = profileForm.user_name.trim()
    const initialUserName = initialProfileUserName.value.trim()
    const payload: {
      user_name?: string
      avatar?: string
    } = {
      avatar: profileForm.avatar.trim() || undefined
    }

    if (trimmedUserName !== initialUserName) {
      payload.user_name = trimmedUserName
    }

    const { data } = await updateProfile({
      ...payload
    })

    if (data.code !== 0) {
      throw new Error(data.msg || t('profile.message.updateFailed'))
    }

    ElMessage.success(t('profile.message.profileUpdated'))
    await refreshProfile()
  } catch (error: any) {
    if (!isHandledHttpError(error)) {
      ElMessage.error(error.message || t('profile.message.updateFailed'))
    }
  } finally {
    profileLoading.value = false
  }
}

function resetActionDialog() {
  actionData.password = ''
  actionData.confirmPassword = ''
  actionData.email = profileForm.email
  actionData.phone = profileForm.phone
  actionData.totp_key = ''
  actionData.qr_code = ''
  actionData.setup_totp_code = ''
  actionReauth.reset()

  nextTick(() => {
    actionReauthPanelRef.value?.clearOtp()
    tfaSetupOtpInputRef.value?.clear?.()
  })
}

function resetHighRiskDialog(step: HighRiskStep = 'confirm') {
  highRiskStep.value = step
  highRiskReauth.reset()

  nextTick(() => {
    highRiskReauthPanelRef.value?.clearOtp()
  })
}

async function openDialog(action: DialogAction) {
  if (action === 'tfa-enable' && tfaEnabled.value) {
    return
  }

  if (action === 'tfa-disable' && !tfaEnabled.value) {
    return
  }

  currentAction.value = action
  activeStep.value = 0
  dialogVisible.value = true
  actionLoading.value = false
  resetActionDialog()

  if (action === 'tfa-enable') {
    void loadTfaKey()
  }

  if (action === 'tfa-disable') {
    await prepareActionReauth().catch(() => {})
  }
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

function syncHighRiskReauthUi() {
  nextTick(() => {
    highRiskReauthPanelRef.value?.clearValidate()
    highRiskReauthPanelRef.value?.focusOtp()
  })
}

async function prepareActionReauth(preferredMethod?: ReauthMethod) {
  await actionReauth.prepare(preferredMethod)
  syncActionReauthUi()
}

async function prepareHighRiskReauth(preferredMethod?: ReauthMethod) {
  await highRiskReauth.prepare(preferredMethod)
  syncHighRiskReauthUi()
}

function switchActionReauthMethod(method: ReauthMethod) {
  actionReauth.switchMethod(method)
  syncActionReauthUi()
}

function switchHighRiskReauthMethod(method: ReauthMethod) {
  highRiskReauth.switchMethod(method)
  syncHighRiskReauthUi()
}

async function handleNextStep() {
  if (currentAction.value === 'password') {
    const valid = await passwordFormRef.value?.validate()
    if (!valid) {
      return
    }
  } else if (currentAction.value === 'account') {
    const valid = await accountFormRef.value?.validate()
    if (!valid) {
      return
    }

    if (!actionData.email.trim() && !actionData.phone.trim()) {
      ElMessage.warning(t('profile.validation.identifierRequired'))
      return
    }
  } else if (currentAction.value === 'tfa-enable') {
    if (activeStep.value === 0) {
      if (!actionData.totp_key) {
        ElMessage.warning(t('profile.message.keyRequired'))
        return
      }

      activeStep.value = 1
      nextTick(() => {
        tfaSetupOtpInputRef.value?.focusFirst?.()
      })
      return
    }

    const valid = await tfaSetupFormRef.value?.validate()
    if (!valid) {
      return
    }

    activeStep.value = 2
    await prepareActionReauth().catch(() => {})
    return
  }

  activeStep.value = 1
  await prepareActionReauth().catch(() => {})
}

async function validateActionReauthForm() {
  return await actionReauthPanelRef.value?.validate() ?? true
}

async function validateHighRiskReauthForm() {
  return await highRiskReauthPanelRef.value?.validate() ?? true
}

async function completeCurrentAction(reauthTicket: string) {
  actionLoading.value = true

  try {
    if (currentAction.value === 'password') {
      await changePassword({
        reauth_ticket: reauthTicket,
        password: CryptoJS.MD5(actionData.password).toString()
      })

      ElMessage.success(t('profile.message.passwordUpdated'))
      dialogVisible.value = false
      await authStore.logout()
      await router.replace('/login')
      return
    }

    if (currentAction.value === 'account') {
      await updateIdentifier({
        reauth_ticket: reauthTicket,
        email: actionData.email.trim() || undefined,
        phone: actionData.phone.trim() || undefined
      })

      ElMessage.success(t('profile.message.accountUpdated'))
      dialogVisible.value = false
      await refreshProfile()
      return
    }

    if (currentAction.value === 'tfa-enable') {
      await enableTfa({
        reauth_ticket: reauthTicket,
        totp_key: actionData.totp_key,
        totp_code: actionData.setup_totp_code
      })

      ElMessage.success(t('profile.message.enableSuccess'))
      dialogVisible.value = false
      await refreshTfaStatus()
      return
    }

    await disableTfa({ reauth_ticket: reauthTicket })
    ElMessage.success(t('profile.message.disableSuccess'))
    dialogVisible.value = false
    await refreshTfaStatus()
  } finally {
    actionLoading.value = false
  }
}

async function handleSubmit() {
  if (actionBusy.value) {
    return
  }

  const valid = await validateActionReauthForm()
  if (!valid) {
    return
  }

  try {
    const reauthTicket = await actionReauth.submit()
    if (!reauthTicket) {
      syncActionReauthUi()
      return
    }

    await completeCurrentAction(reauthTicket)
  } catch (error: any) {
    if (!isHandledHttpError(error)) {
      ElMessage.error(error.message || t('profile.message.updateFailed'))
    }
  }
}

async function handleOtpComplete() {
  if (actionReauth.step !== 'totp' || !canSubmitCurrentAction.value || actionBusy.value) {
    return
  }

  await handleSubmit()
}

function openOAuthDialog() {
  oauthDialogVisible.value = true
  fetchOAuthAccounts()
}

function openPasskeyDialog() {
  passkeyDialogVisible.value = true
  fetchPasskeys()
}

async function registerPasskeyWithTicket(reauthTicket: string) {
  passkeyRegistering.value = true

  try {
    const displayName = passkeyDisplayName.value.trim()
    const { data: optionsResponse } = await getPasskeyRegisterOptions({
      reauth_ticket: reauthTicket,
      ...(displayName ? { display_name: displayName } : {})
    })
    const optionData = optionsResponse.data

    if (!optionData?.challenge_id || !optionData.options) {
      throw new Error(t('passkey.failed'))
    }

    const credential = await startPasskeyRegistration(optionData.options)
    await finishPasskeyRegister({
      challenge_id: optionData.challenge_id,
      credential
    })

    passkeyDisplayName.value = ''
    ElMessage.success(t('passkey.registered'))
    highRiskDialogVisible.value = false
    await fetchPasskeys()
  } catch (error: any) {
    if (!isHandledHttpError(error)) {
      ElMessage.error(error.message || t(getWebAuthnErrorI18nKey(error)))
    }
  } finally {
    passkeyRegistering.value = false
  }
}

async function handleRegisterPasskey() {
  if (passkeyRegisterBusy.value) {
    return
  }

  if (!passkeySupported.value) {
    ElMessage.warning(t('passkey.unsupported'))
    return
  }

  currentHighRiskAction.value = 'passkey-register'
  currentOAuthAccount.value = null
  currentPasskey.value = null
  resetHighRiskDialog('reauth')
  highRiskDialogVisible.value = true
  await prepareHighRiskReauth().catch(() => {})
}

async function handleDeletePasskey(item: PasskeyItem) {
  openPasskeyReauthDialog(item)
}

function openOAuthReauthDialog(account: OAuthAccount) {
  currentHighRiskAction.value = 'oauth-unbind'
  currentOAuthAccount.value = account
  currentPasskey.value = null
  resetHighRiskDialog('confirm')
  highRiskDialogVisible.value = true
}

function openPasskeyReauthDialog(item: PasskeyItem) {
  currentHighRiskAction.value = 'passkey-delete'
  currentPasskey.value = item
  currentOAuthAccount.value = null
  resetHighRiskDialog('confirm')
  highRiskDialogVisible.value = true
}

function handleHighRiskDialogClosed() {
  currentOAuthAccount.value = null
  currentPasskey.value = null
  currentHighRiskAction.value = 'oauth-unbind'
  resetHighRiskDialog()
}

function getOAuthProviderLabel(provider?: string) {
  if (provider === 'feishu') {
    return t('profile.oauth.providerFeishu')
  }

  if (provider === 'wechat') {
    return t('profile.oauth.providerWechat')
  }

  return provider || '-'
}

function getOAuthProviderAccent(provider?: string) {
  if (provider === 'feishu') {
    return 'is-feishu'
  }

  if (provider === 'wechat') {
    return 'is-wechat'
  }

  return 'is-default'
}

function getOAuthProviderFallbackText(provider?: string) {
  const label = getOAuthProviderLabel(provider)
  return label.charAt(0).toUpperCase() || '?'
}

async function completeHighRiskAction(reauthTicket: string) {
  highRiskActionLoading.value = true

  try {
    if (currentHighRiskAction.value === 'oauth-unbind') {
      if (!currentOAuthAccount.value) {
        throw new Error(t('profile.message.updateFailed'))
      }

      await unbindOAuth({
        identity_id: currentOAuthAccount.value.id,
        reauth_ticket: reauthTicket
      })

      ElMessage.success(t('profile.message.oauthUnbindSuccess'))
      highRiskDialogVisible.value = false
      await fetchOAuthAccounts()
      return
    }

    if (currentHighRiskAction.value === 'passkey-delete') {
      if (!currentPasskey.value) {
        throw new Error(t('profile.message.updateFailed'))
      }

      passkeyDeletingId.value = currentPasskey.value.id
      try {
        await deleteMyPasskey({
          id: currentPasskey.value.id,
          reauth_ticket: reauthTicket
        })
      } finally {
        passkeyDeletingId.value = null
      }

      ElMessage.success(t('passkey.deleted'))
      highRiskDialogVisible.value = false
      await fetchPasskeys()
      return
    }

    await registerPasskeyWithTicket(reauthTicket)
  } finally {
    highRiskActionLoading.value = false
  }
}

async function handleHighRiskSubmit() {
  if (highRiskStep.value === 'confirm') {
    highRiskStep.value = 'reauth'
    await prepareHighRiskReauth().catch(() => {})
    return
  }

  if (highRiskBusy.value) {
    return
  }

  const valid = await validateHighRiskReauthForm()
  if (!valid) {
    return
  }

  try {
    const reauthTicket = await highRiskReauth.submit()
    if (!reauthTicket) {
      syncHighRiskReauthUi()
      return
    }

    await completeHighRiskAction(reauthTicket)
  } catch (error: any) {
    if (!isHandledHttpError(error)) {
      ElMessage.error(error.message || t('profile.message.updateFailed'))
    }
  }
}

async function handleHighRiskOtpComplete() {
  if (highRiskStep.value !== 'reauth' || highRiskReauth.step !== 'totp' || !canSubmitHighRisk.value || highRiskBusy.value) {
    return
  }

  await handleHighRiskSubmit()
}

async function handleCopyKey() {
  if (!actionData.totp_key) {
    ElMessage.warning(t('profile.message.keyEmpty'))
    return
  }

  try {
    await navigator.clipboard.writeText(actionData.totp_key)
    ElMessage.success(t('profile.message.keyCopied'))
  } catch {
    ElMessage.error(t('profile.message.copyFailed'))
  }
}

function qrCodeSrc() {
  if (!actionData.qr_code) {
    return ''
  }

  if (actionData.qr_code.startsWith('data:')) {
    return actionData.qr_code
  }

  return `data:image/png;base64,${actionData.qr_code}`
}

function getUserIdentifierLabel() {
  const values = [profileForm.email, profileForm.phone].filter((item) => !!item)
  if (!values.length) {
    return '-'
  }

  return values.join(' / ')
}

function formatPasskeyTransports(transports?: string[]) {
  if (!transports?.length) {
    return '-'
  }

  return transports.join(' / ')
}
</script>

<template>
  <div class="profile-page">
    <div class="profile-page__intro">
      <div>
        <span class="profile-page__eyebrow">{{ t('profile.title') }}</span>
        <h1>{{ t('profile.title') }}</h1>
        <p>{{ t('profile.pageSubtitle') }}</p>
      </div>
    </div>

    <el-row
      :gutter="20"
      class="profile-page__top-grid"
    >
      <el-col
        :xs="24"
        :xl="8"
      >
        <ProfileOverviewCard
          :title="t('profile.overviewTitle')"
          :subtitle="t('profile.overviewSubtitle')"
          :identifier-label="t('profile.account')"
          :identifier-value="getUserIdentifierLabel()"
          :user-name="profileForm.user_name"
          :role-name="profileRoleName"
          :avatar="profileForm.avatar"
          :stats="overviewStats"
        />
      </el-col>

      <el-col
        :xs="24"
        :xl="16"
      >
        <PageCard class="profile-editor-card">
          <template #header>
            <div class="section-card-header">
              <div>
                <h3>{{ t('profile.sectionProfile') }}</h3>
                <p>{{ t('profile.editorSubtitle') }}</p>
              </div>
            </div>
          </template>

          <el-form
            ref="profileFormRef"
            :model="profileForm"
            :rules="profileRules"
            label-position="top"
            class="glass-form profile-editor-form"
          >
            <div class="profile-editor-grid">
              <el-form-item
                :label="t('profile.userName')"
                prop="user_name"
              >
                <el-input
                  v-model="profileForm.user_name"
                  :prefix-icon="User"
                />
                <div class="form-tip">
                  {{ t('profile.userNameHint') }}
                </div>
              </el-form-item>

              <el-form-item :label="t('profile.avatarUrl')">
                <el-input
                  v-model="profileForm.avatar"
                  :prefix-icon="Picture"
                  placeholder="https://"
                />
                <div class="form-tip">
                  {{ t('profile.avatarTip') }}
                </div>
              </el-form-item>
            </div>

            <div class="profile-editor-actions">
              <el-button
                type="primary"
                :loading="profileLoading"
                class="glass-btn"
                @click="handleUpdateProfile"
              >
                {{ t('profile.save') }}
              </el-button>
            </div>
          </el-form>
        </PageCard>
      </el-col>
    </el-row>

    <section class="profile-section">
      <div class="profile-section__header">
        <h2>{{ t('profile.securityTitle') }}</h2>
        <p>{{ t('profile.securitySubtitle') }}</p>
      </div>

      <div class="profile-setting-grid">
        <ProfileSettingCard
          :title="t('profile.sectionPassword')"
          :description="t('profile.setting.passwordDesc')"
          :status="t('profile.securityStatusSafe')"
          status-tone="success"
          accent="success"
          :action-label="t('profile.actionChange')"
          action-type="primary"
          @action="openDialog('password')"
        >
          <template #icon>
            <el-icon><Lock /></el-icon>
          </template>
        </ProfileSettingCard>

        <ProfileSettingCard
          :title="t('profile.sectionAccount')"
          :description="t('profile.setting.accountDesc')"
          :status="getUserIdentifierLabel()"
          status-tone="info"
          accent="brand"
          :action-label="t('common.edit')"
          @action="openDialog('account')"
        >
          <template #icon>
            <el-icon><User /></el-icon>
          </template>
        </ProfileSettingCard>

        <ProfileSettingCard
          :title="t('profile.sectionOAuth')"
          :description="t('profile.setting.oauthDesc')"
          :status="oauthAccountsLoading ? t('common.loading') : (oauthAccounts.length > 0 ? t('profile.oauth.summary', { count: oauthAccounts.length }) : t('profile.oauth.empty'))"
          :status-tone="oauthAccounts.length > 0 ? 'primary' : 'info'"
          accent="brand"
          :action-label="t('common.manage')"
          @action="openOAuthDialog"
        >
          <template #icon>
            <el-icon><Connection /></el-icon>
          </template>
        </ProfileSettingCard>

        <ProfileSettingCard
          :title="t('profile.sectionPasskey')"
          :description="t('profile.setting.passkeyDesc')"
          :status="passkeySummary"
          :status-tone="passkeys.length > 0 ? 'primary' : 'info'"
          accent="brand"
          :action-label="t('passkey.manage')"
          @action="openPasskeyDialog"
        >
          <template #icon>
            <el-icon><Key /></el-icon>
          </template>
        </ProfileSettingCard>

        <ProfileSettingCard
          :title="t('profile.sectionTfa')"
          :description="tfaEnabled ? t('profile.setting.tfaEnabledDesc') : t('profile.setting.tfaDisabledDesc')"
          :status="tfaEnabled ? t('profile.tfaEnabled') : t('profile.tfaDisabled')"
          :status-tone="tfaEnabled ? 'success' : 'warning'"
          :accent="tfaEnabled ? 'success' : 'warning'"
          :action-label="tfaEnabled ? t('profile.disable') : t('profile.enable')"
          :action-type="tfaEnabled ? 'danger' : 'primary'"
          @action="openDialog(tfaEnabled ? 'tfa-disable' : 'tfa-enable')"
        >
          <template #icon>
            <el-icon><CircleCheck /></el-icon>
          </template>
        </ProfileSettingCard>
      </div>
    </section>

    <BaseDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="520px"
      destroy-on-close
    >
      <div
        v-if="currentAction !== 'tfa-disable'"
        class="action-dialog"
      >
        <el-steps
          :active="activeStep"
          finish-status="success"
          align-center
          class="action-dialog__steps"
        >
          <el-step
            v-for="title in actionStepTitles"
            :key="title"
            :title="title"
          />
        </el-steps>

        <div
          v-show="activeStep === 0"
          class="action-dialog__step"
        >
          <el-form
            v-if="currentAction === 'password'"
            ref="passwordFormRef"
            :model="actionData"
            :rules="passwordRules"
            label-position="top"
            @submit.prevent
          >
            <el-form-item
              :label="t('profile.newPassword')"
              prop="password"
            >
              <el-input
                v-model="actionData.password"
                type="password"
                show-password
                :prefix-icon="Lock"
              />
            </el-form-item>
            <el-form-item
              :label="t('profile.confirmNewPassword')"
              prop="confirmPassword"
            >
              <el-input
                v-model="actionData.confirmPassword"
                type="password"
                show-password
                :prefix-icon="Lock"
              />
            </el-form-item>
          </el-form>

          <el-form
            v-if="currentAction === 'account'"
            ref="accountFormRef"
            :model="actionData"
            :rules="accountRules"
            label-position="top"
            @submit.prevent
          >
            <el-form-item
              :label="t('profile.newEmail')"
              prop="email"
            >
              <el-input
                v-model="actionData.email"
                :prefix-icon="User"
              />
            </el-form-item>
            <el-form-item
              :label="t('profile.newPhone')"
              prop="phone"
            >
              <el-input
                v-model="actionData.phone"
                :prefix-icon="Iphone"
              />
            </el-form-item>
          </el-form>

          <div
            v-if="currentAction === 'tfa-enable'"
            class="tfa-setup"
          >
            <div class="tfa-setup__header">
              <h4>{{ t('profile.tfaSetupTitle') }}</h4>
              <p>{{ t('profile.tfaSetupDesc') }}</p>
            </div>

            <div class="tfa-setup__panel">
              <div
                v-loading="tfaKeyLoading"
                class="tfa-setup__qr"
              >
                <img
                  v-if="actionData.qr_code"
                  :src="qrCodeSrc()"
                  :alt="t('profile.qrCode')"
                >
                <span
                  v-else
                  class="tfa-setup__qr-placeholder"
                >
                  {{ t('profile.qrPlaceholder') }}
                </span>
              </div>

              <div class="tfa-setup__meta">
                <p class="tfa-setup__tip">
                  {{ t('profile.scanTip') }}
                </p>

                <div class="tfa-setup__key-block">
                  <span class="tfa-setup__key-label">{{ t('profile.tfaKey') }}</span>
                  <div class="tfa-setup__key-card">
                    <code
                      class="tfa-setup__key-value"
                      :class="{ 'is-empty': !actionData.totp_key }"
                    >
                      {{ actionData.totp_key || t('profile.qrPlaceholder') }}
                    </code>
                    <el-button
                      class="tfa-setup__copy-btn"
                      :disabled="!actionData.totp_key"
                      @click="handleCopyKey"
                    >
                      {{ t('profile.copyKey') }}
                    </el-button>
                  </div>
                  <p class="tfa-setup__key-hint">
                    {{ t('profile.tfaKeyTip') }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-show="activeStep === 1"
          class="action-dialog__step"
        >
          <el-form
            v-if="isTfaEnableAction"
            ref="tfaSetupFormRef"
            :model="actionData"
            :rules="tfaSetupRules"
            class="tfa-setup tfa-setup--verify"
            label-position="top"
            @submit.prevent
          >
            <div class="tfa-setup__header">
              <h4>{{ t('profile.tfaCodeTitle') }}</h4>
              <p>{{ t('profile.tfaCodeDesc') }}</p>
            </div>

            <el-form-item
              prop="setup_totp_code"
              class="tfa-setup__otp"
            >
              <OtpCodeInput
                ref="tfaSetupOtpInputRef"
                v-model="actionData.setup_totp_code"
                :length="6"
              />
            </el-form-item>
          </el-form>

          <ReauthPanel
            v-else
            ref="actionReauthPanelRef"
            :model="actionReauth"
            :password="actionReauth.form.password"
            :totp-code="actionReauth.form.totp_code"
            :title="getReauthTitle(actionReauth.step)"
            :description="getReauthDescription(actionReauth.step)"
            :unavailable-text="t('profile.reauth.unavailable')"
            :password-placeholder="t('profile.reauth.passwordPlaceholder')"
            :password-rules="reauthPasswordRules"
            :totp-rules="reauthTotpRules"
            show-icon
            @switch-method="switchActionReauthMethod"
            @otp-complete="handleOtpComplete"
            @update:password="actionReauth.form.password = $event"
            @update:totp-code="actionReauth.form.totp_code = $event"
          />
        </div>

        <div
          v-if="isTfaEnableAction && activeStep === actionFinalStep"
          class="action-dialog__step"
        >
          <ReauthPanel
            ref="actionReauthPanelRef"
            :model="actionReauth"
            :password="actionReauth.form.password"
            :totp-code="actionReauth.form.totp_code"
            :title="getReauthTitle(actionReauth.step)"
            :description="getReauthDescription(actionReauth.step)"
            :unavailable-text="t('profile.reauth.unavailable')"
            :password-placeholder="t('profile.reauth.passwordPlaceholder')"
            :password-rules="reauthPasswordRules"
            :totp-rules="reauthTotpRules"
            show-icon
            @switch-method="switchActionReauthMethod"
            @otp-complete="handleOtpComplete"
            @update:password="actionReauth.form.password = $event"
            @update:totp-code="actionReauth.form.totp_code = $event"
          />
        </div>
      </div>

      <div
        v-else
        class="action-dialog action-dialog--single"
      >
        <el-alert
          :title="t('profile.disableConfirm')"
          type="warning"
          :closable="false"
          class="dialog-alert"
        />

        <ReauthPanel
          ref="actionReauthPanelRef"
          :model="actionReauth"
          :password="actionReauth.form.password"
          :totp-code="actionReauth.form.totp_code"
          :title="getReauthTitle(actionReauth.step)"
          :description="getReauthDescription(actionReauth.step)"
          :unavailable-text="t('profile.reauth.unavailable')"
          :password-placeholder="t('profile.reauth.passwordPlaceholder')"
          :password-rules="reauthPasswordRules"
          :totp-rules="reauthTotpRules"
          @switch-method="switchActionReauthMethod"
          @otp-complete="handleOtpComplete"
          @update:password="actionReauth.form.password = $event"
          @update:totp-code="actionReauth.form.totp_code = $event"
        />
      </div>

      <template #footer>
        <template v-if="currentAction !== 'tfa-disable'">
          <el-button
            v-if="activeStep === 0"
            @click="dialogVisible = false"
          >
            {{ t('common.cancel') }}
          </el-button>
          <el-button
            v-if="isTfaEnableAction && activeStep === 1"
            @click="activeStep--"
          >
            {{ t('common.back') }}
          </el-button>
          <el-button
            v-if="activeStep < actionFinalStep"
            type="primary"
            @click="handleNextStep"
          >
            {{ t('common.next') }}
          </el-button>

          <el-button
            v-if="activeStep > 0 && !(isTfaEnableAction && activeStep === 1)"
            @click="activeStep--"
          >
            {{ t('common.back') }}
          </el-button>
          <el-button
            v-if="activeStep === actionFinalStep"
            type="primary"
            :loading="actionBusy"
            :disabled="!canSubmitCurrentAction"
            @click="handleSubmit"
          >
            {{ actionSubmitButtonText }}
          </el-button>
        </template>

        <template v-else>
          <el-button @click="dialogVisible = false">
            {{ t('common.cancel') }}
          </el-button>
          <el-button
            type="danger"
            :loading="actionBusy"
            :disabled="!canSubmitCurrentAction"
            @click="handleSubmit"
          >
            {{ actionSubmitButtonText }}
          </el-button>
        </template>
      </template>
    </BaseDialog>

    <BaseDialog
      v-model="passkeyDialogVisible"
      :title="t('profile.passkey.title')"
      width="760px"
    >
      <div class="credential-dialog">
        <el-alert
          v-if="!passkeySupported"
          :title="t('passkey.unsupportedTip')"
          type="warning"
          :closable="false"
          class="dialog-alert"
        />

        <div class="credential-toolbar">
          <div class="credential-toolbar__copy">
            <strong>{{ t('passkey.startRegister') }}</strong>
            <p>{{ t('passkey.registerHint') }}</p>
          </div>

          <div class="credential-toolbar__controls">
            <el-input
              v-model="passkeyDisplayName"
              :placeholder="t('passkey.displayNamePlaceholder')"
              clearable
            />
            <el-button
              type="primary"
              :disabled="!passkeySupported"
              :loading="passkeyRegisterBusy"
              @click="handleRegisterPasskey"
            >
              {{ t('passkey.startRegister') }}
            </el-button>
          </div>
        </div>

        <div
          v-loading="passkeysLoading"
          class="credential-list-shell"
        >
          <el-empty
            v-if="!passkeysLoading && passkeys.length === 0"
            :description="t('passkey.empty')"
          />

          <div
            v-else
            class="credential-list"
          >
            <article
              v-for="item in passkeys"
              :key="item.id"
              class="credential-item"
            >
              <div class="credential-item__icon is-passkey">
                <el-icon><Key /></el-icon>
              </div>

              <div class="credential-item__content">
                <div class="credential-item__head">
                  <h4>{{ item.display_name }}</h4>
                  <el-tag
                    size="small"
                    effect="plain"
                  >
                    {{ formatPasskeyTransports(item.transports) }}
                  </el-tag>
                </div>

                <div class="credential-item__meta">
                  <span>{{ t('passkey.lastUsedAt') }}: {{ item.last_used_at ? formatDateTime(item.last_used_at) : t('passkey.notUsed') }}</span>
                  <span>{{ t('passkey.createdAt') }}: {{ formatDateTime(item.created_at) }}</span>
                  <span v-if="item.aaguid">{{ t('passkey.aaguid') }}: {{ item.aaguid }}</span>
                </div>
              </div>

              <el-button
                type="danger"
                plain
                :loading="passkeyDeletingId === item.id"
                @click="handleDeletePasskey(item)"
              >
                {{ t('passkey.delete') }}
              </el-button>
            </article>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="passkeyDialogVisible = false">
          {{ t('common.close') }}
        </el-button>
      </template>
    </BaseDialog>

    <BaseDialog
      v-model="oauthDialogVisible"
      :title="t('profile.oauth.title')"
      width="700px"
    >
      <div
        v-loading="oauthAccountsLoading"
        class="credential-list-shell"
      >
        <el-empty
          v-if="!oauthAccountsLoading && oauthAccounts.length === 0"
          :description="t('profile.oauth.empty')"
        />

        <div
          v-else
          class="credential-list"
        >
          <article
            v-for="account in oauthAccounts"
            :key="account.id"
            class="credential-item"
          >
            <div
              class="credential-item__icon"
              :class="getOAuthProviderAccent(account.provider)"
            >
              <el-avatar
                v-if="account.avatar_url"
                :size="40"
                :src="account.avatar_url"
              />

              <template v-else>
                <i
                  v-if="account.provider === 'feishu'"
                  class="iconfont dudu-feishu"
                />
                <i
                  v-else-if="account.provider === 'wechat'"
                  class="iconfont dudu-icon-qiyeweixin"
                />
                <span v-else>{{ getOAuthProviderFallbackText(account.provider) }}</span>
              </template>
            </div>

            <div class="credential-item__content">
              <div class="credential-item__head">
                <h4>{{ getOAuthProviderLabel(account.provider) }}</h4>
                <span class="credential-item__sub">{{ account.display_name || '-' }}</span>
              </div>

              <div class="credential-item__meta">
                <span>{{ t('profile.oauth.boundAt') }}: {{ account.bound_at ? formatDateTime(account.bound_at) : '-' }}</span>
                <span v-if="account.last_login_at">{{ t('profile.oauth.lastLoginAt') }}: {{ formatDateTime(account.last_login_at) }}</span>
              </div>
            </div>

            <el-button
              type="danger"
              plain
              @click="openOAuthReauthDialog(account)"
            >
              {{ t('profile.oauth.unbind') }}
            </el-button>
          </article>
        </div>
      </div>

      <template #footer>
        <el-button @click="oauthDialogVisible = false">
          {{ t('common.close') }}
        </el-button>
      </template>
    </BaseDialog>

    <BaseDialog
      v-model="highRiskDialogVisible"
      :title="highRiskDialogTitle"
      width="460px"
      destroy-on-close
      @closed="handleHighRiskDialogClosed"
    >
      <div class="high-risk-dialog">
        <div
          v-if="highRiskRequiresConfirm && highRiskStep === 'confirm'"
          class="high-risk-confirm"
        >
          <p class="high-risk-confirm__desc">
            {{ highRiskConfirmDescription }}
          </p>
          <el-alert
            :title="highRiskWarningText"
            type="warning"
            :closable="false"
          />
        </div>

        <div
          v-else
          class="high-risk-reauth"
        >
          <ReauthPanel
            ref="highRiskReauthPanelRef"
            :model="highRiskReauth"
            :password="highRiskReauth.form.password"
            :totp-code="highRiskReauth.form.totp_code"
            :title="highRiskReauth.step === 'totp' ? highRiskTotpTitle : highRiskVerifyTitle"
            :description="highRiskReauth.step === 'totp' ? highRiskTotpTip : highRiskPasswordTitle"
            :unavailable-text="t('profile.reauth.unavailable')"
            :password-placeholder="t('profile.reauth.passwordPlaceholder')"
            :password-rules="reauthPasswordRules"
            :totp-rules="reauthTotpRules"
            @switch-method="switchHighRiskReauthMethod"
            @otp-complete="handleHighRiskOtpComplete"
            @update:password="highRiskReauth.form.password = $event"
            @update:totp-code="highRiskReauth.form.totp_code = $event"
          />
        </div>
      </div>

      <template #footer>
        <el-button @click="highRiskDialogVisible = false">
          {{ t('common.cancel') }}
        </el-button>
        <el-button
          :type="highRiskPrimaryButtonType"
          :loading="highRiskStep === 'confirm' ? false : highRiskBusy"
          :disabled="!canSubmitHighRisk"
          @click="handleHighRiskSubmit"
        >
          {{ highRiskSubmitButtonText }}
        </el-button>
      </template>
    </BaseDialog>
  </div>
</template>

<style lang="scss" scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-page__intro {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h1 {
    margin: 4px 0 10px;
    font-size: 30px;
    color: var(--app-text-primary);
  }

  p {
    margin: 0;
    color: var(--app-text-regular);
    line-height: 1.6;
  }
}

.profile-page__eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--el-color-primary);
}

.profile-page__top-grid {
  align-items: stretch;
  row-gap: 20px;
}

.section-card-header,
.profile-section__header {
  display: flex;
  flex-direction: column;
  gap: 6px;

  h2,
  h3 {
    margin: 0;
    color: var(--app-text-primary);
  }

  p {
    margin: 0;
    line-height: 1.6;
    color: var(--app-text-regular);
  }
}

.profile-editor-card {
  height: 100%;

  :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
    gap: 24px;
    height: 100%;
  }
}

.profile-editor-form {
  display: flex;
  flex-direction: column;
  gap: 8px;

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
}

.profile-editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.profile-editor-actions {
  display: flex;
  justify-content: flex-end;
}

.profile-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.profile-setting-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.form-tip {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--app-text-muted);
}

.action-dialog {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.action-dialog__steps {
  margin-bottom: 4px;
}

.action-dialog__step {
  min-height: 240px;

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
}

.action-dialog--single .action-dialog__step {
  min-height: auto;
}

.dialog-alert {
  margin-bottom: 8px;
}

.tfa-setup {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.tfa-setup--verify {
  justify-content: center;
  min-height: 240px;
}

.tfa-setup__header {
  display: flex;
  max-width: 360px;
  flex-direction: column;
  gap: 8px;
  text-align: center;

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

.tfa-setup__panel {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.tfa-setup__qr {
  display: flex;
  height: 180px;
  width: 180px;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  border: 1px dashed var(--app-border-strong);
  background: var(--app-surface-strong);
  padding: 8px;

  img {
    height: 100%;
    width: 100%;
  }
}

.tfa-setup__qr-placeholder {
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
  color: var(--app-text-muted);
}

.tfa-setup__meta,
.tfa-setup__key-block {
  display: flex;
  width: min(100%, 360px);
  flex-direction: column;
}

.tfa-setup__meta {
  gap: 14px;
}

.tfa-setup__tip {
  margin: 0;
  color: var(--app-text-regular);
  text-align: center;
}

.tfa-setup__key-block {
  gap: 8px;
}

.tfa-setup__key-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-secondary);
}

.tfa-setup__key-card {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-surface-muted);
  padding: 12px 12px 12px 16px;
}

.tfa-setup__key-value {
  flex: 1;
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--app-text-primary);
  word-break: break-all;

  &.is-empty {
    color: var(--app-text-muted);
    font-weight: 500;
  }
}

.tfa-setup__copy-btn {
  flex-shrink: 0;
  min-height: 42px;
  padding: 0 18px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 600;

  &:hover,
  &:focus-visible {
    border-color: var(--el-color-primary-light-5);
    background: var(--el-color-primary-light-8);
    color: var(--el-color-primary);
  }
}

.tfa-setup__key-hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--app-text-muted);
}

.tfa-setup__otp {
  width: 100%;
  margin-bottom: 0;

  :deep(.el-form-item__content) {
    justify-content: center;
  }

  :deep(.el-form-item__label) {
    justify-content: center;
    width: 100%;
  }
}

@media (max-width: 768px) {
  .tfa-setup__header {
    max-width: 100%;
  }

  .tfa-setup__meta,
  .tfa-setup__key-block {
    width: 100%;
  }

  .tfa-setup__key-card {
    flex-direction: column;
    align-items: stretch;
  }

  .tfa-setup__copy-btn {
    width: 100%;
  }
}

.credential-dialog {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.credential-toolbar {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  align-items: flex-start;
  padding: 18px;
  border-radius: 18px;
  background: var(--app-surface-muted);
  border: 1px solid var(--app-border);
}

.credential-toolbar__copy {
  display: flex;
  flex-direction: column;
  gap: 8px;

  strong {
    color: var(--app-text-primary);
  }

  p {
    margin: 0;
    line-height: 1.6;
    color: var(--app-text-regular);
  }
}

.credential-toolbar__controls {
  display: flex;
  min-width: min(100%, 340px);
  flex: 1;
  gap: 12px;

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

  .el-button {
    height: 48px;
    font-size: 15px;
    font-weight: 600;
    border-radius: 10px;
    background: var(--primary-gradient);
    border: none;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.25);
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.35);
    }
    
    &:active {
      transform: translateY(0);
    }
  }
}

.credential-list-shell {
  min-height: 160px;
}

.credential-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.credential-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  border-radius: 18px;
  border: 1px solid var(--app-border);
  background: var(--app-surface-muted);
  padding: 18px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--app-shadow-soft);
    border-color: var(--el-color-primary-light-7);
  }
}

.credential-item__icon {
  display: inline-flex;
  height: 48px;
  width: 48px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  font-size: 20px;
  background: var(--app-surface-strong);
  color: var(--app-text-primary);
  border: 1px solid var(--app-border);

  &.is-passkey {
    background: rgba(10, 126, 220, 0.12);
    border-color: rgba(10, 126, 220, 0.18);
    color: #0a7edc;
  }

  &.is-feishu {
    background: rgba(0, 214, 185, 0.12);
    border-color: rgba(0, 214, 185, 0.2);
    color: #00b99f;
  }

  &.is-wechat {
    background: rgba(43, 130, 234, 0.12);
    border-color: rgba(43, 130, 234, 0.2);
    color: #2b82ea;
  }

  &.is-default {
    background: rgba(15, 23, 42, 0.05);
    color: var(--app-text-regular);
  }

  :deep(.el-avatar) {
    background: transparent;
  }

  span {
    font-size: 18px;
    font-weight: 700;
  }
}

.credential-item__content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 8px;
}

.credential-item__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;

  h4 {
    margin: 0;
    font-size: 16px;
    color: var(--app-text-primary);
  }
}

.credential-item__sub {
  font-size: 13px;
  color: var(--app-text-regular);
}

.credential-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--app-text-muted);
}

.high-risk-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.high-risk-confirm {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.high-risk-confirm__desc {
  margin: 0;
  line-height: 1.6;
  color: var(--app-text-regular);
}

@media (max-width: 1200px) {
  .profile-setting-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .profile-page__intro h1 {
    font-size: 26px;
  }

  .profile-editor-grid,
  .credential-toolbar,
  .credential-toolbar__controls,
  .credential-item {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .profile-editor-actions {
    justify-content: stretch;

    :deep(.el-button) {
      width: 100%;
    }
  }

  .credential-item {
    align-items: stretch;
  }
}
</style>
