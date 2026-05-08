import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test.describe('电商AI工具箱 — E2E', () => {

  test('首页加载正常', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.locator('text=做主图').first()).toBeVisible();
    await expect(page.locator('text=做场景').first()).toBeVisible();
  });

  test('6入口卡片全部显示', async ({ page }) => {
    await page.goto(BASE);
    const cards = ['做主图', '做场景', '做详情', '做视频', '做批量', '素材库'];
    for (const label of cards) {
      await expect(page.locator(`text=${label}`).first()).toBeVisible();
    }
  });

  test('登录页可访问', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.locator('text=登录').first()).toBeVisible();
  });

  test('注册页可访问', async ({ page }) => {
    await page.goto(`${BASE}/register`);
    await expect(page.locator('text=注册').first()).toBeVisible();
  });

  test('帮助中心可访问', async ({ page }) => {
    await page.goto(`${BASE}/help`);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('竞品对比页可访问', async ({ page }) => {
    await page.goto(`${BASE}/compare`);
    await expect(page.locator('text=竞品').first()).toBeVisible();
  });

  test('404页面正常', async ({ page }) => {
    await page.goto(`${BASE}/nonexistent-page`);
    await expect(page.locator('text=404').first()).toBeVisible();
  });

  test('会员页鉴权重定向', async ({ page }) => {
    await page.goto(`${BASE}/account/membership`);
    // 未登录应重定向到登录页
    await expect(page).not.toHaveURL(/\/account\/membership/);
  });
});
