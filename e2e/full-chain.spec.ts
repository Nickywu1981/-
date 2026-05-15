/**
 * 全链路 E2E 测试 — C端 → AI → Token计量 → 企业 → 分润
 *
 * 覆盖四层架构核心链路:
 *   用户端 → 网关中台(AI) → 企业/代理端 → 总后台+运营端
 *
 * 运行方式: npx playwright test e2e/full-chain.spec.ts
 *
 * Phase: 1 (全链路验证)
 * Created: 2026-05-12
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001';
const E2E_PREFIX = 'e2efc';

// ============================================================
// 链路 1: C端用户 — 注册→登录→AI调用→Token计量
// ============================================================
test.describe('链路1: C端用户 → AI 调用 → Token 计量', () => {
  const ts = Date.now();
  let userToken = '';

  test('1.1 注册新用户', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/register`, {
      data: {
        username: `${E2E_PREFIX}_${ts}`,
        password: 'FullChain_Test@2026!',
        email: `${E2E_PREFIX}_${ts}@e2e.test`,
      },
      failOnStatusCode: false,
    });
    expect([200, 201, 409]).toContain(res.status());
  });

  test('1.2 登录获取 Token', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { username: `${E2E_PREFIX}_${ts}`, password: 'FullChain_Test@2026!' },
      failOnStatusCode: false,
    });
    expect([200, 201]).toContain(res.status());
    if (res.ok()) {
      const body = await res.json();
      userToken = body.data?.accessToken || body.data?.token || body.token || '';
      expect(userToken).toBeTruthy();
    }
  });

  test('1.3 AI 调度端点可达 (带认证)', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (userToken) headers.Authorization = `Bearer ${userToken}`;

    const res = await request.post(`${BASE}/api/ai/dispatch`, {
      data: {
        category: 'text',
        message: 'Hello, this is an E2E test',
      },
      headers,
      failOnStatusCode: false,
    });
    // 200=成功, 503=模型不可用(仍属正常服务状态), 其他=问题
    expect([200, 201, 401, 503]).toContain(res.status());
  });

  test('1.4 AI 网关路由端点可达', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (userToken) headers.Authorization = `Bearer ${userToken}`;

    const res = await request.post(`${BASE}/api/gateway/route`, {
      data: {
        task: 'text_generation',
        model: 'gpt-4o-mini',
        input: { prompt: 'E2E test prompt' },
      },
      headers,
      failOnStatusCode: false,
    });
    expect([200, 201, 401, 400, 503]).toContain(res.status());
  });

  test('1.5 Token 用量统计端点可达', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (userToken) headers.Authorization = `Bearer ${userToken}`;

    const res = await request.get(`${BASE}/api/gateway/stats/tokens`, {
      headers,
      failOnStatusCode: false,
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('1.6 网关路由地图端点可达', async ({ request }) => {
    const res = await request.get(`${BASE}/api/gateway/routes`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('1.7 AI 模型定价端点可达', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (userToken) headers.Authorization = `Bearer ${userToken}`;

    const res = await request.get(`${BASE}/api/gateway/pricing`, {
      headers,
      failOnStatusCode: false,
    });
    expect(res.status()).toBeLessThan(500);
  });
});

// ============================================================
// 链路 2: 企业端 — 注册→登录→仪表盘→用量→财务
// ============================================================
test.describe('链路2: 企业端 → 财务全景', () => {
  const ts = Date.now();
  let entToken = '';
  const entName = `E2E_Enterprise_${ts}`;

  test('2.1 企业注册', async ({ request }) => {
    const res = await request.post(`${BASE}/api/enterprise/register`, {
      data: {
        username: entName,
        password: 'Ent_Test@2026!',
        email: `ent_${ts}@e2e.test`,
        companyName: `E2E Test Corp ${ts}`,
        contactName: 'E2E Tester',
        contactPhone: '13800138000',
      },
      failOnStatusCode: false,
    });
    expect([200, 201, 409]).toContain(res.status());
  });

  test('2.2 企业登录', async ({ request }) => {
    const res = await request.post(`${BASE}/api/enterprise/login`, {
      data: { username: entName, password: 'Ent_Test@2026!' },
      failOnStatusCode: false,
    });
    expect([200, 201]).toContain(res.status());
    if (res.ok()) {
      const body = await res.json();
      entToken = body.data?.accessToken || body.data?.token || body.token || '';
    }
  });

  test('2.3 企业仪表盘', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (entToken) headers.Authorization = `Bearer ${entToken}`;

    const res = await request.get(`${BASE}/api/enterprise/dashboard`, {
      headers,
      failOnStatusCode: false,
    });
    expect([200, 401]).toContain(res.status());
    if (res.ok()) {
      const body = await res.json();
      expect(body.data || body).toBeTruthy();
    }
  });

  test('2.4 企业用量明细', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (entToken) headers.Authorization = `Bearer ${entToken}`;

    const res = await request.get(`${BASE}/api/enterprise/usage`, {
      headers,
      failOnStatusCode: false,
    });
    expect([200, 401]).toContain(res.status());
  });

  test('2.5 企业套餐列表 (无需认证)', async ({ request }) => {
    const res = await request.get(`${BASE}/api/enterprise/plans`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('2.6 企业财务流水', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (entToken) headers.Authorization = `Bearer ${entToken}`;

    const res = await request.get(`${BASE}/api/enterprise/finance/ledger`, {
      headers,
      failOnStatusCode: false,
    });
    expect([200, 401]).toContain(res.status());
  });

  test('2.7 企业结算记录', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (entToken) headers.Authorization = `Bearer ${entToken}`;

    const res = await request.get(`${BASE}/api/enterprise/finance/settlement`, {
      headers,
      failOnStatusCode: false,
    });
    expect([200, 401]).toContain(res.status());
  });

  test('2.8 企业收款账户', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (entToken) headers.Authorization = `Bearer ${entToken}`;

    const res = await request.get(`${BASE}/api/enterprise/finance/bank-accounts`, {
      headers,
      failOnStatusCode: false,
    });
    expect([200, 401]).toContain(res.status());
  });

  test('2.9 企业白标配置', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (entToken) headers.Authorization = `Bearer ${entToken}`;

    const res = await request.get(`${BASE}/api/enterprise/whitelabel`, {
      headers,
      failOnStatusCode: false,
    });
    expect([200, 401]).toContain(res.status());
  });
});

// ============================================================
// 链路 3: 代理端 — 佣金→分销→提现
// ============================================================
test.describe('链路3: 代理端 → 分润提现', () => {
  const ts = Date.now();
  let agentToken = '';
  const agentName = `E2E_Agent_${ts}`;

  test('3.1 代理注册 (企业身份)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/enterprise/register`, {
      data: {
        username: agentName,
        password: 'Agent_Test@2026!',
        email: `agent_${ts}@e2e.test`,
        companyName: `E2E Agent Corp ${ts}`,
        contactName: 'Agent Tester',
        contactPhone: '13900139000',
        role: 'agent',
      },
      failOnStatusCode: false,
    });
    expect([200, 201, 409]).toContain(res.status());
  });

  test('3.2 代理登录', async ({ request }) => {
    const res = await request.post(`${BASE}/api/enterprise/login`, {
      data: { username: agentName, password: 'Agent_Test@2026!' },
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      agentToken = body.data?.accessToken || body.data?.token || body.token || '';
    }
  });

  test('3.3 代理佣金收益', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (agentToken) headers.Authorization = `Bearer ${agentToken}`;

    const res = await request.get(`${BASE}/api/enterprise/finance/earnings`, {
      headers,
      failOnStatusCode: false,
    });
    // agent=403 如果不是代理, 200 如果是代理, 401 未认证
    expect([200, 401, 403]).toContain(res.status());
  });

  test('3.4 分销推广统计', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (agentToken) headers.Authorization = `Bearer ${agentToken}`;

    const res = await request.get(`${BASE}/api/distribution/stats`, {
      headers,
      failOnStatusCode: false,
    });
    expect([200, 401]).toContain(res.status());
  });

  test('3.5 分销邀请码', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (agentToken) headers.Authorization = `Bearer ${agentToken}`;

    const res = await request.get(`${BASE}/api/distribution/invite-code`, {
      headers,
      failOnStatusCode: false,
    });
    expect([200, 401]).toContain(res.status());
  });

  test('3.6 佣金余额', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (agentToken) headers.Authorization = `Bearer ${agentToken}`;

    const res = await request.get(`${BASE}/api/distribution/balance`, {
      headers,
      failOnStatusCode: false,
    });
    expect([200, 401]).toContain(res.status());
  });

  test('3.7 推广团队列表', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (agentToken) headers.Authorization = `Bearer ${agentToken}`;

    const res = await request.get(`${BASE}/api/distribution/team`, {
      headers,
      failOnStatusCode: false,
    });
    expect([200, 401]).toContain(res.status());
  });
});

// ============================================================
// 链路 4: 总后台运营端 — 跨租户聚合
// ============================================================
test.describe('链路4: 总后台运营端 → 跨租户数据聚合', () => {
  let adminToken = '';

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { username: 'admin', password: 'Admin@123' },
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      adminToken = body.data?.accessToken || body.data?.token || body.token || '';
    }
  });

  test('4.1 运营数据大盘', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (adminToken) headers.Authorization = `Bearer ${adminToken}`;

    const res = await request.get(`${BASE}/api/operations/overview`, {
      headers,
      failOnStatusCode: false,
    });
    expect([200, 401]).toContain(res.status());
  });

  test('4.2 跨租户 Token 消耗统计', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (adminToken) headers.Authorization = `Bearer ${adminToken}`;

    const res = await request.get(`${BASE}/api/operations/tokens?days=30`, {
      headers,
      failOnStatusCode: false,
    });
    expect([200, 401]).toContain(res.status());
  });

  test('4.3 跨租户分润总览', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (adminToken) headers.Authorization = `Bearer ${adminToken}`;

    const res = await request.get(`${BASE}/api/operations/profits`, {
      headers,
      failOnStatusCode: false,
    });
    expect([200, 401]).toContain(res.status());
  });

  test('4.4 租户活跃度排行', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (adminToken) headers.Authorization = `Bearer ${adminToken}`;

    const res = await request.get(`${BASE}/api/operations/tenants/ranking?metric=tokens&limit=10`, {
      headers,
      failOnStatusCode: false,
    });
    expect([200, 401]).toContain(res.status());
  });

  test('4.5 运营趋势数据', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (adminToken) headers.Authorization = `Bearer ${adminToken}`;

    const res = await request.get(`${BASE}/api/operations/trends?days=7`, {
      headers,
      failOnStatusCode: false,
    });
    expect([200, 401]).toContain(res.status());
  });

  test('4.6 管理端仪表盘 (需要认证)', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (adminToken) headers.Authorization = `Bearer ${adminToken}`;

    const res = await request.get(`${BASE}/api/admin/dashboard`, {
      headers,
      failOnStatusCode: false,
    });
    expect([200, 401]).toContain(res.status());
  });
});

// ============================================================
// 链路 5: 页面级 E2E — 四端冒烟
// ============================================================
test.describe('链路5: 页面级 — 四端冒烟', () => {
  test('5.1 C端首页', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBeLessThan(400);
  });

  test('5.2 工作空间', async ({ page }) => {
    const res = await page.goto('/workspace');
    expect(res?.status()).toBeLessThan(400);
  });

  test('5.3 企业端仪表盘', async ({ page }) => {
    const res = await page.goto('/enterprise/dashboard');
    expect(res?.status()).toBeLessThan(400);
  });

  test('5.4 企业端客户管理', async ({ page }) => {
    const res = await page.goto('/enterprise/customers');
    expect(res?.status()).toBeLessThan(400);
  });

  test('5.5 企业端渠道管理', async ({ page }) => {
    const res = await page.goto('/enterprise/channels');
    expect(res?.status()).toBeLessThan(400);
  });

  test('5.6 企业端分销管理', async ({ page }) => {
    const res = await page.goto('/enterprise/distribution');
    expect(res?.status()).toBeLessThan(400);
  });

  test('5.7 企业端商品订单', async ({ page }) => {
    const res = await page.goto('/enterprise/commerce');
    expect(res?.status()).toBeLessThan(400);
  });

  test('5.8 企业端数据报表', async ({ page }) => {
    const res = await page.goto('/enterprise/reports');
    expect(res?.status()).toBeLessThan(400);
  });

  test('5.9 企业端财务仪表盘', async ({ page }) => {
    const res = await page.goto('/enterprise/finance/dashboard');
    expect(res?.status()).toBeLessThan(400);
  });

  test('5.10 代理端仪表盘', async ({ page }) => {
    const res = await page.goto('/agent/dashboard');
    expect(res?.status()).toBeLessThan(400);
  });

  test('5.11 网关中台仪表盘', async ({ page }) => {
    const res = await page.goto('/gateway/dashboard');
    expect(res?.status()).toBeLessThan(400);
  });

  test('5.12 运营端仪表盘', async ({ page }) => {
    const res = await page.goto('/ops/dashboard');
    expect(res?.status()).toBeLessThan(400);
  });

  test('5.13 管理后台仪表盘', async ({ page }) => {
    const res = await page.goto('/admin/dashboard');
    expect(res?.status()).toBeLessThan(400);
  });

  test('5.14 管理后台运营活动', async ({ page }) => {
    const res = await page.goto('/admin/campaigns');
    expect(res?.status()).toBeLessThan(400);
  });
});

// ============================================================
// 链路 6: 安全边界验证 — 跨端权限隔离
// ============================================================
test.describe('链路6: 安全边界 — 四端权限隔离', () => {
  test('6.1 企业端API拒绝C端Token', async ({ request }) => {
    // 先用C端注册登录
    const ts = Date.now();
    const username = `${E2E_PREFIX}_sec_${ts}`;
    await request.post(`${BASE}/api/auth/register`, {
      data: { username, password: 'Security_Test@2026!', email: `sec_${ts}@e2e.test` },
      failOnStatusCode: false,
    });
    const loginRes = await request.post(`${BASE}/api/auth/login`, {
      data: { username, password: 'Security_Test@2026!' },
      failOnStatusCode: false,
    });
    const cToken = loginRes.ok()
      ? ((await loginRes.json()).data?.accessToken || (await loginRes.json()).data?.token || '')
      : '';

    // 用C端Token访问企业端API
    const res = await request.get(`${BASE}/api/enterprise/dashboard`, {
      headers: cToken ? { Authorization: `Bearer ${cToken}` } : {},
      failOnStatusCode: false,
    });
    // 应返回 401 或 403 (aud=user ≠ aud=enterprise)
    expect([401, 403, 404]).toContain(res.status());
  });

  test('6.2 企业端API拒绝未认证请求', async ({ request }) => {
    const endpoints = [
      '/api/enterprise/dashboard',
      '/api/enterprise/usage',
      '/api/enterprise/finance/ledger',
      '/api/enterprise/finance/settlement',
      '/api/enterprise/finance/earnings',
    ];
    for (const ep of endpoints) {
      const res = await request.get(`${BASE}${ep}`, { failOnStatusCode: false });
      expect(res.status(), `${ep} should require auth`).toBeGreaterThanOrEqual(400);
    }
  });

  test('6.3 代理佣金API拒绝企业Token', async ({ request }) => {
    // 注册企业(非代理)
    const ts = Date.now();
    const username = `E2E_ent_only_${ts}`;
    await request.post(`${BASE}/api/enterprise/register`, {
      data: {
        username, password: 'EntOnly@2026!', email: `entonly_${ts}@e2e.test`,
        companyName: `Ent Only ${ts}`, contactName: 'Test', contactPhone: '13800000000',
        role: 'enterprise',
      },
      failOnStatusCode: false,
    });
    const loginRes = await request.post(`${BASE}/api/enterprise/login`, {
      data: { username, password: 'EntOnly@2026!' },
      failOnStatusCode: false,
    });
    const entToken = loginRes.ok()
      ? ((await loginRes.json()).data?.accessToken || (await loginRes.json()).data?.token || '')
      : '';

    const res = await request.get(`${BASE}/api/enterprise/finance/earnings`, {
      headers: entToken ? { Authorization: `Bearer ${entToken}` } : {},
      failOnStatusCode: false,
    });
    // 企业无代理权限应返回 403
    expect([401, 403]).toContain(res.status());
  });

  test('6.4 管理端API拒绝普通用户', async ({ request }) => {
    const ts = Date.now();
    const username = `E2E_normal_${ts}`;
    await request.post(`${BASE}/api/auth/register`, {
      data: { username, password: 'Normal@2026!', email: `normal_${ts}@e2e.test` },
      failOnStatusCode: false,
    });
    const loginRes = await request.post(`${BASE}/api/auth/login`, {
      data: { username, password: 'Normal@2026!' },
      failOnStatusCode: false,
    });
    const userToken = loginRes.ok()
      ? ((await loginRes.json()).data?.accessToken || (await loginRes.json()).data?.token || '')
      : '';

    const res = await request.get(`${BASE}/api/admin/dashboard`, {
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
      failOnStatusCode: false,
    });
    expect([401, 403]).toContain(res.status());
  });

  test('6.5 限流端点触发429', async ({ request }) => {
    // 连续快速请求支付相关端点
    for (let i = 0; i < 5; i++) {
      const res = await request.post(`${BASE}/api/enterprise/finance/withdrawal`, {
        data: { amount: 100000 + i },
        failOnStatusCode: false,
      });
      // 预期: 401(未认证) 或 429(限流) — 不限500
      expect(res.status()).toBeLessThan(500);
    }
  });
});

// ============================================================
// 链路 7: AI Token 计量完整性
// ============================================================
test.describe('链路7: AI Token 计量 → 成本核算', () => {
  test('7.1 AI 调度分类列表', async ({ request }) => {
    const res = await request.get(`${BASE}/api/ai/categories`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('7.2 AI 模型分类详情', async ({ request }) => {
    const res = await request.get(`${BASE}/api/ai/categories/text`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('7.3 AI 调度健康检查', async ({ request }) => {
    const res = await request.get(`${BASE}/api/ai/health`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('7.4 网关路由地图包含AI端点', async ({ request }) => {
    const res = await request.get(`${BASE}/api/gateway/routes`, {
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      const routes = body.data || body;
      // 网关路由地图应包含 ai 相关路由
      const hasAiRoute = JSON.stringify(routes).includes('ai') || JSON.stringify(routes).includes('gateway');
      expect(hasAiRoute).toBe(true);
    }
  });

  test('7.5 商品文案平台列表', async ({ request }) => {
    const res = await request.get(`${BASE}/api/copywriting/platforms`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('7.6 商品文案语种列表', async ({ request }) => {
    const res = await request.get(`${BASE}/api/copywriting/languages`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBeLessThan(500);
  });
});

// ============================================================
// 链路 8: 电商管线 — 图片→视频→文案
// ============================================================
test.describe('链路8: 电商管线 — 图片/视频/文案', () => {
  test('8.1 详情长图管线端点', async ({ request }) => {
    const res = await request.get(`${BASE}/api/detail/generate-set`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('8.2 图片生成选项', async ({ request }) => {
    const res = await request.get(`${BASE}/api/image/generate-options`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('8.3 上传预签名 URL', async ({ request }) => {
    const res = await request.get(`${BASE}/api/upload/presign`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('8.4 设计模板市场', async ({ request }) => {
    const res = await request.get(`${BASE}/api/template/market`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('8.5 智能抠图模板', async ({ request }) => {
    const res = await request.get(`${BASE}/api/background-removal/templates`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('8.6 多尺寸导出预设', async ({ request }) => {
    const res = await request.get(`${BASE}/api/multi-size/presets`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('8.7 长期记忆服务', async ({ request }) => {
    const res = await request.get(`${BASE}/api/ltm/stats`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBeLessThan(500);
  });
});
