import { defineStore } from 'pinia'
import { getInitialLocale, normalizeLocale, setI18nLocale, type Locale } from '@/i18n'

export type VisualEffectsMode = 'full' | 'reduced'

interface AppState {
  sidebar: {
    opened: boolean
    withoutAnimation: boolean
  }
  device: 'desktop' | 'mobile'
  size: 'default' | 'small' | 'large'
  theme: 'light' | 'dark' | 'auto'
  visualEffects: VisualEffectsMode
  tagsView: boolean
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
    visualEffects: 'full',
    tagsView: false,
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
    // 设置视觉效果模式（玻璃拟态 / 减弱动效）
    setVisualEffects(mode: VisualEffectsMode) {
      this.visualEffects = mode
    },
    toggleVisualEffects() {
      this.visualEffects = this.visualEffects === 'full' ? 'reduced' : 'full'
    },
    // 切换多页签栏显示
    setTagsView(enabled: boolean) {
      this.tagsView = enabled
    },
    toggleTagsView() {
      this.tagsView = !this.tagsView
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
    paths: ['sidebar.opened', 'size', 'theme', 'visualEffects', 'tagsView', 'locale']
  }
})
