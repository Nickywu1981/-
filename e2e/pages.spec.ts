import { test, expect } from '@playwright/test';

test.describe('创作类页面 — UI 可访问性', () => {
  const workPages = [
    { path: '/work/ai-image', name: 'AI图片生成' },
    { path: '/work/ai-video', name: 'AI视频生成' },
    { path: '/work/remove-bg', name: '背景移除' },
    { path: '/work/image-restore', name: '图片修复' },
    { path: '/work/face-swap', name: 'AI换脸' },
    { path: '/work/copywriting', name: '文案生成' },
  ];

  for (const { path, name } of workPages) {
    test(`${name} 页面可访问`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(400);
      // 应有至少一个标题或卡片
      await expect(page.locator('h1, h2, h3, .card, .panel').first()).toBeVisible({ timeout: 10000 });
    });
  }
});

test.describe('管理后台页面 — UI 可访问性', () => {
  const adminPages = [
    '/admin/dashboard',
    '/admin/settings',
    '/admin/users',
    '/admin/orders',
    '/admin/announcements',
    '/admin/coupons',
  ];

  for (const path of adminPages) {
    test(`${path} 页面可访问`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(400);
    });
  }
});

test.describe('企业端页面 — UI 可访问性', () => {
  const enterprisePages = [
    '/enterprise/dashboard',
    '/enterprise/channels',
    '/enterprise/customers',
    '/enterprise/finance/dashboard',
    '/enterprise/reports',
  ];

  for (const path of enterprisePages) {
    test(`${path} 页面可访问`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(400);
    });
  }
});
