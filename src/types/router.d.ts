import type { RouteRecordRaw } from 'vue-router'

// 扩展路由 meta 类型
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    titleKey?: string
    icon?: string
    hidden?: boolean
    noCache?: boolean
    affix?: boolean
    breadcrumb?: boolean
    activeMenu?: string
    permissions?: string[]
  }
}

// 菜单项类型
export interface MenuItem {
  id: number
  parent_id: number
  path: string
  name?: string
  title: string
  icon?: string
  hidden?: boolean
  children?: MenuItem[]
  permission_id?: number
}

// 动态路由类型
export type AppRouteRecordRaw = RouteRecordRaw & {
  hidden?: boolean
  children?: AppRouteRecordRaw[]
}
