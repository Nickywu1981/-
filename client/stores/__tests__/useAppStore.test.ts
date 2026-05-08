import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// mock browser APIs for Node environment
const storage = {} as Record<string, string>;
vi.stubGlobal('window', {
  localStorage: {
    getItem: (k: string) => storage[k] ?? null,
    setItem: (k: string, v: string) => { storage[k] = v; },
    removeItem: (k: string) => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
  },
  matchMedia: () => ({ matches: false }),
  location: { href: '/' },
});
vi.stubGlobal('document', {
  documentElement: { setAttribute: () => {} },
});
// persist() accesses localStorage as a global, not window.localStorage
vi.stubGlobal('localStorage', window.localStorage);
const localStorage = (window as any).localStorage;

import { useAppStore } from '../../stores/useAppStore';

describe('useAppStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('initializes with defaults', () => {
    const store = useAppStore();
    expect(store.theme).toBe('auto');
    expect(store.locale).toBe('zh');
    expect(store.sidebarCollapsed).toBe(false);
    expect(store.loading).toBe(false);
  });

  it('setTheme updates theme and persists', () => {
    const store = useAppStore();
    store.setTheme('dark');
    expect(store.theme).toBe('dark');
    const saved = JSON.parse(localStorage.getItem('app-settings')!);
    expect(saved.theme).toBe('dark');
  });

  it('setLocale updates locale and persists', () => {
    const store = useAppStore();
    store.setLocale('en');
    expect(store.locale).toBe('en');
    const saved = JSON.parse(localStorage.getItem('app-settings')!);
    expect(saved.locale).toBe('en');
  });

  it('toggleSidebar toggles state', () => {
    const store = useAppStore();
    expect(store.sidebarCollapsed).toBe(false);
    store.toggleSidebar();
    expect(store.sidebarCollapsed).toBe(true);
    store.toggleSidebar();
    expect(store.sidebarCollapsed).toBe(false);
  });

  it('showLoading / hideLoading work correctly', () => {
    const store = useAppStore();
    store.showLoading('处理中...');
    expect(store.loading).toBe(true);
    expect(store.loadingText).toBe('处理中...');
    store.hideLoading();
    expect(store.loading).toBe(false);
    expect(store.loadingText).toBe('');
  });

  it('isDark getter works for explicit themes', () => {
    const store = useAppStore();
    store.setTheme('dark');
    expect(store.isDark).toBe(true);
    store.setTheme('light');
    expect(store.isDark).toBe(false);
  });
});
