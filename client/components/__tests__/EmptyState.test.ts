// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EmptyState from '@/components/shared/EmptyState.vue'

describe('EmptyState', () => {
  function createWrapper(props = {}) {
    return mount(EmptyState, {
      props: { description: 'No data found', ...props },
      global: { mocks: { $t: (k: string) => k } },
    })
  }

  it('renders the empty state container', () => {
    const w = createWrapper()
    expect(w.find('.empty-state').exists()).toBe(true)
  })

  it('renders title from props', () => {
    const w = createWrapper({ title: 'No items' })
    expect(w.find('.empty-title').text()).toBe('No items')
  })

  it('renders description from props', () => {
    const w = createWrapper({ description: '暂无数据' })
    expect(w.find('.empty-desc').text()).toBe('暂无数据')
  })

  it('renders icon text when icon prop provided', () => {
    const w = createWrapper({ icon: '📭' })
    expect(w.find('.empty-icon').text()).toBe('📭')
  })

  it('renders default slot in actions area', () => {
    const w = mount(EmptyState, {
      props: { description: 'test' },
      global: { mocks: { $t: (k: string) => k } },
      slots: { default: '<button class="retry-btn">Retry</button>' },
    })
    expect(w.find('.retry-btn').exists()).toBe(true)
  })

  it('applies size class', () => {
    const w = createWrapper({ size: 'sm' })
    expect(w.find('.empty-state').classes()).toContain('empty--sm')
  })
})
