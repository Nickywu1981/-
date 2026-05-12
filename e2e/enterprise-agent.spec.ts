import { test, expect } from '@playwright/test';

// ============================================================
// 企业端 + 代理端 用户旅程 E2E
// ============================================================

// --- 企业端 (enterprise) ---

test.describe('企业端 — 渠道管理', () => {
  test('页面可访问', async ({ page }) => {
    await page.goto('/enterprise/channels');
    await expect(page.locator('.pg')).toBeVisible({ timeout: 10000 });
  });

  test('显示渠道列表', async ({ page }) => {
    await page.goto('/enterprise/channels');
    await expect(page.locator('.data-table')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('企业端 — 客户管理', () => {
  test('页面可访问', async ({ page }) => {
    await page.goto('/enterprise/customers');
    await expect(page.locator('.pg')).toBeVisible({ timeout: 10000 });
  });

  test('显示客户筛选条件', async ({ page }) => {
    await page.goto('/enterprise/customers');
    await expect(page.getByPlaceholder(/搜索/)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('企业端 — 分销管理', () => {
  test('页面可访问', async ({ page }) => {
    await page.goto('/enterprise/distribution');
    await expect(page.locator('.pg')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('企业端 — 财务仪表盘', () => {
  test('页面可访问', async ({ page }) => {
    await page.goto('/enterprise/finance/dashboard');
    await expect(page.locator('.pg')).toBeVisible({ timeout: 10000 });
  });
});

// --- 代理端 (agent) ---

test.describe('代理端 — 仪表盘', () => {
  test('页面可访问', async ({ page }) => {
    await page.goto('/agent/dashboard');
    await expect(page.locator('.pg')).toBeVisible({ timeout: 10000 });
  });

  test('显示 4 个 KPI 卡片', async ({ page }) => {
    await page.goto('/agent/dashboard');
    const cards = page.locator('.stat-card');
    await expect(cards).toHaveCount(4, { timeout: 10000 });
  });
});

test.describe('代理端 — 客户列表', () => {
  test('页面可访问', async ({ page }) => {
    await page.goto('/agent/customers');
    await expect(page.locator('.pg')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('代理端 — 分销', () => {
  test('页面可访问', async ({ page }) => {
    await page.goto('/agent/distribution');
    await expect(page.locator('.pg')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('代理端 — 佣金', () => {
  test('页面可访问', async ({ page }) => {
    await page.goto('/agent/commission');
    await expect(page.locator('.pg')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('代理端 — 提现页面', () => {
  test('页面可访问', async ({ page }) => {
    await page.goto('/agent/withdraw');
    await expect(page.locator('.pg')).toBeVisible({ timeout: 10000 });
  });

  test('显示可提余额', async ({ page }) => {
    await page.goto('/agent/withdraw');
    await expect(page.getByText(/可提余额/)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('代理端 — 团队管理', () => {
  test('页面可访问', async ({ page }) => {
    await page.goto('/agent/team');
    await expect(page.locator('.pg')).toBeVisible({ timeout: 10000 });
  });

  test('显示成员列表', async ({ page }) => {
    await page.goto('/agent/team');
    await expect(page.getByText(/团队成员/)).toBeVisible({ timeout: 10000 });
  });
});

// --- API 安全边界 ---

test.describe('企业端 API 安全', () => {
  test('未登录访问 /api/enterprise/channels 返回 401', async ({ request }) => {
    const res = await request.get('/api/enterprise/channels');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('未登录访问 /api/enterprise/customers 返回 401', async ({ request }) => {
    const res = await request.get('/api/enterprise/customers');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('未登录访问 /api/agent/commission 返回 401', async ({ request }) => {
    const res = await request.get('/api/agent/commission');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

// --- 页面安全 ---

test.describe('企业端页面安全', () => {
  test('未登录访问企业端重定向到登录', async ({ page }) => {
    await page.goto('/enterprise/channels');
    await expect(page).toHaveURL(/login|signin|auth/, { timeout: 10000 });
  });
});

test.describe('代理端页面安全', () => {
  test('未登录访问代理端重定向到登录', async ({ page }) => {
    await page.goto('/agent/dashboard');
    await expect(page).toHaveURL(/login|signin|auth/, { timeout: 10000 });
  });
});
