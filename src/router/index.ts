import { createRouter, createWebHistory } from 'vue-router'
import type { App } from 'vue'
import { constantRoutes } from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: constantRoutes,
  scrollBehavior: () => ({ left: 0, top: 0 })
})

// 重置路由
export function resetRouter() {
  const newRouter = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: constantRoutes,
    scrollBehavior: () => ({ left: 0, top: 0 })
  })
  // @ts-ignore
  router.matcher = newRouter.matcher
}

export function setupRouter(app: App) {
  app.use(router)
}

export default router
