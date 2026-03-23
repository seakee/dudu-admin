import request from './request'
import { buildApiPath } from './path'
import type { ApiResponse, PaginationParams, PaginationData, PasskeyItem, UserInfo } from '@/types/api'

export interface UserListParams extends PaginationParams {
  user_name?: string
  email?: string
  phone?: string
  status?: number
}

export interface CreateUserData {
  user_name?: string
  email?: string
  phone?: string
  password: string
  status?: number
  avatar?: string
}

export interface UpdateUserData {
  user_name?: string
  email?: string
  phone?: string
  password?: string
  status?: number
  avatar?: string
}

// 获取用户列表
export function getUserList(params: UserListParams) {
  return request.get<ApiResponse<PaginationData<UserInfo>>>(buildApiPath('/internal/admin/system/user/paginate'), { params })
}

// 获取用户详情
export function getUser(id: number) {
  return request.get<ApiResponse<UserInfo>>(buildApiPath('/internal/admin/system/user'), { params: { id } })
}

// 创建用户
export function createUser(data: CreateUserData) {
  return request.post<ApiResponse<UserInfo>>(buildApiPath('/internal/admin/system/user'), data)
}

// 更新用户
export function updateUser(id: number, data: UpdateUserData) {
  return request.put<ApiResponse<UserInfo>>(buildApiPath('/internal/admin/system/user'), { ...data, id })
}

// 删除用户
export function deleteUser(id: number) {
  return request.delete<ApiResponse<null>>(buildApiPath('/internal/admin/system/user'), { params: { id } })
}

// 获取用户角色
export function getUserRoles(userId: number) {
  return request.get<ApiResponse<number[]>>(buildApiPath('/internal/admin/system/user/role'), { params: { user_id: userId } })
}

// 设置用户角色
export function setUserRoles(userId: number, roleIds: number[]) {
  return request.put<ApiResponse<null>>(buildApiPath('/internal/admin/system/user/role'), { user_id: userId, role_ids: roleIds })
}

// 重置用户密码
export function resetUserPassword(userId: number, password: string) {
  return request.put<ApiResponse<null>>(buildApiPath('/internal/admin/system/user/password/reset'), { user_id: userId, password })
}

// 禁用用户双因子认证（管理员）
export function disableUserTfa(data: { user_id: number }) {
  return request.put<ApiResponse<null>>(buildApiPath('/internal/admin/system/user/tfa/disable'), data)
}

// 获取用户 Passkey 列表
export function getUserPasskeys(userId: number) {
  return request.get<ApiResponse<{ list: PasskeyItem[] }>>(buildApiPath('/internal/admin/system/user/passkeys'), {
    params: { user_id: userId }
  })
}

// 删除单个用户 Passkey
export function deleteUserPasskey(data: { user_id: number; id: number }) {
  return request.delete<ApiResponse<null>>(buildApiPath('/internal/admin/system/user/passkey'), { data })
}

// 删除用户全部 Passkey
export function deleteAllUserPasskeys(data: { user_id: number }) {
  return request.delete<ApiResponse<null>>(buildApiPath('/internal/admin/system/user/passkeys'), { data })
}
