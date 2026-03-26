import { createRouter, createWebHistory } from 'vue-router'
import type { App } from 'vue'
import { getBaseRoutes } from './routes'

function createRouterOptions() {
  return {
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: getBaseRoutes(),
    scrollBehavior: () => ({ left: 0, top: 0 })
  }
}

const router = createRouter(createRouterOptions())

// 重置路由
export function resetRouter() {
  const newRouter = createRouter(createRouterOptions())
  // @ts-ignore
  router.matcher = newRouter.matcher
}

export function setupRouter(app: App) {
  app.use(router)
}

export default router
