import { describe, it, expect } from 'vitest';
import { getMenuByRole, hasRouteAccess } from '../../composables/usePermission';

describe('getMenuByRole', () => {
  it('admin can see all menus including admin panel', () => {
    const menu = getMenuByRole('admin');
    const keys = menu.map((m) => m.key);
    expect(keys).toContain('work');
    expect(keys).toContain('image');
    expect(keys).toContain('video');
    expect(keys).toContain('batch');
    expect(keys).toContain('admin');
  });

  it('vip can see work/image/video/batch but NOT admin', () => {
    const menu = getMenuByRole('vip');
    const keys = menu.map((m) => m.key);
    expect(keys).toContain('image');
    expect(keys).toContain('video');
    expect(keys).toContain('batch');
    expect(keys).not.toContain('admin');
  });

  it('user can see work/image/video/batch but NOT admin', () => {
    const menu = getMenuByRole('user');
    const keys = menu.map((m) => m.key);
    expect(keys).toContain('video');
    expect(keys).not.toContain('admin');
  });

  it('free user has restricted access — no video, no outpainting', () => {
    const menu = getMenuByRole('free');
    const keys = menu.map((m) => m.key);
    expect(keys).not.toContain('video');
    expect(keys).not.toContain('admin');
  });

  it('filters children by role for free users', () => {
    const menu = getMenuByRole('free');
    const imageGroup = menu.find((m) => m.key === 'image');
    expect(imageGroup).toBeDefined();
    const childKeys = imageGroup!.children!.map((c) => c.key);
    expect(childKeys).toContain('main-image');
    expect(childKeys).not.toContain('outpaint');
    expect(childKeys).not.toContain('virtual-tryon');
    expect(childKeys).not.toContain('color-change');
  });

  it('admin children include all items', () => {
    const menu = getMenuByRole('admin');
    const imageGroup = menu.find((m) => m.key === 'image');
    const childKeys = imageGroup!.children!.map((c) => c.key);
    expect(childKeys).toContain('outpaint');
    expect(childKeys).toContain('virtual-tryon');
    expect(childKeys).toContain('color-change');
    expect(childKeys).toContain('style-transfer');
  });
});

describe('hasRouteAccess', () => {
  it('admin can access admin dashboard', () => {
    expect(hasRouteAccess('admin', '/admin/dashboard')).toBe(true);
  });

  it('vip cannot access admin dashboard', () => {
    expect(hasRouteAccess('vip', '/admin/dashboard')).toBe(false);
  });

  it('free user can access main-image', () => {
    expect(hasRouteAccess('free', '/work/main-image')).toBe(true);
  });

  it('free user cannot access video page', () => {
    expect(hasRouteAccess('free', '/work/video')).toBe(false);
  });

  it('vip can access digital-human', () => {
    expect(hasRouteAccess('vip', '/work/digital-human')).toBe(true);
  });

  it('free user can access workspace', () => {
    expect(hasRouteAccess('free', '/workspace')).toBe(true);
  });

  it('non-existent route returns false', () => {
    expect(hasRouteAccess('admin', '/work/nonexistent')).toBe(false);
  });

  it('admin can access child routes like virtual-tryon', () => {
    expect(hasRouteAccess('admin', '/work/virtual-tryon')).toBe(true);
  });
});
