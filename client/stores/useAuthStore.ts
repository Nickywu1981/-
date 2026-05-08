import { defineStore } from 'pinia'
import { api } from '@/composables/useApi'

interface UserInfo {
  id: number
  nickname?: string
  username?: string
  email?: string
  avatar?: string
  role?: string
  credits?: number
}

interface AuthState {
  user: UserInfo | null
  isLoggedIn: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    isLoggedIn: false,
  }),

  getters: {
    userId: (state) => state.user?.id ?? null,
    userName: (state) => state.user?.nickname || state.user?.username || '',
    userTier: (state) => (state.user as any)?.tier ?? 'free',
    userCredits: (state) => state.user?.credits ?? 0,
  },

  actions: {
    init() {
      if (typeof window === 'undefined') return
      this.fetchUser()
    },

    async login(account: string, password: string) {
      const isEmail = account.includes('@')
      const body = isEmail ? { email: account, password } : { username: account, password }
      const data: any = await api.post('/auth/login', body)
      if (data) {
        this.user = data
        this.isLoggedIn = true
      }
      return data
    },

    async register(params: { phone?: string; email?: string; password: string; nickname?: string }) {
      const data: any = await api.post('/auth/register', params)
      if (data) {
        this.user = data
        this.isLoggedIn = true
      }
      return data
    },

    async fetchUser() {
      try {
        const data: any = await api.get('/user/profile')
        if (data) {
          this.user = data
          this.isLoggedIn = true
        }
      } catch {
        this.logout()
      }
    },

    async logout() {
      try {
        await api.post('/auth/logout')
      } catch { /* best-effort */ }
      this.user = null
      this.isLoggedIn = false
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    },
  },
})
