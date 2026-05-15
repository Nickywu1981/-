// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusBadge from '@/components/shared/StatusBadge.vue'

function createWrapper(props = {}) {
  return mount(StatusBadge, {
    props: { status: 'success', ...props },
    global: { mocks: { $t: (k: string) => k } },
    slots: { default: 'Active' },
  })
}

describe('StatusBadge', () => {
  it('renders the badge element', () => {
    const w = createWrapper()
    expect(w.find('.status-badge').exists()).toBe(true)
  })

  it('displays slot content', () => {
    const w = mount(StatusBadge, {
      props: { status: 'success' },
      global: { mocks: { $t: (k: string) => k } },
      slots: { default: 'Online' },
    })
    expect(w.text()).toContain('Online')
  })

  const variants = [
    { status: 'success', variant: 'success' },
    { status: 'warning', variant: 'warning' },
    { status: 'danger', variant: 'danger' },
    { status: 'info', variant: 'info' },
    { status: 'primary', variant: 'primary' },
  ]

  for (const { status, variant } of variants) {
    it(`applies "${variant}" variant class`, () => {
      const w = createWrapper({ status })
      expect(w.find('.status-badge').classes()).toContain(`status-badge--${variant}`)
    })
  }

  it('renders default variant for unknown status', () => {
    const w = createWrapper({ status: 'unknown_xyz' })
    expect(w.find('.status-badge').classes()).toContain('status-badge--default')
  })

  it('shows dot element when dot prop is true', () => {
    const w = createWrapper({ dot: true })
    expect(w.find('.status-badge__dot').exists()).toBe(true)
  })

  it('supports size prop (sm/md/lg)', () => {
    const w = createWrapper({ size: 'sm' })
    expect(w.find('.status-badge').classes()).toContain('status-badge--sm')
  })
})
