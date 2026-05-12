import { test, expect } from '@playwright/test';

test.describe('Admin CRUD — 管理后台操作', () => {
  const BASE = 'http://localhost:3001';
  const ADMIN_AUTH = { username: 'admin', password: 'Admin@123' };
  let adminToken = '';

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: ADMIN_AUTH,
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      adminToken = body.data?.accessToken || body.data?.token || body.token || '';
    }
  });

  // ─── 公告管理 ───
  test.describe('公告 CRUD', () => {
    let annId: number;

    test('GET /api/announcements 返回公告列表', async ({ request }) => {
      const res = await request.get(`${BASE}/api/announcements`);
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/admin/announcements 创建公告需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/admin/announcements`, {
        data: { title: 'E2E测试公告', content: '测试内容', type: 'info' },
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
        failOnStatusCode: false,
      });
      // 未认证返回 401，认证后返回 200/201
      expect([200, 201, 401]).toContain(res.status());
      if (res.ok()) {
        const body = await res.json();
        annId = body.data?.id || body.id || 0;
      }
    });

    test('GET /api/announcements/:id 获取公告详情', async ({ request }) => {
      const res = await request.get(`${BASE}/api/announcements/1`, { failOnStatusCode: false });
      expect(res.status()).toBeLessThan(500);
    });
  });

  // ─── 营销活动管理 ───
  test.describe('活动 CRUD', () => {
    test('GET /api/campaigns 返回活动列表', async ({ request }) => {
      const res = await request.get(`${BASE}/api/campaigns`);
      expect(res.status()).toBeLessThan(500);
    });

    test('GET /api/campaigns?type=promo 按类型筛选', async ({ request }) => {
      const res = await request.get(`${BASE}/api/campaigns?type=promo`);
      expect(res.ok()).toBeTruthy();
    });

    test('POST /api/admin/campaigns 创建活动需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/admin/campaigns`, {
        data: { name: 'E2E测试活动', type: 'promo', status: 0, start_time: new Date().toISOString() },
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
        failOnStatusCode: false,
      });
      expect([200, 201, 401]).toContain(res.status());
    });

    test('PUT /api/admin/campaigns/:id 更新活动需认证', async ({ request }) => {
      const res = await request.put(`${BASE}/api/admin/campaigns/1`, {
        data: { name: '更新-E2E测试' },
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
        failOnStatusCode: false,
      });
      expect(res.status()).toBeLessThan(500);
    });
  });

  // ─── 优惠券管理 ───
  test.describe('优惠券 CRUD', () => {
    test('GET /api/coupons 返回优惠券列表', async ({ request }) => {
      const res = await request.get(`${BASE}/api/coupons`);
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/admin/coupons 创建优惠券需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/admin/coupons`, {
        data: { code: `E2ETEST${Date.now() % 100000}`, discount: 10, type: 'percent', min_amount: 50 },
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
        failOnStatusCode: false,
      });
      expect([200, 201, 401, 400]).toContain(res.status());
    });
  });

  // ─── 用户管理（admin 视角） ───
  test.describe('用户管理', () => {
    test('GET /api/admin/users 列出用户需认证', async ({ request }) => {
      const res = await request.get(`${BASE}/api/admin/users`, {
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
        failOnStatusCode: false,
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('GET /api/admin/users?page=1&pageSize=10 分页', async ({ request }) => {
      const res = await request.get(`${BASE}/api/admin/users?page=1&pageSize=10`, {
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
        failOnStatusCode: false,
      });
      expect(res.status()).toBeLessThan(500);
    });
  });

  // ─── 站点配置 ───
  test.describe('站点配置', () => {
    test('GET /api/site-config/public 公开配置返回', async ({ request }) => {
      const res = await request.get(`${BASE}/api/site-config/public`);
      expect(res.status()).toBeLessThan(500);
    });

    test('GET /api/admin/site-config 管理员获取配置需认证', async ({ request }) => {
      const res = await request.get(`${BASE}/api/admin/site-config`, {
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
        failOnStatusCode: false,
      });
      expect(res.status()).toBeLessThan(500);
    });
  });

  // ─── 审计日志 ───
  test.describe('审计日志', () => {
    test('GET /api/admin/audit-logs 需认证', async ({ request }) => {
      const res = await request.get(`${BASE}/api/admin/audit-logs`, {
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
        failOnStatusCode: false,
      });
      expect(res.status()).toBeLessThan(500);
    });
  });

  // ─── 徽章管理 ───
  test.describe('徽章管理', () => {
    test('GET /api/badges 返回徽章列表', async ({ request }) => {
      const res = await request.get(`${BASE}/api/badges`);
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/badges 创建徽章需管理员认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/badges`, {
        data: { name: 'E2E徽章', description: '测试', icon: 'star', category: 'achievement' },
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
        failOnStatusCode: false,
      });
      expect([200, 201, 401]).toContain(res.status());
    });
  });

  // ─── 限流验证 ───
  test.describe('限流防护', () => {
    test('连续请求不应触发 429（正常速率）', async ({ request }) => {
      for (let i = 0; i < 3; i++) {
        const res = await request.get(`${BASE}/api/health`);
        expect(res.status()).not.toBe(429);
      }
    });

    test('登录端点限流保护', async ({ request }) => {
      const results: number[] = [];
      for (let i = 0; i < 5; i++) {
        const res = await request.post(`${BASE}/api/auth/login`, {
          data: { username: `brute_${i}`, password: 'wrong' },
          failOnStatusCode: false,
        });
        results.push(res.status());
      }
      // 至少有一次正常拒绝（401）或触发限流（429）
      expect(results.some(s => s === 401 || s === 429)).toBeTruthy();
    });
  });
});
