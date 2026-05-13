/**
 * 主题 composable — 读写与 useSettingsStore 共享的 app-theme key
 * 支持 'light' | 'dark' | 'system'（与 Pinia store 保持一致）
 */
export function useTheme() {
  const theme = ref<'light' | 'dark' | 'system'>('dark');

  function resolveSystem(): 'light' | 'dark' {
    if (import.meta.client && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  }

  function applyDark(isDark: boolean) {
    if (import.meta.client) {
      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
  }

  function apply(t: 'light' | 'dark' | 'system') {
    theme.value = t;
    if (import.meta.client) {
      try { localStorage.setItem('app-theme', t); } catch { /* storage unavailable */ }
      applyDark(t === 'system' ? resolveSystem() === 'dark' : t === 'dark');
    }
  }

  function toggle() {
    const current = theme.value === 'system' ? resolveSystem() : theme.value;
    apply(current === 'dark' ? 'light' : 'dark');
  }

  // 初始化：读取 localStorage（与 useSettingsStore 共享 key）
  if (import.meta.client) {
    let saved: string | null = null;
    try { saved = localStorage.getItem('app-theme'); } catch { /* storage unavailable */ }
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      apply(saved as 'light' | 'dark' | 'system');
    } else {
      apply('system');
    }
  }

  return { theme, toggle, apply };
}
