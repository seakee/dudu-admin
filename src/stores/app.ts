import { defineStore } from 'pinia'
import { getInitialLocale, normalizeLocale, setI18nLocale, type Locale } from '@/i18n'

interface AppState {
  sidebar: {
    opened: boolean
    withoutAnimation: boolean
  }
  device: 'desktop' | 'mobile'
  size: 'default' | 'small' | 'large'
  theme: 'light' | 'dark' | 'auto'
  locale: Locale
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    sidebar: {
      opened: true,
      withoutAnimation: false
    },
    device: 'desktop',
    size: 'default',
    theme: 'auto',
    locale: getInitialLocale()
  }),

  getters: {
    sidebarOpened: (state) => state.sidebar.opened
  },

  actions: {
    // 切换侧边栏
    toggleSidebar() {
      this.sidebar.opened = !this.sidebar.opened
      this.sidebar.withoutAnimation = false
    },

    // 关闭侧边栏
    closeSidebar(withoutAnimation = false) {
      this.sidebar.opened = false
      this.sidebar.withoutAnimation = withoutAnimation
    },

    // 打开侧边栏
    openSidebar(withoutAnimation = false) {
      this.sidebar.opened = true
      this.sidebar.withoutAnimation = withoutAnimation
    },

    // 切换设备类型
    toggleDevice(device: 'desktop' | 'mobile') {
      this.device = device
    },

    // 设置组件尺寸
    setSize(size: 'default' | 'small' | 'large') {
      this.size = size
    },

    // 设置配色方案
    setTheme(theme: 'light' | 'dark' | 'auto') {
      this.theme = theme
    },
    // 设置语言
    setLocale(locale: Locale) {
      const normalized = normalizeLocale(locale)
      this.locale = normalized
      setI18nLocale(normalized)
    }
  },

  persist: {
    key: 'app',
    paths: ['sidebar.opened', 'size', 'theme', 'locale']
  }
})
