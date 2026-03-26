import router from './index'
import { useAuthStore } from '@/stores'
import { ensureDynamicRoutesReady, hasDynamicRoutes } from './bootstrap'
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

router.beforeEach(async (to) => {
  NProgress.start()

  const authStore = useAuthStore()
  const isBootstrapPlaceholder = to.matched.some((record) => {
    return Boolean(record.meta?.bootstrapPlaceholder)
  })

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
      return { path: '/' }
    }

    try {
      if (!hasDynamicRoutes()) {
        await ensureDynamicRoutesReady()
        return { ...to, replace: true }
      }

      if (isBootstrapPlaceholder) {
        return { path: '/404', replace: true }
      }

      return true
    } catch {
      // 获取信息失败，清除 token 并跳转登录
      authStore.resetAuth()
      NProgress.done()
      return `/login?redirect=${encodeURIComponent(to.fullPath)}`
    }
  }

  // 未登录
  if (whiteList.includes(to.path)) {
    return true
  }

  NProgress.done()
  return `/login?redirect=${encodeURIComponent(to.fullPath)}`
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
