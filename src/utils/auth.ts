import Cookies from 'js-cookie'
import { resetRouter } from '@/router'

const TAGS_VIEW_LEGACY_STORAGE_KEY = 'tagsView'
const TAGS_VIEW_STORAGE_PREFIX = 'tagsView:scoped:'
const tokenKey = import.meta.env.VITE_TOKEN_KEY?.trim() || 'admin-token'

export function getToken(): string | undefined {
  return Cookies.get(tokenKey)
}

export function setToken(token: string, expires?: number): void {
  if (expires) {
    Cookies.set(tokenKey, token, { expires: expires / 86400 })
  } else {
    Cookies.set(tokenKey, token)
  }
}

export function removeToken(): void {
  Cookies.remove(tokenKey)
}

function clearTagsViewStorage() {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.removeItem(TAGS_VIEW_LEGACY_STORAGE_KEY)

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const storageKey = localStorage.key(index)
    if (storageKey?.startsWith(TAGS_VIEW_STORAGE_PREFIX)) {
      localStorage.removeItem(storageKey)
    }
  }
}

export function clearSessionArtifacts() {
  removeToken()
  resetRouter()

  if (typeof window === 'undefined') {
    return
  }

  localStorage.removeItem('auth')
  clearTagsViewStorage()
}
