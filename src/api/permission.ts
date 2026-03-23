import type { AxiosResponse } from 'axios'
import request from './request'
import { buildApiPath } from './path'
import type { ApiResponse, PaginationParams, PaginationData, Permission, Menu } from '@/types/api'

export interface PermissionListParams extends PaginationParams {
  name?: string
  type?: string
  group?: string
  method?: string
}

export interface CreatePermissionData {
  name: string
  type: string
  method: string
  path: string
  description: string
  group: string
}

export interface UpdatePermissionData {
  name?: string
  type?: string
  method?: string
  path?: string
  description?: string
  group?: string
}

export interface AvailablePermissionRoute {
  method: string
  path: string
}

function normalizeAvailablePermissions(
  raw: Record<string, string[] | undefined> | null | undefined
): AvailablePermissionRoute[] {
  if (!raw || typeof raw !== 'object') {
    return []
  }

  const routes: AvailablePermissionRoute[] = []
  Object.entries(raw).forEach(([method, paths]) => {
    if (!Array.isArray(paths)) {
      return
    }

    paths.forEach((path) => {
      if (typeof path !== 'string') {
        return
      }

      routes.push({
        method: method.toUpperCase(),
        path
      })
    })
  })

  return routes
}

// 获取权限列表
export function getPermissionList(params: PermissionListParams) {
  return request.get<ApiResponse<PaginationData<Permission>>>(buildApiPath('/internal/admin/system/permission/paginate'), { params })
}

// 获取权限列表（按分组）
export async function getAllPermissions(type: string): Promise<AxiosResponse<ApiResponse<Permission[]>>> {
  const response = await request.get<ApiResponse<Permission[] | Record<string, Permission[]>>>(
    buildApiPath('/internal/admin/system/permission/list'),
    { params: { type } }
  )
  const raw = response.data.data
  if (raw && !Array.isArray(raw) && typeof raw === 'object') {
    const list = Object.values(raw).flat()
    response.data.data = list
  }
  return response as unknown as AxiosResponse<ApiResponse<Permission[]>>
}

// 获取可用权限列表（系统已注册路由）
export async function getAvailablePermissions(): Promise<AxiosResponse<ApiResponse<AvailablePermissionRoute[]>>> {
  const response = await request.get<ApiResponse<Record<string, string[]>>>(
    buildApiPath('/internal/admin/system/permission/available')
  )

  return {
    ...response,
    data: {
      ...response.data,
      data: normalizeAvailablePermissions(response.data.data)
    }
  } as AxiosResponse<ApiResponse<AvailablePermissionRoute[]>>
}

// 获取权限分组列表
export async function getPermissionGroups(type: string): Promise<AxiosResponse<ApiResponse<string[]>>> {
  const response = await request.get<ApiResponse<Permission[] | Record<string, Permission[]>>>(
    buildApiPath('/internal/admin/system/permission/list'),
    { params: { type } }
  )
  const raw = response.data.data
  let groups: string[] = []
  if (Array.isArray(raw)) {
    groups = [...new Set(raw.map((p) => p.group).filter(Boolean) as string[])]
  } else if (raw && typeof raw === 'object') {
    groups = Object.keys(raw)
  }
  return {
    ...response,
    data: {
      ...response.data,
      data: groups
    }
  } as AxiosResponse<ApiResponse<string[]>>
}

// 获取权限详情
export function getPermission(id: number) {
  return request.get<ApiResponse<Permission>>(buildApiPath('/internal/admin/system/permission'), { params: { id } })
}

// 创建权限
export function createPermission(data: CreatePermissionData) {
  return request.post<ApiResponse<Permission>>(buildApiPath('/internal/admin/system/permission'), data)
}

// 更新权限
export function updatePermission(id: number, data: UpdatePermissionData) {
  return request.put<ApiResponse<Permission>>(buildApiPath('/internal/admin/system/permission'), { ...data, id })
}

// 删除权限
export function deletePermission(id: number) {
  return request.delete<ApiResponse<null>>(buildApiPath('/internal/admin/system/permission'), { params: { id } })
}

// 菜单管理 API

export interface CreateMenuData {
  parent_id: number
  name: string
  path: string
  icon?: string
  sort?: number
}

export interface UpdateMenuData {
  parent_id?: number
  name?: string
  path?: string
  icon?: string
  sort?: number
}

// 获取菜单树
export async function getMenuTree(): Promise<AxiosResponse<ApiResponse<Menu[]>>> {
  const response = await request.get<ApiResponse<Menu[] | { items: Menu[] }>>(buildApiPath('/internal/admin/system/menu/list'))
  const raw = response.data.data
  const items = Array.isArray(raw) ? raw : raw?.items || []
  return {
    ...response,
    data: {
      ...response.data,
      data: items
    }
  } as AxiosResponse<ApiResponse<Menu[]>>
}

// 获取菜单列表
export async function getMenuList(): Promise<AxiosResponse<ApiResponse<Menu[]>>> {
  const response = await request.get<ApiResponse<Menu[] | { items: Menu[] }>>(buildApiPath('/internal/admin/system/menu/list'))
  const raw = response.data.data
  const items = Array.isArray(raw) ? raw : raw?.items || []
  return {
    ...response,
    data: {
      ...response.data,
      data: items
    }
  } as AxiosResponse<ApiResponse<Menu[]>>
}

// 获取菜单详情
export function getMenu(id: number) {
  return request.get<ApiResponse<Menu>>(buildApiPath('/internal/admin/system/menu'), { params: { id } })
}

// 创建菜单
export function createMenu(data: CreateMenuData) {
  return request.post<ApiResponse<Menu>>(buildApiPath('/internal/admin/system/menu'), data)
}

// 更新菜单
export function updateMenu(id: number, data: UpdateMenuData) {
  return request.put<ApiResponse<Menu>>(buildApiPath('/internal/admin/system/menu'), { ...data, id })
}

// 删除菜单
export function deleteMenu(id: number) {
  return request.delete<ApiResponse<null>>(buildApiPath('/internal/admin/system/menu'), { params: { id } })
}
