import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { clearSessionArtifacts, getToken } from '@/utils/auth'
import { isHandledHttpError, markHandledHttpError } from '@/utils/httpError'
import type { ApiResponse } from '@/types/api'
import { getI18nLocale, i18n } from '@/i18n'

import { useMockAdapter } from './mock'

const BUSINESS_CODE_I18N_KEY_MAP: Record<number, string> = {
  11000: 'request.code11000',
  11002: 'request.code11002',
  11007: 'request.code11007',
  11014: 'request.code11014',
  11015: 'request.code11015',
  11028: 'request.code11028',
  11001: 'request.code11001',
  11029: 'request.code11029',
  11032: 'request.code11032',
  11033: 'request.code11033',
  11034: 'request.code11034',
  11035: 'request.code11035',
  11040: 'request.code11040',
  11041: 'request.code11041',
  11042: 'request.code11042',
  11043: 'request.code11043',
  11044: 'request.code11044',
  11045: 'request.code11045',
  11046: 'request.code11046',
  11047: 'request.code11047',
  11048: 'request.code11048',
  11049: 'request.code11049',
  11050: 'request.code11050',
  11051: 'request.code11051',
  11052: 'request.code11052',
  11053: 'request.code11053',
  11054: 'request.code11054',
  11055: 'request.code11055',
  11056: 'request.code11056'
}

const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 启用 Mock 数据（由环境变量控制）
const useMock = import.meta.env.VITE_USE_MOCK === 'true'
if (useMock) {
  useMockAdapter(service)
}

// 请求拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken()
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    if (config.headers) {
      config.headers['lang'] = getI18nLocale()
    }
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const res = response.data
    const { t } = i18n.global

    // 业务逻辑错误
    if (res.code !== 0) {
      // 允许 11028(需要二次验证)、11015(需要重置密码)、11042(需要绑定第三方) 通过拦截器
      if (res.code === 11028 || res.code === 11015 || res.code === 11042) {
        return response
      }

      const fallbackMessage = t('request.failed')
      const mappedI18nKey = BUSINESS_CODE_I18N_KEY_MAP[res.code]
      const mappedMessage = mappedI18nKey ? t(mappedI18nKey) : ''
      const finalMessage = mappedMessage || res.msg || fallbackMessage

      ElMessage.error(finalMessage)

      // Token 过期或无效
      if ([10001, 11005, 11006, 11009, 401, 403].includes(res.code)) {
        ElMessageBox.confirm(t('request.sessionExpired'), t('navbar.dialogTitle'), {
          confirmButtonText: t('request.relogin'),
          cancelButtonText: t('common.cancel'),
          type: 'warning'
        }).then(() => {
          clearSessionArtifacts()
          window.location.href = '/login'
        })
      }

      return Promise.reject(markHandledHttpError(new Error(finalMessage), res.code))
    }

    return response
  },
  (error) => {
    console.error('Response error:', error)

    if (isHandledHttpError(error)) {
      return Promise.reject(error)
    }

    const { t } = i18n.global
    let message = t('request.network')
    if (error.response) {
      switch (error.response.status) {
        case 400:
          message = t('request.badRequest')
          break
        case 401:
          message = t('request.unauthorized')
          clearSessionArtifacts()
          window.location.href = '/login'
          break
        case 403:
          message = t('request.forbidden')
          break
        case 404:
          message = t('request.notFound')
          break
        case 500:
          message = t('request.serverError')
          break
        default:
          message = error.response.data?.msg || t('request.failed')
      }
    } else if (error.message.includes('timeout')) {
      message = t('request.timeout')
    }

    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default service
