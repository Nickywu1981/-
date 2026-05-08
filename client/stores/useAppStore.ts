import { defineStore } from 'pinia';

type Theme = 'light' | 'dark' | 'auto';
type Locale = 'zh' | 'en' | 'es';

interface AppState {
  theme: Theme;
  locale: Locale;
  sidebarCollapsed: boolean;
  loading: boolean;
  loadingText: string;
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    theme: 'auto',
    locale: 'zh',
    sidebarCollapsed: false,
    loading: false,
    loadingText: '',
  }),

  getters: {
    isDark: (state) => {
      if (state.theme === 'dark') return true;
      if (state.theme === 'light') return false;
      if (typeof window === 'undefined') return false;
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    },
    currentLocale: (state) => state.locale,
  },

  actions: {
    init() {
      if (typeof window === 'undefined') return;
      const saved = localStorage.getItem('app-settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.theme) this.theme = parsed.theme;
          if (parsed.locale) this.locale = parsed.locale;
        } catch { /* ignore */ }
      }
      this.applyTheme();
    },

    setTheme(theme: Theme) {
      this.theme = theme;
      this.applyTheme();
      this.persist();
    },

    applyTheme() {
      if (typeof window === 'undefined') return;
      const dark = this.isDark;
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    },

    setLocale(locale: Locale) {
      this.locale = locale;
      this.persist();
    },

    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },

    showLoading(text = '加载中...') {
      this.loading = true;
      this.loadingText = text;
    },

    hideLoading() {
      this.loading = false;
      this.loadingText = '';
    },

    persist() {
      if (typeof window === 'undefined') return;
      localStorage.setItem('app-settings', JSON.stringify({
        theme: this.theme,
        locale: this.locale,
      }));
    },
  },
});
