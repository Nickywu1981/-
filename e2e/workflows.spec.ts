import { test, expect } from '@playwright/test';

test.describe('账户中心 — 用户旅程', () => {
  test('个人资料页可访问', async ({ page }) => {
    const res = await page.goto('/account/profile');
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('h1, h2, form, .profile-card').first()).toBeVisible({ timeout: 10000 });
  });

  test('安全设置页可访问', async ({ page }) => {
    const res = await page.goto('/account/security');
    expect(res?.status()).toBeLessThan(400);
  });

  test('账单页可访问', async ({ page }) => {
    const res = await page.goto('/account/billing');
    expect(res?.status()).toBeLessThan(400);
  });

  test('积分记录页可访问', async ({ page }) => {
    const res = await page.goto('/account/credits');
    expect(res?.status()).toBeLessThan(400);
  });

  test('订单列表页可访问', async ({ page }) => {
    const res = await page.goto('/account/orders');
    expect(res?.status()).toBeLessThan(400);
  });

  test('工作空间页可访问', async ({ page }) => {
    const res = await page.goto('/account/workspace');
    expect(res?.status()).toBeLessThan(400);
  });
});

test.describe('企业端 — 核心工作流', () => {
  test('渠道管理页可访问', async ({ page }) => {
    const res = await page.goto('/enterprise/channels');
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('h1, h2, .table, .channel-list').first()).toBeVisible({ timeout: 10000 });
  });

  test('客户详情页可访问', async ({ page }) => {
    const res = await page.goto('/enterprise/customers');
    expect(res?.status()).toBeLessThan(400);
  });

  test('分销管理页可访问', async ({ page }) => {
    const res = await page.goto('/enterprise/distribution');
    expect(res?.status()).toBeLessThan(400);
  });

  test('财务报表页可访问', async ({ page }) => {
    const res = await page.goto('/enterprise/finance/dashboard');
    expect(res?.status()).toBeLessThan(400);
  });

  test('业务管理页可访问', async ({ page }) => {
    const res = await page.goto('/enterprise/commerce');
    expect(res?.status()).toBeLessThan(400);
  });
});
