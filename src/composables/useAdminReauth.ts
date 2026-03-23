import CryptoJS from 'crypto-js'
import { getReauthMethods, reauthByPassword, reauthByTotp, getReauthPasskeyOptions, finishReauthPasskey } from '@/api/auth'
import type { ReauthMethod } from '@/types/api'
import { isHandledHttpError } from '@/utils/httpError'
import { getWebAuthnErrorI18nKey, isWebAuthnSupported, startPasskeyAuthentication } from '@/utils/webauthn'

type Translate = (key: string, params?: Record<string, unknown>) => string

type ReauthStep = ReauthMethod | 'totp'

export function useAdminReauth(t: Translate) {
  const methodsLoading = ref(false)
  const loading = ref(false)
  const step = ref<ReauthStep>('password')
  const selectedMethod = ref<ReauthMethod>('password')
  const availableMethods = ref<ReauthMethod[]>([])
  const passwordRequiresTotp = ref(false)
  const totpEnabled = ref(false)
  const passkeyCount = ref(0)
  const safeCode = ref('')
  const passkeySupported = ref(isWebAuthnSupported())

  const form = reactive({
    password: '',
    totp_code: ''
  })

  const hasPasskeyMethod = computed(() => availableMethods.value.includes('passkey'))
  const hasPasswordMethod = computed(() => availableMethods.value.includes('password'))

  const canSubmit = computed(() => {
    if (methodsLoading.value || loading.value) {
      return false
    }

    if (step.value === 'passkey') {
      return passkeySupported.value
    }

    if (step.value === 'totp') {
      return /^\d{6}$/.test(form.totp_code || '')
    }

    return !!form.password
  })

  function reset() {
    methodsLoading.value = false
    loading.value = false
    availableMethods.value = []
    passwordRequiresTotp.value = false
    totpEnabled.value = false
    passkeyCount.value = 0
    safeCode.value = ''
    form.password = ''
    form.totp_code = ''
    selectedMethod.value = 'password'
    step.value = 'password'
  }

  function pickMethod(preferredMethod?: ReauthMethod) {
    const candidates: ReauthMethod[] = []
    if (preferredMethod) {
      candidates.push(preferredMethod)
    }
    candidates.push(selectedMethod.value)

    for (const method of availableMethods.value) {
      if (!candidates.includes(method)) {
        candidates.push(method)
      }
    }

    const nextMethod = candidates.find((method) => (
      method === 'password' || (method === 'passkey' && passkeySupported.value)
    )) || availableMethods.value[0] || 'password'

    selectedMethod.value = nextMethod
    step.value = nextMethod
  }

  function switchMethod(method: ReauthMethod) {
    if (!availableMethods.value.includes(method)) {
      return
    }

    selectedMethod.value = method
    step.value = method
    safeCode.value = ''
    form.password = ''
    form.totp_code = ''
  }

  async function prepare(preferredMethod?: ReauthMethod) {
    reset()
    methodsLoading.value = true

    try {
      const { data } = await getReauthMethods()
      const result = data.data

      availableMethods.value = Array.isArray(result?.available_methods)
        ? result.available_methods
        : []
      passwordRequiresTotp.value = !!result?.password_requires_totp
      totpEnabled.value = !!result?.totp_enabled
      passkeyCount.value = Number(result?.passkey_count || 0)

      const defaultMethod = result?.default_method
      pickMethod(preferredMethod || defaultMethod || undefined)
    } finally {
      methodsLoading.value = false
    }
  }

  async function submit() {
    loading.value = true

    try {
      if (step.value === 'passkey') {
        const { data: optionsResponse } = await getReauthPasskeyOptions()
        const optionData = optionsResponse.data

        if (!optionData?.challenge_id || !optionData.options) {
          throw new Error(t('passkey.failed'))
        }

        try {
          const credential = await startPasskeyAuthentication(optionData.options)
          const { data: finishResponse } = await finishReauthPasskey({
            challenge_id: optionData.challenge_id,
            credential
          })

          const reauthTicket = finishResponse.data?.reauth_ticket
          if (!reauthTicket) {
            throw new Error(t('profile.message.updateFailed'))
          }

          return reauthTicket
        } catch (error) {
          if (isHandledHttpError(error)) {
            throw error
          }

          throw new Error(t(getWebAuthnErrorI18nKey(error)))
        }
      }

      if (step.value === 'totp') {
        const { data } = await reauthByTotp({
          safe_code: safeCode.value,
          totp_code: form.totp_code
        })

        const reauthTicket = data.data?.reauth_ticket
        if (!reauthTicket) {
          throw new Error(t('profile.message.updateFailed'))
        }

        return reauthTicket
      }

      const { data } = await reauthByPassword({
        password: CryptoJS.MD5(form.password).toString()
      })

      if (data.code === 11028) {
        const nextSafeCode = data.data?.safe_code
        if (!nextSafeCode) {
          throw new Error(t('login.error.safeCodeMissing'))
        }

        safeCode.value = nextSafeCode
        form.password = ''
        form.totp_code = ''
        step.value = 'totp'
        return null
      }

      const reauthTicket = data.data?.reauth_ticket
      if (!reauthTicket) {
        throw new Error(t('profile.message.updateFailed'))
      }

      return reauthTicket
    } finally {
      loading.value = false
    }
  }

  return reactive({
    methodsLoading,
    loading,
    step,
    selectedMethod,
    availableMethods,
    passwordRequiresTotp,
    totpEnabled,
    passkeyCount,
    safeCode,
    passkeySupported,
    form,
    hasPasskeyMethod,
    hasPasswordMethod,
    canSubmit,
    reset,
    switchMethod,
    prepare,
    submit
  })
}
