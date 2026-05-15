// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// Mock #imports to provide useToast for the auto-import shim
vi.mock('#imports', async () => {
  const actual = await vi.importActual<typeof import('#imports')>('#imports')
  return {
    ...actual,
    useToast: () => ({
      success: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    }),
  }
})

import AppMediaUpload from '@/components/common/AppMediaUpload.vue'

describe('AppMediaUpload', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function createWrapper(props = {}) {
    return mount(AppMediaUpload, {
      props: {
        accept: 'image',
        multiple: false,
        maxSize: 500,
        maxCount: 10,
        ...props,
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          svg: true,
          path: true,
        },
      },
    })
  }

  it('renders the upload zone', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.app-media-upload').exists()).toBe(true)
    expect(wrapper.find('.upload-zone').exists()).toBe(true)
  })

  it('renders upload hint when no files selected', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.upload-hint').exists()).toBe(true)
  })

  it('contains a hidden file input', () => {
    const wrapper = createWrapper()
    const input = wrapper.find('input[type="file"]')
    expect(input.exists()).toBe(true)
    expect(input.classes()).toContain('hidden-input')
  })

  it('accepts configured image MIME types', () => {
    const wrapper = createWrapper({ accept: 'image' })
    const input = wrapper.find('input[type="file"]')
    expect(input.attributes('accept')).toContain('image/jpeg')
    expect(input.attributes('accept')).toContain('image/png')
  })

  it('accepts configured video MIME types', () => {
    const wrapper = createWrapper({ accept: 'video' })
    const input = wrapper.find('input[type="file"]')
    expect(input.attributes('accept')).toContain('video/mp4')
  })

  it('sets multiple attribute based on prop', () => {
    const single = createWrapper({ multiple: false })
    expect(single.find('input[type="file"]').attributes('multiple')).toBeUndefined()

    const multi = createWrapper({ multiple: true })
    expect(multi.find('input[type="file"]').attributes('multiple')).toBeDefined()
  })

  it('shows drag-over class on dragenter', async () => {
    const wrapper = createWrapper()
    const zone = wrapper.find('.upload-zone')
    await zone.trigger('dragenter')
    expect(wrapper.find('.app-media-upload').classes()).toContain('dragging')
  })

  it('removes drag-over class on dragleave', async () => {
    const wrapper = createWrapper()
    const zone = wrapper.find('.upload-zone')
    await zone.trigger('dragenter')
    expect(wrapper.find('.app-media-upload').classes()).toContain('dragging')
    await zone.trigger('dragleave')
    expect(wrapper.find('.app-media-upload').classes()).not.toContain('dragging')
  })

  it('upload button is hidden when no files selected', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.upload-actions').exists()).toBe(false)
  })
})
