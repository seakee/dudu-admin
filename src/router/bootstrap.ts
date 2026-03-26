import router, { resetRouter } from './index'
import { pinia, useAuthStore, usePermissionStore } from '@/stores'

let bootstrapPromise: Promise<void> | null = null

export function hasDynamicRoutes(): boolean {
  const permissionStore = usePermissionStore(pinia)
  return permissionStore.dynamicRoutes.length > 0
}

async function registerDynamicRoutes() {
  const authStore = useAuthStore(pinia)
  const permissionStore = usePermissionStore(pinia)
  const menus = await authStore.getMenus()

  if (!authStore.isLoggedIn) {
    return
  }

  resetRouter()
  permissionStore.resetRoutes()

  const routesToAdd = permissionStore.generateRoutes(menus)
  routesToAdd.forEach((route) => {
    router.addRoute(route)
  })
}

async function bootstrapDynamicRoutes(force = false): Promise<boolean> {
  const authStore = useAuthStore(pinia)

  if (!authStore.isLoggedIn) {
    return false
  }

  if (!force && hasDynamicRoutes()) {
    return true
  }

  if (bootstrapPromise) {
    await bootstrapPromise
    if (!force) {
      return hasDynamicRoutes()
    }
  }

  bootstrapPromise = (async () => {
    if (!authStore.userInfo) {
      await authStore.getProfile()
    }

    await registerDynamicRoutes()
  })().finally(() => {
    bootstrapPromise = null
  })

  await bootstrapPromise
  return hasDynamicRoutes()
}

export function ensureDynamicRoutesReady(): Promise<boolean> {
  return bootstrapDynamicRoutes(false)
}

export function refreshDynamicRoutes(): Promise<boolean> {
  return bootstrapDynamicRoutes(true)
}
