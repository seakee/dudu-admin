// API 响应基础类型
export interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
  trace?: {
    desc?: string
  }
}

// 分页请求参数
export interface PaginationParams {
  page: number
  page_size: number
}

// 分页响应数据
export interface PaginationData<T> {
  list: T[]
  total: number
}

// 登录参数
export interface LoginParams {
  identifier?: string
  credentials: string
  grant_type: 'password' | 'totp' | 'feishu' | 'wechat'
  state?: string
}

export interface OAuthProfilePreview {
  user_name?: string
  avatar?: string
}

export type ReauthMethod = 'passkey' | 'password'

export interface ReauthResult {
  safe_code?: string
  reauth_ticket?: string
}

export interface ReauthMethodsResult {
  default_method: ReauthMethod
  available_methods: ReauthMethod[]
  password_requires_totp: boolean
  totp_enabled: boolean
  passkey_count: number
}

export interface PasskeyOptionsResult {
  challenge_id: string
  options: Record<string, unknown> & {
    publicKey?: Record<string, unknown>
  }
}

export interface PasskeyCredential {
  id: string
  raw_id?: string
  type?: string
  response: Record<string, unknown>
}

export interface PasskeyItem {
  id: number
  display_name: string
  aaguid?: string
  transports?: string[]
  last_used_at?: string | null
  created_at: string
}

// 登录响应
export interface LoginData {
  token?: string
  expires_in?: number
  safe_code?: string
  bind_ticket?: string
  oauth_profile?: OAuthProfilePreview
  syncable_fields?: string[]
}

// 用户信息
export interface UserInfo {
  id: number
  user_name: string
  role_name?: string
  email?: string
  phone?: string
  avatar?: string
  status?: number
  totp_enabled?: boolean
  passkey_count?: number
  access?: string[]
  created_at?: string
}

export interface OAuthAccount {
  id: number
  provider: string
  provider_tenant?: string
  display_name?: string
  avatar_url?: string
  bound_at?: string
  last_login_at?: string
}

// 角色
export interface Role {
  id?: number
  ID?: number
  name: string
  description: string
  created_at?: string
  updated_at?: string
  CreatedAt?: string
  UpdatedAt?: string
}

// 权限
export interface Permission {
  id?: number
  ID?: number
  name: string
  description: string
  type: string
  method?: string
  path?: string
  group?: string
  created_at?: string
  updated_at?: string
}

// 菜单
export interface Menu {
  id?: number
  ID?: number
  parent_id: number
  name: string
  i18n_key?: string
  path: string
  icon?: string
  sort: number
  hidden?: boolean
  permission_id: number
  children?: Menu[]
}

// 菜单响应数据
export interface MenusData {
  items: Menu[]
}
