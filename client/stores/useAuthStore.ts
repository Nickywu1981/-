import { defineStore } from 'pinia'

interface UserInfo {
  id: number
  nickname?: string
  username?: string
  email?: string
  avatar?: string
  avatar_url?: string
  role?: string
  tier?: string
  credits?: number
  points_balance?: number
}

interface AuthState {
  token: string | null  // kept for compatibility, unused with httpOnly cookies
  user: UserInfo | null
  isLoggedIn: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: null,
    user: null,
    isLoggedIn: false,
  }),

  getters: {
    userId: (state) => state.user?.id ?? null,
    userName: (state) => state.user?.nickname || state.user?.username || '',
    userTier: (state) => state.user?.tier ?? 'free',
    userCredits: (state) => state.user?.credits ?? 0,
  },

  actions: {
    init() {
      if (typeof window === 'undefined') return
      this.fetchUser()
    },

    async login(account: string, password: string) {
      const isEmail = account.includes('@')
      const body = isEmail ? { email: account, password } : { phone: account, password }
      const res: any = await $fetch('/api/auth/login', {
        method: 'POST',
        body,
      })
      if (res.code === 200) {
        this.user = res.data
        this.isLoggedIn = true
      }
      return res
    },

    async register(params: { phone?: string; email?: string; password: string; nickname?: string; invite_code?: string }) {
      const res: any = await $fetch('/api/auth/register', {
        method: 'POST',
        body: params,
      })
      if (res.code === 200) {
        this.user = res.data
        this.isLoggedIn = true
      }
      return res
    },

    async fetchUser() {
      try {
        const res: any = await $fetch('/api/user/profile')
        if (res.code === 200) {
          this.user = res.data
          this.isLoggedIn = true
        }
      } catch {
        this.logout()
      }
    },

    async logout() {
      try {
        await $fetch('/api/auth/logout', { method: 'POST' })
      } catch { /* best-effort */ }
      this.token = null
      this.user = null
      this.isLoggedIn = false
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    },
  },
})
