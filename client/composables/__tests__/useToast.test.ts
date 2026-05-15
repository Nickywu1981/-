import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Vue lifecycle hooks: fire onMounted callbacks immediately
// The auto-import shim transforms useToast.ts to import onMounted/onUnmounted from 'vue'
vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')
  return {
    ...actual,
    onMounted: vi.fn((fn: () => void) => { fn() }),
    onUnmounted: vi.fn(() => {}),
  }
})

// Setup window.__toast mock before the composable reads it
const mockToastInstance = {
  success: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
}

vi.stubGlobal('window', {
  __toast: mockToastInstance,
})

import { useToast } from '../../composables/useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Restore window.__toast after clearAllMocks
    vi.stubGlobal('window', { __toast: mockToastInstance })
  })

  it('returns success, error, warn, info functions', () => {
    const toast = useToast()
    expect(typeof toast.success).toBe('function')
    expect(typeof toast.error).toBe('function')
    expect(typeof toast.warn).toBe('function')
    expect(typeof toast.info).toBe('function')
  })

  it('success calls window.__toast.success with the message', () => {
    const toast = useToast()
    toast.success('Operation completed')
    expect(mockToastInstance.success).toHaveBeenCalledWith('Operation completed')
  })

  it('error calls window.__toast.error with the message', () => {
    const toast = useToast()
    toast.error('Something went wrong')
    expect(mockToastInstance.error).toHaveBeenCalledWith('Something went wrong')
  })

  it('warn calls window.__toast.warn with the message', () => {
    const toast = useToast()
    toast.warn('Proceed with caution')
    expect(mockToastInstance.warn).toHaveBeenCalledWith('Proceed with caution')
  })

  it('info calls window.__toast.info with the message', () => {
    const toast = useToast()
    toast.info('For your information')
    expect(mockToastInstance.info).toHaveBeenCalledWith('For your information')
  })

  it('handles window.__toast being null gracefully', () => {
    vi.stubGlobal('window', { __toast: null })
    const toast = useToast()
    expect(() => toast.success('test')).not.toThrow()
    expect(() => toast.error('test')).not.toThrow()
    expect(() => toast.warn('test')).not.toThrow()
    expect(() => toast.info('test')).not.toThrow()
  })

  it('each useToast call creates independent instance', () => {
    const t1 = useToast()
    const t2 = useToast()
    t1.success('From t1')
    t2.error('From t2')
    expect(mockToastInstance.success).toHaveBeenCalledWith('From t1')
    expect(mockToastInstance.error).toHaveBeenCalledWith('From t2')
  })
})
