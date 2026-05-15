// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LoadingSkeleton from '@/components/LoadingSkeleton.vue'

describe('LoadingSkeleton', () => {
  it('renders skeleton wrapper', () => {
    const w = mount(LoadingSkeleton, {
      global: { mocks: { $t: (k: string) => k } },
    })
    expect(w.find('.skeleton-wrap').exists()).toBe(true)
  })

  it('renders table variant with correct row count', () => {
    const w = mount(LoadingSkeleton, {
      props: { type: 'table', rows: 3, cols: 4 },
      global: { mocks: { $t: (k: string) => k } },
    })
    expect(w.findAll('.sk-row').length).toBe(3)
  })

  it('renders card variant with correct card count', () => {
    const w = mount(LoadingSkeleton, {
      props: { type: 'card', count: 4 },
      global: { mocks: { $t: (k: string) => k } },
    })
    expect(w.findAll('.sk-card').length).toBe(4)
  })

  it('renders block variant with height', () => {
    const w = mount(LoadingSkeleton, {
      props: { type: 'block', height: '200px' },
      global: { mocks: { $t: (k: string) => k } },
    })
    const block = w.find('.sk-block')
    expect(block.exists()).toBe(true)
    expect(block.attributes('style')).toContain('200px')
  })
})
