import { defineStore } from 'pinia'

type ThemeMode = 'light' | 'dark' | 'system'
type LayoutDensity = 'compact' | 'default' | 'comfortable'

function safeGetItem(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSetItem(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

interface SettingsState {
  theme: ThemeMode
  locale: string
  sidebarCollapsed: boolean
  layoutDensity: LayoutDensity
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    theme: (process.client ? safeGetItem('app-theme') : null) as ThemeMode || 'system',
    locale: (process.client ? safeGetItem('app-locale') : null) || 'zh-CN',
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
    _mqListener: null as ((e: MediaQueryListEvent) => void) | null,

    setTheme(mode: ThemeMode) {
      this.theme = mode
      if (process.client) {
        safeSetItem('app-theme', mode)
        const dark = this.isDark
        document.documentElement.classList.toggle('dark', dark)
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
      }
    },

    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },

    setLocale(locale: string) {
      this.locale = locale
      if (process.client) safeSetItem('app-locale', locale)
    },

    setDensity(d: LayoutDensity) {
      this.layoutDensity = d
    },

    init() {
      if (process.client) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        if (this._mqListener) mq.removeEventListener('change', this._mqListener)
        this._mqListener = () => {
          if (this.theme === 'system') {
            const dark = mq.matches
            document.documentElement.classList.toggle('dark', dark)
            document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
          }
        }
        mq.addEventListener('change', this._mqListener)
        const initDark = this.isDark
        document.documentElement.classList.toggle('dark', initDark)
        document.documentElement.setAttribute('data-theme', initDark ? 'dark' : 'light')
      }
    },
  },
})
