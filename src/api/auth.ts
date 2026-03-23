import type { AxiosResponse } from 'axios'
import request from './request'
import { buildApiPath } from './path'
import type {
  ApiResponse,
  LoginParams,
  LoginData,
  UserInfo,
  MenusData,
  OAuthAccount,
  PasskeyCredential,
  PasskeyItem,
  PasskeyOptionsResult,
  ReauthMethodsResult,
  ReauthResult
} from '@/types/api'

// 登录
export function login(data: LoginParams) {
  return request.post<ApiResponse<LoginData>>(buildApiPath('/internal/admin/auth/token'), data)
}

// 获取用户信息
export function getProfile() {
  return request.get<ApiResponse<UserInfo>>(buildApiPath('/internal/admin/auth/profile'))
}

// 获取用户菜单
export function getMenus() {
  return request.get<ApiResponse<MenusData>>(buildApiPath('/internal/admin/auth/menus'))
}

// 修改密码
export function changePassword(data: { reauth_ticket: string; password: string }) {
  return request.put<ApiResponse<null>>(buildApiPath('/internal/admin/auth/password'), data)
}

// 重置密码
export function resetPassword(data: { safe_code: string; password: string }) {
  return request.put<ApiResponse<null>>(buildApiPath('/internal/admin/auth/password/reset'), data)
}

// 获取 TOTP 密钥
export function getTfaKey() {
  return request.get<ApiResponse<{ totp_key: string; qr_code: string }>>(buildApiPath('/internal/admin/auth/tfa/key'))
}

// 启用 TFA
export function enableTfa(data: { reauth_ticket: string; totp_key: string; totp_code: string }) {
  return request.put<ApiResponse<null>>(buildApiPath('/internal/admin/auth/tfa/enable'), data)
}

// 禁用 TFA
export function disableTfa(data: { reauth_ticket: string }) {
  return request.put<ApiResponse<null>>(buildApiPath('/internal/admin/auth/tfa/disable'), data)
}

// 获取 OAuth 授权 URL
export function getOAuthUrl(type: 'feishu' | 'wechat', login_type?: string) {
  return request.get<ApiResponse<{ url: string }>>(buildApiPath('/internal/admin/auth/oauth/url'), {
    params: { type, login_type }
  })
}

// 获取 Passkey 登录挑战
export function getPasskeyLoginOptions() {
  return request.post<ApiResponse<PasskeyOptionsResult>>(buildApiPath('/internal/admin/auth/passkey/login/options'), {})
}

// 完成 Passkey 登录
export function finishPasskeyLogin(data: { challenge_id: string; credential: PasskeyCredential }) {
  return request.post<ApiResponse<LoginData>>(buildApiPath('/internal/admin/auth/passkey/login/finish'), data)
}

// 更新个人信息
export function updateProfile(data: { user_name?: string; avatar?: string }) {
  return request.put<ApiResponse<null>>(buildApiPath('/internal/admin/auth/profile'), data)
}

// 更新登录标识
export function updateIdentifier(data: { reauth_ticket: string; email?: string; phone?: string }) {
  return request.put<ApiResponse<null>>(buildApiPath('/internal/admin/auth/identifier'), data)
}

// 本地账号重认证
export function reauthLocal(data: { identifier: string; password: string } | { safe_code: string; totp_code: string }) {
  return request.post<ApiResponse<ReauthResult>>(buildApiPath('/internal/admin/auth/reauth'), data)
}

// 获取已登录用户敏感操作验证方式
export function getReauthMethods() {
  return request.get<ApiResponse<ReauthMethodsResult>>(buildApiPath('/internal/admin/auth/reauth/methods'))
}

// 使用密码验证敏感操作
export function reauthByPassword(data: { password: string }) {
  return request.post<ApiResponse<ReauthResult>>(buildApiPath('/internal/admin/auth/reauth/password'), data)
}

