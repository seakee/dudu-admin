import { defineStore } from 'pinia'
import type { RouteRecordRaw } from 'vue-router'
import type { Menu } from '@/types/api'
import { asyncRoutes } from '@/router/routes'
import { resolveRouteTitleKeyByPath } from '@/router/routeTitleKey'

interface PermissionState {
  routes: RouteRecordRaw[]
  dynamicRoutes: RouteRecordRaw[]
}

// 动态导入视图组件
const modules = import.meta.glob('@/views/**/*.vue')

// 布局组件
const Layout = () => import('@/layouts/default/index.vue')

function normalizePath(path: string): string {
  if (!path) {
    return '/'
  }

  let normalized = path.startsWith('/') ? path : `/${path}`
  normalized = normalized.replace(/\/+/g, '/')

  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1)
  }

  return normalized
}

function joinRoutePath(basePath: string, childPath: string): string {
  if (childPath.startsWith('/')) {
    return normalizePath(childPath)
  }
  return normalizePath(`${normalizePath(basePath)}/${childPath}`)
}

function getFirstAccessiblePath(route: RouteRecordRaw): string {
  const routePath = normalizePath(String(route.path || '/'))
  const firstChild = route.children?.find((child) => !!child.component)
  if (!firstChild) {
    return routePath
  }

  return joinRoutePath(routePath, String(firstChild.path || ''))
}

function createNotFoundRoute(): RouteRecordRaw {
  return {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
    meta: { hidden: true }
  }
}

function cloneRouteRecord(route: RouteRecordRaw): RouteRecordRaw {
  const clonedRoute: RouteRecordRaw = {
    ...route,
    meta: route.meta ? { ...route.meta } : route.meta
  }

  if (route.children?.length) {
    clonedRoute.children = route.children.map((child) => cloneRouteRecord(child))
  }

  return clonedRoute
}

function cloneRouteTree(routes: RouteRecordRaw[]): RouteRecordRaw[] {
  return routes.map((route) => cloneRouteRecord(route))
}

function buildFallbackMenuRoutes(routes: RouteRecordRaw[], parentPath: string = ''): RouteRecordRaw[] {
  const displayRoutes: RouteRecordRaw[] = []

  routes.forEach((route) => {
    const fullPath = joinRoutePath(parentPath, String(route.path || ''))
    if (route.meta?.hidden) {
      return
    }

    const children = route.children?.length
      ? buildFallbackMenuRoutes(route.children, fullPath)
      : undefined
    const hasDisplayTitle = typeof route.meta?.title === 'string' || typeof route.meta?.titleKey === 'string'

    if (!hasDisplayTitle) {
      if (children?.length) {
        displayRoutes.push(...children)
      }
      return
    }

    const clonedRoute = cloneRouteRecord(route)
    clonedRoute.path = fullPath

    if (children?.length) {
      clonedRoute.children = children
    } else {
      delete clonedRoute.children
    }

    displayRoutes.push(clonedRoute)
  })

  return displayRoutes
}

function buildFallbackRoutes(): {
  menuRoutes: RouteRecordRaw[]
  registerRoutes: RouteRecordRaw[]
} {
  const registerRoutes = cloneRouteTree(asyncRoutes)

  registerRoutes.forEach((route) => {
    if (route.children?.length && route.redirect) {
      route.redirect = getFirstAccessiblePath(route)
    }
  })

  return {
    menuRoutes: buildFallbackMenuRoutes(asyncRoutes),
    registerRoutes
  }
}

// 将菜单转换为路由
function menuToRoute(menu: Menu, parentPath: string = ''): RouteRecordRaw | null {
  const menuId = menu.id ?? menu.ID ?? 0
  const isTopLevel = !parentPath
  const fullPath = isTopLevel ? normalizePath(menu.path) : joinRoutePath(parentPath, menu.path)
  const routePath = isTopLevel || menu.path.startsWith('/')
    ? normalizePath(menu.path)
    : menu.path
  const routeTitleKey = menu.i18n_key || resolveRouteTitleKeyByPath(fullPath)

  // 查找对应的视图组件
  const componentPath = `/src/views${fullPath}/index.vue`
  const componentPathAlt = `/src/views${fullPath}.vue`
  const viewComponent = modules[componentPath] || modules[componentPathAlt]

  if (!isTopLevel && !viewComponent) {
    console.error(`[Permission] 菜单未匹配到视图组件，已跳过: ${fullPath}`)
    return null
  }

  const children = menu.children && menu.children.length > 0
    ? menu.children
      .map(child => menuToRoute(child, fullPath))
      .filter((route): route is RouteRecordRaw => !!route)
    : undefined

  const route: RouteRecordRaw = {
    path: routePath,
    name: `menu-${menuId}`,
    meta: {
      title: menu.name,
      titleKey: routeTitleKey,
      icon: menu.icon,
      hidden: menu.hidden
    },
    // 顶级菜单使用布局组件，子菜单使用视图组件
    component: isTopLevel ? Layout : viewComponent,
    children
  }

  // 顶级菜单如果有子菜单，设置默认重定向
  if (isTopLevel && children && children.length > 0) {
    route.redirect = getFirstAccessiblePath(route)
  }

  return route
}

export const usePermissionStore = defineStore('permission', {
  state: (): PermissionState => ({
    routes: [],
    dynamicRoutes: []
  }),

  actions: {
    // 根据菜单生成路由
    generateRoutes(menus: Menu[]): RouteRecordRaw[] {
      const generatedRoutes = menus
        .map(menu => menuToRoute(menu))
        .filter((route): route is RouteRecordRaw => !!route)

      let routesToRegister: RouteRecordRaw[] = []
      let routesToDisplay: RouteRecordRaw[] = []

      if (generatedRoutes.length > 0) {
        const firstPath = getFirstAccessiblePath(generatedRoutes[0])

        generatedRoutes.unshift({
          path: '/',
          redirect: firstPath,
          meta: { hidden: true }
        })

        if (!generatedRoutes.some((route) => route.path === '/:pathMatch(.*)*')) {
          generatedRoutes.push(createNotFoundRoute())
        }

        routesToRegister = generatedRoutes
        routesToDisplay = generatedRoutes
      } else {
        const fallbackRoutes = buildFallbackRoutes()
        routesToRegister = fallbackRoutes.registerRoutes
        routesToDisplay = fallbackRoutes.menuRoutes
      }

      this.dynamicRoutes = cloneRouteTree(routesToRegister)
      this.routes = cloneRouteTree(routesToDisplay)
      return cloneRouteTree(routesToRegister)
    },

    // 设置路由
    setRoutes(routes: RouteRecordRaw[]) {
      this.routes = cloneRouteTree(routes)
    },

    // 重置路由
    resetRoutes() {
      this.routes = []
      this.dynamicRoutes = []
    }
  }
})
