import { test, expect } from '@playwright/test';

// 账号中心 — 16 页，覆盖核心 12 页
test.describe('账号中心页面 — UI 可访问性', () => {
  const pages = [
    { path: '/account/profile', name: '个人资料' },
    { path: '/account/security', name: '安全设置' },
    { path: '/account/billing', name: '账单' },
    { path: '/account/credits', name: '积分' },
    { path: '/account/orders', name: '订单' },
    { path: '/account/works', name: '我的作品' },
    { path: '/account/settings', name: '设置' },
    { path: '/account/notifications', name: '通知' },
    { path: '/account/collections', name: '收藏' },
    { path: '/account/points', name: '积分明细' },
    { path: '/account/bind-platform', name: '平台绑定' },
    { path: '/account/developer', name: '开发者' },
  ];
  for (const { path, name } of pages) {
    test(`${name} 页面可访问`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(400);
    });
  }
});

// 代理端 — 4 页全覆盖
test.describe('代理端页面 — UI 可访问性', () => {
  const pages = [
    '/agent/dashboard',
    '/agent/customers',
    '/agent/commission',
    '/agent/distribution',
  ];
  for (const path of pages) {
    test(`${path} 页面可访问`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(400);
    });
  }
});

// 财务端 — 4 页全覆盖
test.describe('财务端页面 — UI 可访问性', () => {
  const pages = [
    '/finance/dashboard',
    '/finance/billing',
    '/finance/orders',
    '/finance/commission-detail',
  ];
  for (const path of pages) {
    test(`${path} 页面可访问`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(400);
    });
  }
});

// 网关管理 — 4 页全覆盖
test.describe('网关管理页面 — UI 可访问性', () => {
  const pages = [
    '/gateway/dashboard',
    '/gateway/routes',
    '/gateway/rate-limit',
    '/gateway/access-log',
  ];
  for (const path of pages) {
    test(`${path} 页面可访问`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(400);
    });
  }
});

// 运营管理 — 4 页全覆盖
test.describe('运营管理页面 — UI 可访问性', () => {
  const pages = [
    '/ops/dashboard',
    '/ops/campaigns',
    '/ops/coupons',
    '/ops/reports',
  ];
  for (const path of pages) {
    test(`${path} 页面可访问`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(400);
    });
  }
});
