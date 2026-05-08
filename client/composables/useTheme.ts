export function useTheme() {
  const theme = ref<'light' | 'dark'>('dark');

  function apply(t: 'light' | 'dark') {
    theme.value = t;
    if (import.meta.client) {
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('app-theme', t);
    }
  }

  function toggle() {
    apply(theme.value === 'dark' ? 'light' : 'dark');
  }

  // 初始化：读取 localStorage 或系统偏好
  if (import.meta.client) {
    const saved = localStorage.getItem('app-theme') as 'light' | 'dark' | null;
    if (saved) {
      apply(saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      apply('dark');
    }
  }

  return { theme, toggle, apply };
}
