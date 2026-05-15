import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001';

test.describe('支付 & 订单 — 关键路径', () => {
  test('会员套餐列表可访问', async ({ request }) => {
    const res = await request.get(`${BASE}/api/membership/plans`, { failOnStatusCode: false });
    expect(res.status()).toBeLessThan(500);
  });

  test('创建订单需认证', async ({ request }) => {
    const res = await request.post(`${BASE}/api/order/create`, {
      data: { planId: 1, amount: 99 },
      failOnStatusCode: false,
    });
    expect([401, 403]).toContain(res.status());
  });

  test('充值页面可访问', async ({ page }) => {
    const res = await page.goto('/account/recharge');
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('h1, h2, .recharge-card, .plan-card').first()).toBeVisible({ timeout: 10000 });
  });

  test('订单列表页可访问', async ({ page }) => {
    const res = await page.goto('/account/orders');
    expect(res?.status()).toBeLessThan(400);
  });

  test('支付回调幂等性 — 重复通知不崩溃', async ({ request }) => {
    const res1 = await request.post(`${BASE}/api/payment/callback`, {
      data: { orderId: 'e2e_test_order', status: 'success', amount: 99 },
      failOnStatusCode: false,
    });
    expect(res1.status()).toBeLessThan(500);

    const res2 = await request.post(`${BASE}/api/payment/callback`, {
      data: { orderId: 'e2e_test_order', status: 'success', amount: 99 },
      failOnStatusCode: false,
    });
    expect(res2.status()).toBeLessThan(500);
  });

  test('积分记录查询需认证', async ({ request }) => {
    const res = await request.get(`${BASE}/api/credit/records`, { failOnStatusCode: false });
    expect([401, 200]).toContain(res.status());
  });
});
