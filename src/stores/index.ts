import type { App } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

export function setupStore(app: App) {
  app.use(pinia)
}

export { pinia }

// 导出所有 stores
export * from './auth'
export * from './app'
export * from './tagsView'
export * from './permission'
