import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Stub globals used by useSettingsStore before import
// Preserve process.env (Pinia needs NODE_ENV) while adding client
Object.defineProperty(process, 'client', { value: true, writable: true, configurable: true })

const localStorageStore: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key] }),
  clear: vi.fn(() => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]) }),
}

vi.stubGlobal('localStorage', localStorageMock)

const matchMediaMock = vi.fn((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

const classListMock = {
  toggle: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
  contains: vi.fn(),
}

const setAttrMock = vi.fn()

vi.stubGlobal('window', {
  matchMedia: matchMediaMock,
})

vi.stubGlobal('document', {
  documentElement: {
    classList: classListMock,
    setAttribute: setAttrMock,
  },
})

import { useSettingsStore } from '../../stores/useSettingsStore'

describe('useSettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // Reset localStorage mock state
    Object.keys(localStorageStore).forEach(k => delete localStorageStore[k])
  })

  it('initializes with default state values', () => {
    const store = useSettingsStore()
    expect(store.theme).toBe('system')
    expect(store.locale).toBe('zh-CN')
    expect(store.sidebarCollapsed).toBe(false)
    expect(store.layoutDensity).toBe('default')
  })

  it('setTheme changes theme and persists to localStorage', () => {
    const store = useSettingsStore()
    store.setTheme('dark')
    expect(store.theme).toBe('dark')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('app-theme', 'dark')
  })

  it('setTheme applies dark class to document', () => {
    const store = useSettingsStore()
    store.setTheme('dark')
    expect(classListMock.toggle).toHaveBeenCalledWith('dark', true)
    expect(setAttrMock).toHaveBeenCalledWith('data-theme', 'dark')
  })

  it('setTheme removes dark class for light theme', () => {
    const store = useSettingsStore()
    store.setTheme('light')
    expect(classListMock.toggle).toHaveBeenCalledWith('dark', false)
    expect(setAttrMock).toHaveBeenCalledWith('data-theme', 'light')
  })

  it('setTheme(system) reads matchMedia and applies correct class', () => {
    const store = useSettingsStore()
    matchMediaMock.mockReturnValue({
      matches: true,
      media: '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    store.setTheme('system')
    expect(store.theme).toBe('system')
    expect(classListMock.toggle).toHaveBeenCalledWith('dark', true)
    // When matchMedia.matches is true, data-theme is 'dark'
    expect(setAttrMock).toHaveBeenCalledWith('data-theme', 'dark')
  })

  it('toggleSidebar toggles sidebarCollapsed', () => {
    const store = useSettingsStore()
    expect(store.sidebarCollapsed).toBe(false)
    store.toggleSidebar()
    expect(store.sidebarCollapsed).toBe(true)
    store.toggleSidebar()
    expect(store.sidebarCollapsed).toBe(false)
  })

  it('setLocale updates locale and persists to localStorage', () => {
    const store = useSettingsStore()
    store.setLocale('en-US')
    expect(store.locale).toBe('en-US')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('app-locale', 'en-US')
  })

  it('setDensity changes layoutDensity', () => {
    const store = useSettingsStore()
    store.setDensity('compact')
    expect(store.layoutDensity).toBe('compact')
    store.setDensity('comfortable')
    expect(store.layoutDensity).toBe('comfortable')
  })

  describe('getters', () => {
    it('isDark returns true when theme is dark', () => {
      const store = useSettingsStore()
      store.setTheme('dark')
      expect(store.isDark).toBe(true)
    })

    it('isDark returns false when theme is light', () => {
      const store = useSettingsStore()
      store.setTheme('light')
      expect(store.isDark).toBe(false)
    })

    it('isDark reads matchMedia when theme is system', () => {
      const store = useSettingsStore()
      // Start from a different theme to force getter recomputation
      store.theme = 'light'

      // Dark OS preference
      matchMediaMock.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })
      store.theme = 'system'
      expect(store.isDark).toBe(true)

      // Light OS preference — toggle theme to force recomputation
      matchMediaMock.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })
      store.theme = 'light'
      store.theme = 'system'
      expect(store.isDark).toBe(false)
    })

    it('elSize maps compact to small', () => {
      const store = useSettingsStore()
      store.setDensity('compact')
      expect(store.elSize).toBe('small')
    })

    it('elSize maps comfortable to large', () => {
      const store = useSettingsStore()
      store.setDensity('comfortable')
      expect(store.elSize).toBe('large')
    })

    it('elSize maps default to empty string', () => {
      const store = useSettingsStore()
      store.setDensity('default')
      expect(store.elSize).toBe('')
    })
  })
})
