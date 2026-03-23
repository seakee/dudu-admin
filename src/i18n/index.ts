import { createI18n } from 'vue-i18n'
import enUS from './locales/en-US'
import zhCN from './locales/zh-CN'

export const SUPPORTED_LOCALES = ['en-US', 'zh-CN'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

const messages = {
  'en-US': enUS,
  'zh-CN': zhCN
}

export function normalizeLocale(input?: string): Locale {
  if (!input) return 'en-US'
  const lowered = input.toLowerCase()
  if (lowered.startsWith('zh')) return 'zh-CN'
  if (lowered.startsWith('en')) return 'en-US'
  return 'en-US'
}

function getStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('app')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const locale = parsed?.locale as string | undefined
    if (locale && SUPPORTED_LOCALES.includes(locale as Locale)) {
      return locale as Locale
    }
  } catch {
    // ignore
  }
  return null
}

export function getBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en-US'
  return normalizeLocale(navigator.language)
}

export function getInitialLocale(): Locale {
  return getStoredLocale() ?? getBrowserLocale()
}

const initialLocale = getInitialLocale()

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'en-US',
  messages
})

export function setI18nLocale(locale: Locale) {
  const normalized = normalizeLocale(locale)
  if (i18n.global.locale.value !== normalized) {
    i18n.global.locale.value = normalized
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalized
  }
  return normalized
}

export function getI18nLocale(): Locale {
  return normalizeLocale(i18n.global.locale.value as string)
}

setI18nLocale(initialLocale)