// 使用 TOTP 完成敏感操作验证
export function reauthByTotp(data: { safe_code: string; totp_code: string }) {
  return request.post<ApiResponse<ReauthResult>>(buildApiPath('/internal/admin/auth/reauth/totp'), data)
}

// 获取 Passkey 敏感操作验证挑战
export function getReauthPasskeyOptions() {
  return request.post<ApiResponse<PasskeyOptionsResult>>(buildApiPath('/internal/admin/auth/reauth/passkey/options'), {})
}

// 完成 Passkey 敏感操作验证
export function finishReauthPasskey(data: { challenge_id: string; credential: PasskeyCredential }) {
  return request.post<ApiResponse<ReauthResult>>(buildApiPath('/internal/admin/auth/reauth/passkey/finish'), data)
}

// 确认绑定第三方账号
export function confirmOAuthBind(data: { bind_ticket: string; reauth_ticket: string; sync_fields?: string[] }) {
  return request.post<ApiResponse<LoginData>>(buildApiPath('/internal/admin/auth/oauth/bind/confirm'), data)
}

// 获取 Passkey 注册挑战
export function getPasskeyRegisterOptions(data: { reauth_ticket: string; display_name?: string }) {
  return request.post<ApiResponse<PasskeyOptionsResult>>(buildApiPath('/internal/admin/auth/passkey/register/options'), data || {})
}

// 完成 Passkey 注册
export function finishPasskeyRegister(data: { challenge_id: string; credential: PasskeyCredential }) {
  return request.post<ApiResponse<PasskeyItem>>(buildApiPath('/internal/admin/auth/passkey/register/finish'), data)
}

function normalizeOAuthAccounts(
  raw: { list?: OAuthAccount[] } | OAuthAccount[] | null | undefined
): OAuthAccount[] {
  if (Array.isArray(raw)) {
    return raw
  }

  if (raw && Array.isArray(raw.list)) {
    return raw.list
  }

  return []
}

function normalizePasskeys(
  raw: { list?: PasskeyItem[] } | PasskeyItem[] | null | undefined
): PasskeyItem[] {
  if (Array.isArray(raw)) {
    return raw
  }

  if (raw && Array.isArray(raw.list)) {
    return raw.list
  }

  return []
}

// 获取已绑定第三方账号
export async function getOAuthAccounts(): Promise<AxiosResponse<ApiResponse<OAuthAccount[]>>> {
  const response = await request.get<ApiResponse<{ list?: OAuthAccount[] } | OAuthAccount[]>>(buildApiPath('/internal/admin/auth/oauth/accounts'))

  return {
    ...response,
    data: {
      ...response.data,
      data: normalizeOAuthAccounts(response.data.data)
    }
  } as AxiosResponse<ApiResponse<OAuthAccount[]>>
}

// 获取当前用户 Passkey 列表
export async function getMyPasskeys(): Promise<AxiosResponse<ApiResponse<PasskeyItem[]>>> {
  const response = await request.get<ApiResponse<{ list?: PasskeyItem[] } | PasskeyItem[]>>(buildApiPath('/internal/admin/auth/passkeys'))

  return {
    ...response,
    data: {
      ...response.data,
      data: normalizePasskeys(response.data.data)
    }
  } as AxiosResponse<ApiResponse<PasskeyItem[]>>
}

// 删除当前用户 Passkey
export function deleteMyPasskey(data: { id: number; reauth_ticket: string }) {
  return request.delete<ApiResponse<null>>(buildApiPath('/internal/admin/auth/passkey'), { data })
}

// 解绑第三方账号
export function unbindOAuth(data: { identity_id: number; reauth_ticket: string }) {
  return request.post<ApiResponse<null>>(buildApiPath('/internal/admin/auth/oauth/unbind'), data)
}

// 获取双因子认证状态
export function getTfaStatus() {
  return request.get<ApiResponse<{ enable: boolean }>>(buildApiPath('/internal/admin/auth/tfa/status'))
}
