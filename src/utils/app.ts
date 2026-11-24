const DEFAULT_APP_NAME = 'DuDu Admin'

export function getAppName(fallback?: string): string {
  const configuredName = import.meta.env.VITE_APP_TITLE?.trim()
  if (configuredName) {
    return configuredName
  }

  const fallbackName = fallback?.trim()
  return fallbackName || DEFAULT_APP_NAME
}

export interface AppFooterMeta {
  name: string
  version: string
  repoUrl: string
  authorName: string
  authorUrl: string
}

export function getAppFooterMeta(fallbackName?: string): AppFooterMeta {
  const name = getAppName(fallbackName)
  const rawVersion = import.meta.env.VITE_APP_VERSION?.trim() || '1.0.0'
  const version = rawVersion.startsWith('v') ? rawVersion : `v${rawVersion}`
  const repoUrl = import.meta.env.VITE_APP_REPO_URL?.trim() || 'https://github.com/seakee/dudu-admin'
  const authorName = import.meta.env.VITE_APP_AUTHOR?.trim() || 'Seakee'
  const authorUrl = import.meta.env.VITE_APP_AUTHOR_URL?.trim() || 'https://github.com/seakee'

  return {
    name,
    version,
    repoUrl,
    authorName,
    authorUrl
  }
}
