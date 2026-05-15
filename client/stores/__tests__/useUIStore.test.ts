import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUIStore } from '../../stores/useUIStore'

describe('useUIStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes with default state', () => {
    const store = useUIStore()
    expect(store.pageLoading).toBe(false)
    expect(store.globalLoading).toBe(false)
    expect(store.loadingText).toBe('')
    expect(store.toasts).toEqual([])
    expect(store.modals).toEqual([])
  })

  describe('loading', () => {
    it('startPageLoading sets pageLoading and loadingText', () => {
      const store = useUIStore()
      store.startPageLoading('Please wait...')
      expect(store.pageLoading).toBe(true)
      expect(store.loadingText).toBe('Please wait...')
    })

    it('startPageLoading uses default text', () => {
      const store = useUIStore()
      store.startPageLoading()
      expect(store.pageLoading).toBe(true)
      expect(store.loadingText).toBe('Loading...')
    })

    it('stopPageLoading resets pageLoading and loadingText', () => {
      const store = useUIStore()
      store.startPageLoading('Loading')
      store.stopPageLoading()
      expect(store.pageLoading).toBe(false)
      expect(store.loadingText).toBe('')
    })

    it('setGlobalLoading sets globalLoading and loadingText', () => {
      const store = useUIStore()
      store.setGlobalLoading(true, 'Syncing...')
      expect(store.globalLoading).toBe(true)
      expect(store.loadingText).toBe('Syncing...')
    })

    it('isLoading returns true when either loading is active', () => {
      const store = useUIStore()
      expect(store.isLoading).toBe(false)
      store.pageLoading = true
      expect(store.isLoading).toBe(true)
      store.pageLoading = false
      store.globalLoading = true
      expect(store.isLoading).toBe(true)
      store.globalLoading = false
      expect(store.isLoading).toBe(false)
    })
  })

  describe('toasts', () => {
    it('toast adds a toast and returns numeric id', () => {
      const store = useUIStore()
      const id = store.toast('Hello world', 'success')
      expect(store.toasts).toHaveLength(1)
      expect(store.toasts[0].message).toBe('Hello world')
      expect(store.toasts[0].type).toBe('success')
      expect(store.toasts[0].duration).toBe(3000)
      expect(typeof id).toBe('number')
      expect(id).toBeGreaterThan(0)
    })

    it('toast defaults type to info and duration to 3000', () => {
      const store = useUIStore()
      store.toast('Default toast')
      expect(store.toasts[0].type).toBe('info')
      expect(store.toasts[0].duration).toBe(3000)
    })

    it('toast auto-removes after duration via timer', () => {
      const store = useUIStore()
      store.toast('Auto-remove', 'info', 500)
      expect(store.toasts).toHaveLength(1)
      vi.advanceTimersByTime(600)
      expect(store.toasts).toHaveLength(0)
    })

    it('toast with duration 0 does not auto-remove', () => {
      const store = useUIStore()
      store.toast('Persistent', 'error', 0)
      vi.advanceTimersByTime(10000)
      expect(store.toasts).toHaveLength(1)
    })

    it('removeToast removes a specific toast and clears timer', () => {
      const store = useUIStore()
      const id = store.toast('Keep me', 'info', 1000)
      store.toast('Remove me', 'error', 1000)
      store.removeToast(id)
      expect(store.toasts).toHaveLength(1)
      expect(store.toasts[0].message).toBe('Remove me')
    })

    it('toast ids increment across calls', () => {
      const store = useUIStore()
      const id1 = store.toast('First')
      const id2 = store.toast('Second')
      expect(id2).toBeGreaterThan(id1)
    })
  })

  describe('modals', () => {
    it('openModal adds a modal and sets currentModal', () => {
      const store = useUIStore()
      store.openModal('ConfirmDialog', { title: 'Are you sure?' })
      expect(store.modals).toHaveLength(1)
      expect(store.currentModal?.component).toBe('ConfirmDialog')
      expect(store.currentModal?.props).toEqual({ title: 'Are you sure?' })
    })

    it('openModal returns a Promise', () => {
      const store = useUIStore()
      const result = store.openModal('TestModal')
      expect(result).toBeInstanceOf(Promise)
    })

    it('closeModal resolves with result and removes last modal', async () => {
      const store = useUIStore()
      const promise = store.openModal('TestModal')
      store.closeModal('confirmed')
      const result = await promise
      expect(result).toBe('confirmed')
      expect(store.modals).toHaveLength(0)
    })

    it('closeAllModals closes all modals', () => {
      const store = useUIStore()
      store.openModal('Modal1')
      store.openModal('Modal2')
      store.closeAllModals()
      expect(store.modals).toHaveLength(0)
    })

    it('currentModal returns null when no modals', () => {
      const store = useUIStore()
      expect(store.currentModal).toBeNull()
    })
  })
})
