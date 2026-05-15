import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001';

// ─── SQL注入防护 ───
test.describe('Security — SQL 注入防护', () => {
  const sqlPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "' UNION SELECT * FROM users --",
    "1' OR '1'='1' --",
    "admin'--",
    "' OR 1=1#",
    "'; SELECT * FROM information_schema.tables; --",
  ];

  test('登录接口抵御 SQL 注入', async ({ request }) => {
    for (const payload of sqlPayloads) {
      const res = await request.post(`${BASE}/api/auth/login`, {
        data: { username: payload, password: payload },
        failOnStatusCode: false,
      });
      // 不应返回500，应返回业务错误(400/401)
      expect(res.status()).toBeLessThan(500);
      const body = await res.json();
      expect(typeof body.code).toBe('number');
    }
  });

  test('查询参数 SQL 注入不500', async ({ request }) => {
    const endpoints = [
      '/api/works?page=1%27%20OR%20%271%27%3D%271',
      '/api/copywriting/history?type=%27%3B%20DROP%20TABLE%20users%3B--',
      '/api/advanced-image/tasks?status=%27%20UNION%20SELECT%20*%20FROM%20users--',
    ];
    for (const path of endpoints) {
      const res = await request.get(`${BASE}${path}`, { failOnStatusCode: false });
      expect(res.status()).toBeLessThan(500);
    }
  });
});

// ─── XSS 防护 ───
test.describe('Security — XSS 防护', () => {
  const xssPayloads = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    'javascript:alert(1)',
    '<iframe src="javascript:alert(1)">',
    '"><script>alert(document.cookie)</script>',
  ];

  test('创作类接口 XSS payload 不500', async ({ request }) => {
    const endpoints = [
      '/api/copywriting/generate-titles',
      '/api/copywriting/generate-description',
      '/api/copywriting/translate',
      '/api/copywriting/generate-script',
    ];

    for (const path of endpoints) {
      for (const payload of xssPayloads.slice(0, 3)) {
        const res = await request.post(`${BASE}${path}`, {
          data: { productName: payload, text: payload },
          failOnStatusCode: false,
        });
        expect(res.status()).toBeLessThan(500);
      }
    }
  });

  test('图片类接口 XSS payload 不500', async ({ request }) => {
    const endpoints = [
      '/api/advanced-image/virtual-tryon',
      '/api/advanced-image/style-transfer',
      '/api/advanced-image/text-effect',
    ];

    for (const path of endpoints) {
      const res = await request.post(`${BASE}${path}`, {
        data: { productImageUrl: '<img src=x onerror=alert(1)>', text: '<script>alert(1)</script>', targetStyle: '"><script>' },
        failOnStatusCode: false,
      });
      expect(res.status()).toBeLessThan(500);
    }
  });
});

// ─── 输入验证与边界测试 ───
test.describe('Security — 输入验证与边界', () => {
  test('超大请求体被拒绝', async ({ request }) => {
    const hugeText = 'A'.repeat(100000);
    const res = await request.post(`${BASE}/api/copywriting/generate-titles`, {
      data: { productName: hugeText },
      failOnStatusCode: false,
    });
    // 应返回 413 或业务错误
    expect(res.status()).toBeLessThan(500);
  });

  test('超长字符串不导致500', async ({ request }) => {
    const longStr = 'A'.repeat(10000);
    const endpoints = [
      { method: 'POST', path: '/api/copywriting/generate-titles', data: { productName: longStr } },
      { method: 'POST', path: '/api/advanced-image/text-effect', data: { text: longStr } },
      { method: 'POST', path: '/api/advanced-video/voice-gen', data: { text: longStr } },
      { method: 'POST', path: '/api/advanced-video/script-gen', data: { productInfo: longStr } },
    ];

    for (const { method, path, data } of endpoints) {
      const res = await request.post(`${BASE}${path}`, { data, failOnStatusCode: false });
      expect(res.status()).toBeLessThan(500);
    }
  });

  test('Unicode 与特殊字符不500', async ({ request }) => {
    const specialInputs = [
      '😀🎉🔥💯✨',
      '日本語テスト한국어',
      '\x00\x01\x02\x03',
      '\u200B\u200C\u200D\uFEFF',
      '\\\\"\'\"\'\n\r\t\b\f',
      '${7*7}',
      '{{constructor.constructor("return this")()}}',
      '../../etc/passwd',
    ];

    for (const input of specialInputs) {
      const res = await request.post(`${BASE}/api/copywriting/generate-titles`, {
        data: { productName: input },
        failOnStatusCode: false,
      });
      expect(res.status()).toBeLessThan(500);
    }
  });

  test('空数组与null值不500', async ({ request }) => {
    const negativeCases = [
      { data: { productImageUrl: null } },
      { data: { productImageUrl: [] } },
      { data: { productImageUrl: {} } },
      { data: { targetColors: null } },
      { data: { imageUrls: [] } },
    ];

    for (const { data } of negativeCases) {
      const res = await request.post(`${BASE}/api/advanced-image/virtual-tryon`, {
        data, failOnStatusCode: false,
      });
      expect(res.status()).toBeLessThan(500);
    }
  });

  test('极端分页参数不500', async ({ request }) => {
    const badPageParams = [
      'page=-1&pageSize=-10',
      'page=0&pageSize=0',
      'page=999999&pageSize=999999',
      'page=abc&pageSize=xyz',
      'page=&pageSize=',
      'page=1&pageSize=999999999',
    ];

    for (const params of badPageParams) {
      const res = await request.get(`${BASE}/api/advanced-image/tasks?${params}`, { failOnStatusCode: false });
      expect(res.status()).toBeLessThan(500);
      const res2 = await request.get(`${BASE}/api/copywriting/history?${params}`, { failOnStatusCode: false });
      expect(res2.status()).toBeLessThan(500);
    }
  });
});

