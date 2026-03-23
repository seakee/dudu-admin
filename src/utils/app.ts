const DEFAULT_APP_NAME = 'DuDu Admin'

export function getAppName(fallback?: string): string {
  const configuredName = import.meta.env.VITE_APP_TITLE?.trim()
  if (configuredName) {
    return configuredName
  }

  const fallbackName = fallback?.trim()
  return fallbackName || DEFAULT_APP_NAME
}
