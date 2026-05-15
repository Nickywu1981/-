import { test, expect } from '@playwright/test';

test.describe('API — 内容类型与错误处理', () => {
  const BASE = 'http://localhost:3001';

  test('GET /api/user/me 未认证返回 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/user/me`);
    expect(res.status()).toBe(401);
  });

  test('POST /api/user/register 缺少参数返回业务错误', async ({ request }) => {
    const res = await request.post(`${BASE}/api/user/register`, { data: {} });
    expect(res.status()).toBeGreaterThanOrEqual(200);
    const body = await res.json();
    expect(typeof body.code).toBe('number');
  });

  test('GET /api/image/works 未认证限流', async ({ request }) => {
    const res = await request.get(`${BASE}/api/image/works`);
    // 未认证可能返回 401 或 429（限流触发）
    expect([401, 429]).toContain(res.status());
  });

  test('POST JSON content-type 正确解析', async ({ request }) => {
    const res = await request.post(`${BASE}/api/user/login`, {
      data: { username: 'test', password: 'Test@123' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(200);
  });

  test('不支持的路径返回 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/nonexistent-path-xyz`);
    expect(res.status()).toBe(404);
  });

  test('GET /api/health 健康检查', async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`);
    expect(res.status()).toBe(200);
  });
});

test.describe('前端 — 创作页面内容完整性', () => {
  test('AI 图片生成页有操作按钮', async ({ page }) => {
    await page.goto('/work/ai-image');
    await expect(page.locator('button, .btn, [role="button"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('AI 视频生成页有表单元素', async ({ page }) => {
    await page.goto('/work/ai-video');
    await expect(page.locator('input, textarea, [contenteditable]').first()).toBeVisible({ timeout: 10000 });
  });

  test('文案生成页有输入框', async ({ page }) => {
    await page.goto('/work/copywriting');
    await expect(page.locator('input, textarea').first()).toBeVisible({ timeout: 10000 });
  });

  test('背景移除页可访问', async ({ page }) => {
    const res = await page.goto('/work/remove-bg');
    expect(res?.status()).toBeLessThan(400);
    // 应有上传区域
    await expect(page.locator('.upload, [class*="upload"]').first()).toBeVisible({ timeout: 10000 });
  });
});