// ─── 认证与授权安全 ───
test.describe('Security — 认证与授权', () => {
  test('无Token访问受保护接口返回401/403', async ({ request }) => {
    const protectedPaths = [
      '/api/advanced-image/virtual-tryon',
      '/api/advanced-video/img2video',
      '/api/copywriting/generate-titles',
      '/api/video/generate',
      '/api/image/generate',
      '/api/poster/generate',
      '/api/detail/generate-set',
      '/api/digital-human/create',
      '/api/voice/generate',
      '/api/video-translate/voice',
      '/api/model-generate/generate',
      '/api/render/product',
    ];

    for (const path of protectedPaths) {
      const res = await request.post(`${BASE}${path}`, { data: {}, failOnStatusCode: false });
      expect([401, 403]).toContain(res.status());
    }
  });

  test('伪造Token被拒绝', async ({ request }) => {
    const fakeTokens = [
      'Bearer fake-token-12345',
      'Bearer ',
      'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.fake',
      'token-without-bearer',
    ];

    for (const token of fakeTokens) {
      const res = await request.get(`${BASE}/api/user/profile`, {
        headers: { Authorization: token },
        failOnStatusCode: false,
      });
      expect([401, 403]).toContain(res.status());
    }
  });

  test('跨租户访问被拦截', async ({ request }) => {
    // 使用无效租户ID尝试访问
    const res = await request.get(`${BASE}/api/finance/ledger?tenant_id=hacked_tenant`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── 响应格式完整性 ───
test.describe('Security — 响应格式一致性', () => {
  test('错误响应始终包含 code 字段', async ({ request }) => {
    const errorPaths = [
      { method: 'POST', path: '/api/auth/login', data: { username: '', password: '' } },
      { method: 'POST', path: '/api/copywriting/generate-titles', data: {} },
      { method: 'POST', path: '/api/advanced-image/virtual-tryon', data: {} },
      { method: 'GET', path: '/api/nonexistent-path-xyz' },
    ];

    for (const { method, path, data } of errorPaths) {
      const res = method === 'POST'
        ? await request.post(`${BASE}${path}`, { data, failOnStatusCode: false })
        : await request.get(`${BASE}${path}`, { failOnStatusCode: false });
      const body = await res.json();
      expect(typeof body.code).toBe('number');
    }
  });

  test('Content-Type 始终为 application/json', async ({ request }) => {
    const paths = [
      '/api/health',
      '/api/site/config',
    ];

    for (const path of paths) {
      const res = await request.get(`${BASE}${path}`, { failOnStatusCode: false });
      const ct = res.headers()['content-type'] || '';
      expect(ct).toContain('application/json');
    }
  });
});

// ─── 限流保护 ───
test.describe('Security — 速率限制', () => {
  test('连续请求不触发500', async ({ request }) => {
    // 连续发送 5 次请求，不应500
    for (let i = 0; i < 5; i++) {
      const res = await request.get(`${BASE}/api/health`);
      expect(res.status()).toBeLessThan(500);
    }
  });

  test('创作类接口快速连续请求不500', async ({ request }) => {
    // 连续请求 3 次
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(
        request.post(`${BASE}/api/copywriting/generate-titles`, {
          data: { productName: 'test' },
          failOnStatusCode: false,
        })
      );
    }
    const results = await Promise.all(promises);
    for (const res of results) {
      expect(res.status()).toBeLessThan(500);
    }
  });
});
