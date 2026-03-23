import request from './request'
import { buildApiPath } from './path'
import type { ApiResponse, PaginationParams, PaginationData, Role } from '@/types/api'

export interface RoleListParams extends PaginationParams {
  name?: string
}

export interface CreateRoleData {
  name: string
  description?: string
}

export interface UpdateRoleData {
  name?: string
  description?: string
}

export interface RolePermissionMenuTreeNode {
  id: number
  name: string
  path: string
  permission_id: number
  parent_id: number
  icon?: string
  sort: number
  checked: boolean
  children?: RolePermissionMenuTreeNode[]
}

export interface RolePermissionMenuTreeData {
  items: RolePermissionMenuTreeNode[]
}

// 获取角色列表
export function getRoleList(params: RoleListParams) {
  return request.get<ApiResponse<PaginationData<Role>>>(buildApiPath('/internal/admin/system/role/paginate'), { params })
}

// 获取所有角色（不分页）
export function getAllRoles() {
  return request.get<ApiResponse<Role[]>>(buildApiPath('/internal/admin/system/role/list'))
}

// 获取角色详情
export function getRole(id: number) {
  return request.get<ApiResponse<Role>>(buildApiPath('/internal/admin/system/role'), { params: { id } })
}

// 创建角色
export function createRole(data: CreateRoleData) {
  return request.post<ApiResponse<Role>>(buildApiPath('/internal/admin/system/role'), data)
}

// 更新角色
export function updateRole(id: number, data: UpdateRoleData) {
  return request.put<ApiResponse<Role>>(buildApiPath('/internal/admin/system/role'), { ...data, id })
}

// 删除角色
export function deleteRole(id: number) {
  return request.delete<ApiResponse<null>>(buildApiPath('/internal/admin/system/role'), { params: { id } })
}

// 获取角色权限
export function getRolePermissions(roleId: number) {
  return request.get<ApiResponse<number[]>>(buildApiPath('/internal/admin/system/role/permission'), { params: { role_id: roleId } })
}

// 获取角色菜单权限树
export function getRolePermissionMenuTree(roleId: number) {
  return request.get<ApiResponse<RolePermissionMenuTreeData>>(buildApiPath('/internal/admin/system/role/permission/menu-tree'), {
    params: { role_id: roleId }
  })
}

// 设置角色权限
export function setRolePermissions(roleId: number, permissionIds: number[]) {
  return request.put<ApiResponse<null>>(buildApiPath('/internal/admin/system/role/permission'), { role_id: roleId, permission_ids: permissionIds })
}
