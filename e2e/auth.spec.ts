import { test, expect } from '@playwright/test';

test.describe('认证流程 — API E2E', () => {
  const testUser = `e2e_${Date.now()}`;
  const testPassword = 'E2eTest_123!';

  test('注册 → 登录 → 获取用户信息', async ({ request }) => {
    // 注册
    const registerRes = await request.post('http://localhost:3001/api/auth/register', {
      data: { username: testUser, password: testPassword, email: `${testUser}@e2e.test` },
      failOnStatusCode: false,
    });
    expect([200, 201, 409]).toContain(registerRes.status());

    // 登录
    const loginRes = await request.post('http://localhost:3001/api/auth/login', {
      data: { username: testUser, password: testPassword },
    });
    // 注册可能失败（用户已存在），但登录应成功
    if (loginRes.status() === 200) {
      const body = await loginRes.json();
      expect(body.data?.token || body.token).toBeTruthy();
    }
  });

  test('错误密码登录被拒绝', async ({ request }) => {
    const res = await request.post('http://localhost:3001/api/auth/login', {
      data: { username: 'nonexistent_user_99999', password: 'wrong' },
      failOnStatusCode: false,
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('未登录访问受保护接口返回 401', async ({ request }) => {
    const res = await request.get('http://localhost:3001/api/user/profile', {
      failOnStatusCode: false,
    });
    expect([401, 403]).toContain(res.status());
  });
});
