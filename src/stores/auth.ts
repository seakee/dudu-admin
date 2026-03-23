import { defineStore } from 'pinia'
import { login, getProfile, getMenus } from '@/api/auth'
import { clearSessionArtifacts, getToken, setToken } from '@/utils/auth'
import { useTagsViewStore } from './tagsView'
import { usePermissionStore } from './permission'
import type { LoginParams, LoginData, UserInfo, Menu, MenusData } from '@/types/api'

interface AuthState {
  token: string
  userId: number | null
  userInfo: UserInfo | null
  menus: Menu[]
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: getToken() || '',
    userId: null,
    userInfo: null,
    menus: []
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    userName: (state) => state.userInfo?.user_name || '',
    avatar: (state) => state.userInfo?.avatar || '',
    isTotpEnabled: (state) => state.userInfo?.totp_enabled || false
  },

  actions: {
    applySession(session: Pick<LoginData, 'token' | 'expires_in'>) {
      const token = session.token?.trim()
      if (!token) {
        return false
      }

      this.token = token
      this.userId = null
      this.userInfo = null
      this.menus = []
      setToken(token, session.expires_in)
      return true
    },

    // 登录
    async login(params: LoginParams) {
      const { data } = await login(params)
      if (data.code === 0 && data.data) {
        this.applySession(data.data)
      }
      // 无论是否成功，都返回完整数据供组件处理 (例如处理 11028 双因子认证)
      return data
    },

    // 获取用户信息
    async getProfile() {
      const { data } = await getProfile()
      const profile = data.data
      if (!profile || !profile.id) {
        this.userInfo = null
        this.userId = null
        throw new Error(data.msg || '用户信息无效')
      }

      this.userInfo = profile
      this.userId = profile.id
      return this.userInfo
    },

    // 获取菜单
    async getMenus() {
      const { data } = await getMenus()
      const menusData = data.data as Menu[] | MenusData
      const menus = Array.isArray(menusData)
        ? menusData
        : (menusData?.items || [])

      this.menus = menus
      return menus
    },

    // 退出登录
    async logout() {
      this.resetAuth()
    },

    // 重置认证状态
    resetAuth() {
      const tagsViewStore = useTagsViewStore()
      const permissionStore = usePermissionStore()
      tagsViewStore.resetViews()
      permissionStore.resetRoutes()

      this.token = ''
      this.userId = null
      this.userInfo = null
      this.menus = []
      clearSessionArtifacts()
    }
  },

  persist: {
    key: 'auth',
    paths: ['token', 'userId']
  }
})
