import { describe, it, expect, vi } from 'vitest'

// Stub browser globals for cookie/offline logic in useApi
vi.stubGlobal('document', { cookie: '' })
vi.stubGlobal('navigator', { onLine: true })

vi.stubGlobal('window', {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})

import { api, ApiError, extractErrorMsg, useApi } from '@/composables/useApi'

describe('ApiError', () => {
  it('constructs with message, code, status and data', () => {
    const err = new ApiError('Not found', 404, 404, { detail: 'missing' })
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.name).toBe('ApiError')
    expect(err.message).toBe('Not found')
    expect(err.code).toBe(404)
    expect(err.status).toBe(404)
    expect(err.data).toEqual({ detail: 'missing' })
  })

  it('has default code and status of 500', () => {
    const err = new ApiError('Server error')
    expect(err.code).toBe(500)
    expect(err.status).toBe(500)
    expect(err.data).toBeUndefined()
  })
})

describe('extractErrorMsg', () => {
  it('returns data.msg when available and under 200 chars', () => {
    const err = { data: { msg: 'User already exists' } }
    const msg = extractErrorMsg(err, 'fallback_key')
    expect(msg).toBe('User already exists')
  })

  it('returns message when no data.msg', () => {
    const err = { message: 'Network error' }
    const msg = extractErrorMsg(err, 'fallback_key')
    expect(msg).toBe('Network error')
  })

  it('rejects long messages as potential stack traces and uses fallback', () => {
    const longMsg = 'a'.repeat(200)
    const msg = extractErrorMsg({ message: longMsg }, 'fallback_key')
    expect(msg).toBe('fallback_key')
  })

  it('rejects messages containing stack-like patterns', () => {
    const err = { message: 'Error: at component.ts:42:10' }
    const msg = extractErrorMsg(err, 'fallback_key')
    expect(msg).toBe('fallback_key')
  })
})

describe('api object', () => {
  it('exports api with get, post, put, delete methods', () => {
    expect(api).toBeDefined()
    expect(typeof api.get).toBe('function')
    expect(typeof api.post).toBe('function')
    expect(typeof api.put).toBe('function')
    expect(typeof api.delete).toBe('function')
  })

  it('useApi composable returns api object', () => {
    const result = useApi()
    expect(result).toBe(api)
    expect(typeof result.get).toBe('function')
  })
})
