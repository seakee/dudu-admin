import { createApp } from 'vue'
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
