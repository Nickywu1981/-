import { defineStore } from 'pinia'

type ThemeMode = 'light' | 'dark' | 'system'
type LayoutDensity = 'compact' | 'default' | 'comfortable'

interface SettingsState {
  theme: ThemeMode
  locale: string
  sidebarCollapsed: boolean
  layoutDensity: LayoutDensity
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    theme: (process.client ? localStorage.getItem('app-theme') : null) as ThemeMode || 'system',
    locale: (process.client ? localStorage.getItem('app-locale') : null) || 'zh-CN',
    sidebarCollapsed: false,
    layoutDensity: 'default',
  }),

  getters: {
    isDark(state): boolean {
      if (state.theme === 'dark') return true
      if (state.theme === 'system' && process.client) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      return false
    },
    elSize(state): '' | 'small' | 'large' {
      if (state.layoutDensity === 'compact') return 'small'
      if (state.layoutDensity === 'comfortable') return 'large'
      return ''
    },
  },

  actions: {
    setTheme(mode: ThemeMode) {
      this.theme = mode
      if (process.client) {
        localStorage.setItem('app-theme', mode)
        document.documentElement.classList.toggle('dark', this.isDark)
      }
    },

    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },

    setLocale(locale: string) {
      this.locale = locale
      if (process.client) localStorage.setItem('app-locale', locale)
    },

    setDensity(d: LayoutDensity) {
      this.layoutDensity = d
    },

    init() {
      if (process.client) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        mq.addEventListener('change', () => {
          if (this.theme === 'system') document.documentElement.classList.toggle('dark', mq.matches)
        })
        document.documentElement.classList.toggle('dark', this.isDark)
      }
    },
  },
})
