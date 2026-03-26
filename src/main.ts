import { createApp } from 'vue'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/es/components/loading/style/css'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import '@fortawesome/fontawesome-free/css/all.min.css'

import App from './App.vue'
import router from './router'
import { setupStore, useAuthStore } from './stores'
import { setupDirectives } from './directives'
import { i18n } from './i18n'
import { ensureDynamicRoutesReady } from './router/bootstrap'

import '@/assets/styles/index.scss'
import '@/router/guard'

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(i18n)
async function bootstrapApp() {
  setupStore(app)
  setupDirectives(app)

  try {
    await ensureDynamicRoutesReady()
  } catch {
    useAuthStore().resetAuth()
  }

  app.use(router)
  await router.isReady()
  app.mount('#app')
}

void bootstrapApp()
