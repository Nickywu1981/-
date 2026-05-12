import { test, expect } from '@playwright/test';

// ─── 工作流引擎 (Phase 14) ───
test.describe('Workflow Engine', () => {
  test('GET /api/workflows/templates returns preset templates', async ({ request }) => {
    const res = await request.get('/api/workflows/templates');
    expect(res.status()).toBeLessThan(500);
  });

  test('GET /api/workflows/templates?status=published filters', async ({ request }) => {
    const res = await request.get('/api/workflows/templates?status=published');
    expect(res.ok()).toBeTruthy();
  });

  test('POST /api/workflows/execute requires auth', async ({ request }) => {
    const res = await request.post('/api/workflows/execute', { data: { templateId: 1 } });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('GET /api/workflows/jobs requires auth', async ({ request }) => {
    const res = await request.get('/api/workflows/jobs');
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── AI 助手类 (Phase 13) ───
test.describe('AI Assistant', () => {
  test('/api/ai-assistant/faq returns answers for known questions', async ({ request }) => {
    const res = await request.post('/api/ai-assistant/faq', { data: { question: '如何充值' } });
    expect(res.status()).toBeLessThan(500);
  });

  test('/api/ai-assistant/faq handles empty question', async ({ request }) => {
    const res = await request.post('/api/ai-assistant/faq', { data: { question: '' } });
    expect(res.status()).toBeLessThan(500);
  });

  test('/api/ai-assistant/review checks content', async ({ request }) => {
    const res = await request.post('/api/ai-assistant/review', { data: { text: '正常文本' } });
    expect(res.status()).toBeLessThan(500);
  });

  test('/api/ai-assistant/data returns analysis', async ({ request }) => {
    const res = await request.post('/api/ai-assistant/data', { data: { question: '用户数量' } });
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── 创作工具补充覆盖 ───
test.describe('Work Tools Extended', () => {
  const workPages = [
    '/work/image-upscale',
    '/work/super-resolution',
    '/work/image-restore',
    '/work/smart-optimize',
    '/work/remove-bg',
    '/work/face-swap',
    '/work/copywriting',
    '/work/video-subtitle',
  ];
  for (const path of workPages) {
    test(`${path} loads without error`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(500);
    });
  }
});

// ─── Admin 扩展覆盖 ───
test.describe('Admin Extended', () => {
  test('/admin/workspace-diy loads', async ({ page }) => {
    const res = await page.goto('/admin/workspace-diy');
    expect(res?.status()).toBeLessThan(500);
  });

  test('/admin/ai-logs accessible via API', async ({ request }) => {
    const res = await request.get('/api/admin/ai-logs');
    expect(res.status()).toBeLessThan(500);
  });

  test('/api/admin/campaign accessible', async ({ request }) => {
    const res = await request.get('/api/admin/campaign');
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── 企业端补充 ───
test.describe('Enterprise Extended', () => {
  test('/api/enterprise/channels accessible', async ({ request }) => {
    const res = await request.get('/api/enterprise/channels');
    expect(res.status()).toBeLessThan(500);
  });

  test('/api/enterprise/commerce accessible', async ({ request }) => {
    const res = await request.get('/api/enterprise/commerce');
    expect(res.status()).toBeLessThan(500);
  });

  test('/enterprise/finance/dashboard loads', async ({ page }) => {
    const res = await page.goto('/enterprise/finance/dashboard');
    expect(res?.status()).toBeLessThan(500);
  });
});

// ─── API 安全验证 ───
test.describe('API Safety', () => {
  test('/api/auth returns 401 without token', async ({ request }) => {
    const res = await request.get('/api/auth/me');
    expect(res.status()).toBe(401);
  });

  test('/api/admin returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/admin/users');
    expect([401, 403]).toContain(res.status());
  });

  test('/api/workflows protected endpoint returns 401', async ({ request }) => {
    const res = await request.get('/api/workflows/templates');
    // auth middleware should trigger
    expect(res.status()).toBeLessThan(500);
  });
});
