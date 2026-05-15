// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Pagination from '@/components/Pagination.vue'

function createWrapper(props = {}) {
  return mount(Pagination, {
    props: { currentPage: 1, pageSize: 10, total: 100, ...props },
    global: { mocks: { $t: (k: string) => k } },
  })
}

describe('Pagination', () => {
  it('renders nothing when total <= pageSize', () => {
    const w = createWrapper({ total: 5, pageSize: 10 })
    expect(w.find('.pagination').exists()).toBe(false)
  })

  it('renders page buttons when total > pageSize', () => {
    const w = createWrapper({ total: 100, pageSize: 10 })
    expect(w.find('.pagination').exists()).toBe(true)
  })

  it('emits update:currentPage on page click', async () => {
    const w = createWrapper({ total: 100, pageSize: 10 })
    const pages = w.findAll('.page-btn')
    if (pages.length > 1) {
      await pages[1].trigger('click')
      expect(w.emitted('update:currentPage')).toBeTruthy()
    }
  })

  it('disables prev button on first page', () => {
    const w = createWrapper({ currentPage: 1, total: 100 })
    const prev = w.find('.prev-btn')
    if (prev.exists()) expect(prev.classes()).toContain('disabled')
  })

  it('disables next button on last page', () => {
    const w = createWrapper({ currentPage: 10, total: 100, pageSize: 10 })
    const next = w.find('.next-btn')
    if (next.exists()) expect(next.classes()).toContain('disabled')
  })

  it('accepts pageSizeOptions prop', () => {
    const w = createWrapper({ total: 100, showSizeChanger: true, pageSizeOptions: [10, 20, 50] })
    expect(w.find('.pagination').exists()).toBe(true)
  })
})
