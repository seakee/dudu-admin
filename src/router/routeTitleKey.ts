import type { RouteRecordRaw } from 'vue-router'
import { asyncRoutes, constantRoutes } from './routes'

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

function joinRoutePath(parentPath: string, childPath: string): string {
  if (!childPath) {
    return normalizePath(parentPath)
  }

  if (childPath.startsWith('/')) {
    return normalizePath(childPath)
  }

  return normalizePath(`${normalizePath(parentPath)}/${childPath}`)
}

function buildRouteTitleKeyMap(
  routes: RouteRecordRaw[],
  parentPath: string = '/',
  routeTitleKeyMap: Map<string, string> = new Map<string, string>()
): Map<string, string> {
  routes.forEach((route) => {
    const fullPath = joinRoutePath(parentPath, String(route.path || ''))
    const routeTitleKey = route.meta?.titleKey

    if (typeof routeTitleKey === 'string' && routeTitleKey) {
      routeTitleKeyMap.set(fullPath, routeTitleKey)
    }

    if (route.children?.length) {
      buildRouteTitleKeyMap(route.children, fullPath, routeTitleKeyMap)
    }
  })

  return routeTitleKeyMap
}

const routeTitleKeyMap = buildRouteTitleKeyMap([...constantRoutes, ...asyncRoutes])

export function resolveRouteTitleKeyByPath(path?: string): string | undefined {
  if (!path) {
    return undefined
  }

  return routeTitleKeyMap.get(normalizePath(path))
}

