import router from './index'
import { useAuthStore, usePermissionStore } from '@/stores'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { i18n } from '@/i18n'
import { getAppName } from '@/utils/app'

NProgress.configure({ showSpinner: false })

const dynamicImportErrorPatternList = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading chunk [\w-]+ failed/i,
  /ChunkLoadError/i
]

const routeReloadMarkerPrefix = 'route:chunk-reload:'

function isDynamicImportError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return dynamicImportErrorPatternList.some((pattern) => pattern.test(message))
}

// 白名单路由
const whiteList = ['/login', '/404', '/password/reset', '/auth/callback']

router.beforeEach(async (to, _from, next) => {
  NProgress.start()

  const authStore = useAuthStore()
  const permissionStore = usePermissionStore()

  // 设置页面标题
  const { t } = i18n.global
  const titleKey = to.meta?.titleKey as string | undefined
  const rawTitle = to.meta?.title as string | undefined
  const title = titleKey ? t(titleKey) : rawTitle
  const appName = getAppName(t('app.name'))
  document.title = title ? `${title} - ${appName}` : appName

  // 已登录
  if (authStore.isLoggedIn) {
    if (to.path === '/login') {
      next({ path: '/' })
      NProgress.done()
    } else {
      // 检查是否已获取用户信息
      if (authStore.userInfo) {
        next()
      } else {
        try {
          // 获取用户信息
          await authStore.getProfile()

          // 获取菜单并生成动态路由
          await authStore.getMenus()

          // 添加动态路由
          const routesToAdd = permissionStore.generateRoutes(authStore.menus)
          routesToAdd.forEach((route) => {
            router.addRoute(route)
          })

          // 重新导航以确保路由正确加载
          next({ ...to, replace: true })
        } catch {
          // 获取信息失败，清除 token 并跳转登录
          authStore.resetAuth()
          next(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
          NProgress.done()
        }
      }
    }
  } else {
    // 未登录
    if (whiteList.includes(to.path)) {
      next()
    } else {
      next(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
      NProgress.done()
    }
  }
})

router.afterEach((to) => {
  NProgress.done()
  sessionStorage.removeItem(`${routeReloadMarkerPrefix}${to.fullPath}`)
})

router.onError((error, to) => {
  NProgress.done()

  if (!isDynamicImportError(error)) {
    console.error('[Router] navigation error:', error)
    return
  }

  const targetPath = to?.fullPath || router.currentRoute.value.fullPath || '/'
  const markerKey = `${routeReloadMarkerPrefix}${targetPath}`

  if (sessionStorage.getItem(markerKey)) {
    sessionStorage.removeItem(markerKey)
    console.error(`[Router] 动态资源加载失败，重试后仍失败: ${targetPath}`, error)
    router.replace('/404')
    return
  }

  sessionStorage.setItem(markerKey, '1')
  window.location.href = targetPath
})
