import { defineStore } from 'pinia'
import type { RouteLocationNormalized } from 'vue-router'
import { getToken } from '@/utils/auth'

const TAGS_VIEW_LEGACY_STORAGE_KEY = 'tagsView'
const TAGS_VIEW_STORAGE_PREFIX = 'tagsView:scoped'

interface PersistedAuthState {
  userId?: number | null
}

function getPersistedUserScope(): string {
  if (typeof window === 'undefined') {
    return 'guest'
  }

  try {
    const rawAuthState = localStorage.getItem('auth')
    if (rawAuthState) {
      const parsedAuthState = JSON.parse(rawAuthState) as PersistedAuthState
      if (typeof parsedAuthState?.userId === 'number' && parsedAuthState.userId > 0) {
        return `user:${parsedAuthState.userId}`
      }
    }
  } catch {
    // ignore
  }

  const token = getToken()
  if (token) {
    let hash = 0
    for (let index = 0; index < token.length; index += 1) {
      hash = ((hash << 5) - hash + token.charCodeAt(index)) | 0
    }
    return `token:${Math.abs(hash).toString(36)}`
  }

  return 'guest'
}

function getScopedStorageKey() {
  return `${TAGS_VIEW_STORAGE_PREFIX}:${getPersistedUserScope()}`
}

const tagsViewPersistStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
  getItem(_key: string) {
    if (typeof window === 'undefined') {
      return null
    }

    const scopedKey = getScopedStorageKey()
    const scopedValue = localStorage.getItem(scopedKey)
    if (scopedValue) {
      return scopedValue
    }

    const legacyValue = localStorage.getItem(TAGS_VIEW_LEGACY_STORAGE_KEY)
    if (legacyValue) {
      localStorage.setItem(scopedKey, legacyValue)
      localStorage.removeItem(TAGS_VIEW_LEGACY_STORAGE_KEY)
    }
    return legacyValue
  },
  setItem(_key: string, value: string) {
    if (typeof window === 'undefined') {
      return
    }

    localStorage.setItem(getScopedStorageKey(), value)
  },
  removeItem(_key: string) {
    if (typeof window === 'undefined') {
      return
    }

    localStorage.removeItem(getScopedStorageKey())
  }
}

interface TagView {
  path: string
  name: string
  title: string
  titleKey?: string
  affix?: boolean
  noCache?: boolean
}

interface TagsViewState {
  visitedViews: TagView[]
  cachedViews: string[]
}

export const useTagsViewStore = defineStore('tagsView', {
  state: (): TagsViewState => ({
    visitedViews: [],
    cachedViews: []
  }),

  actions: {
    // 添加视图
    addView(route: RouteLocationNormalized) {
      this.addVisitedView(route)
      this.addCachedView(route)
    },

    // 添加已访问视图
    addVisitedView(route: RouteLocationNormalized) {
      if (this.visitedViews.some((v) => v.path === route.path)) {
        return
      }
      this.visitedViews.push({
        path: route.path,
        name: route.name as string,
        title: route.meta?.title || 'no-name',
        titleKey: route.meta?.titleKey,
        affix: route.meta?.affix,
        noCache: route.meta?.noCache
      })
    },

    // 添加缓存视图
    addCachedView(route: RouteLocationNormalized) {
      if (route.meta?.noCache) {
        return
      }
      const name = route.name as string
      if (name && !this.cachedViews.includes(name)) {
        this.cachedViews.push(name)
      }
    },

    // 删除视图
    delView(route: RouteLocationNormalized) {
      this.delVisitedView(route)
      this.delCachedView(route)
    },

    // 删除已访问视图
    delVisitedView(route: RouteLocationNormalized) {
      const index = this.visitedViews.findIndex((v) => v.path === route.path)
      if (index > -1) {
        this.visitedViews.splice(index, 1)
      }
    },

    // 删除缓存视图
    delCachedView(route: RouteLocationNormalized) {
      const name = route.name as string
      const index = this.cachedViews.indexOf(name)
      if (index > -1) {
        this.cachedViews.splice(index, 1)
      }
    },

    // 删除其他视图
    delOthersViews(route: RouteLocationNormalized) {
      this.visitedViews = this.visitedViews.filter(
        (v) => v.affix || v.path === route.path
      )
      const name = route.name as string
      this.cachedViews = name ? [name] : []
    },

    // 删除所有视图
    delAllViews() {
      this.visitedViews = this.visitedViews.filter((v) => v.affix)
      this.cachedViews = []
    },

    // 重置所有视图
    resetViews() {
      this.visitedViews = []
      this.cachedViews = []
    },

    // 删除左侧视图
    delLeftViews(route: RouteLocationNormalized) {
      const index = this.visitedViews.findIndex((v) => v.path === route.path)
      if (index > 0) {
        const affixViews = this.visitedViews.slice(0, index).filter((v) => v.affix)
        this.visitedViews = [...affixViews, ...this.visitedViews.slice(index)]
      }
    },

    // 删除右侧视图
    delRightViews(route: RouteLocationNormalized) {
      const index = this.visitedViews.findIndex((v) => v.path === route.path)
      if (index < this.visitedViews.length - 1) {
        const affixViews = this.visitedViews.slice(index + 1).filter((v) => v.affix)
        this.visitedViews = [...this.visitedViews.slice(0, index + 1), ...affixViews]
      }
    },

    // 更新已访问视图
    updateVisitedView(route: RouteLocationNormalized) {
      const view = this.visitedViews.find((v) => v.path === route.path)
      if (view) {
        view.title = route.meta?.title || view.title
        view.titleKey = route.meta?.titleKey || view.titleKey
      }
    },

    // 恢复后过滤无效或重复视图
    pruneVisitedViews(isValidPath?: (path: string) => boolean) {
      const seenPathSet = new Set<string>()

      this.visitedViews = this.visitedViews.filter((view) => {
        if (!view.path || seenPathSet.has(view.path)) {
          return false
        }

        if (isValidPath && !isValidPath(view.path)) {
          return false
        }

        seenPathSet.add(view.path)
        return true
      })

      const validNameSet = new Set(this.visitedViews.map((view) => view.name).filter(Boolean))
      this.cachedViews = this.cachedViews.filter((name) => validNameSet.has(name))
    }
  },

  persist: {
    key: 'tagsView',
    storage: tagsViewPersistStorage,
    paths: ['visitedViews']
  }
})
