import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function normalizeApiRoutePrefix(value?: string) {
  const trimmed = value?.trim()
  if (!trimmed || trimmed === '/') {
    return '/dudu-admin-api'
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`.replace(/\/+/g, '/')
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const apiRoutePrefix = normalizeApiRoutePrefix(env.VITE_API_ROUTE_PREFIX)

  return {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return

            if (id.includes('@element-plus/icons-vue')) return 'element-plus-icons'
            if (id.includes('element-plus')) return 'element-plus'
            if (id.includes('@fortawesome')) return 'fontawesome'

            if (
              id.includes('/vue/') ||
              id.includes('/@vue/') ||
              id.includes('vue-router') ||
              id.includes('pinia') ||
              id.includes('vue-i18n') ||
              id.includes('@vueuse/core')
            ) {
              return 'vue-vendor'
            }

            if (
              id.includes('axios') ||
              id.includes('crypto-js') ||
              id.includes('dayjs') ||
              id.includes('js-cookie') ||
              id.includes('nprogress') ||
              id.includes('pinia-plugin-persistedstate')
            ) {
              return 'app-vendor'
            }
          }
        }
      }
    },
    plugins: [
      vue(),
      AutoImport({
        imports: ['vue', 'vue-router', 'pinia', 'vue-i18n'],
        resolvers: [ElementPlusResolver({ importStyle: 'sass' })],
        dts: 'src/types/auto-imports.d.ts'
      }),
      Components({
        resolvers: [ElementPlusResolver({ importStyle: 'sass' })],
        dts: 'src/types/components.d.ts'
      })
    ],
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/assets/styles/element.scss" as *;`
        }
      }
    },
    server: {
      port: 3000,
      proxy: {
        [apiRoutePrefix]: {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true
        }
      }
    }
  }
})
