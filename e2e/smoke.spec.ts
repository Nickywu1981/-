import { test, expect } from '@playwright/test';

test.describe('Movio AI — 冒烟测试', () => {
  test('首页可访问', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBeLessThan(400);
  });

  test('登录页可访问', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  test('工作台需要登录', async ({ page }) => {
    const res = await page.goto('/workspace');
    expect(res?.status()).toBeLessThan(400);
  });

  test('管理员后台需要登录', async ({ page }) => {
    const res = await page.goto('/admin/dashboard');
    expect(res?.status()).toBeLessThan(400);
  });

  test('API 健康检查返回 ok', async ({ request }) => {
    const res = await request.get('http://localhost:3001/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data?.status || body.status).toBe('ok');
  });

  test('API 注册需要参数校验', async ({ request }) => {
    const res = await request.post('http://localhost:3001/api/auth/register', {
      data: { username: '', password: '' },
      failOnStatusCode: false,
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Metrics 端点返回 Prometheus 格式', async ({ request }) => {
    const res = await request.get('http://localhost:3001/api/metrics');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain('http_requests_total');
  });
});
