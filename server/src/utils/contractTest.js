/**
 * API 契约测试工具 — 验证接口请求/响应与类型定义一致
 *
 * 用法:
 *   import { contract } from './contractTest.js'
 *   const { data } = await contract(app).post('/api/auth/login', { phone, password }).expect(200)
 */

import { ErrorCode } from '../utils/errorCodes.js';

/** 超轻量契约测试 — 直接对 Express app 发 HTTP 请求 */
export function contract(app) {
  const req = async (method, path, body, opts = {}) => {
    const { cookie, expect: expectedCode = 200 } = opts;

    const headers = { 'Content-Type': 'application/json' };
    if (cookie) headers['Cookie'] = cookie;

    const url = new URL(path, 'http://127.0.0.1:3001');
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual',
    });

    const json = await res.json();
    const cookies = res.headers.get('set-cookie') || '';

    // 断言
    const ok = json.code === expectedCode;
    if (!ok) {
      throw new Error(`[CONTRACT FAIL] ${method} ${path} → expected code=${expectedCode}, got code=${json.code} msg="${json.msg}"`);
    }

    return { status: res.status, code: json.code, msg: json.msg, data: json.data, cookie: cookies };
  };

  return {
    get: (path, opts) => req('GET', path, null, opts),
    post: (path, body, opts) => req('POST', path, body, opts),
    put: (path, body, opts) => req('PUT', path, body, opts),
    delete: (path, opts) => req('DELETE', path, null, opts),
  };
}

/** 断言工具 */
export function assert(condition, msg) {
  if (!condition) throw new Error(`[CONTRACT ASSERT] ${msg}`);
}

/** 批量运行契约测试 */
export async function runContractTests(name, tests) {
  const results = [];
  let passed = 0;
  let failed = 0;

  console.log(`\n=== ${name} (${tests.length} tests) ===`);

  for (const { label, fn } of tests) {
    try {
      await fn();
      results.push({ label, status: 'PASS' });
      passed++;
      console.log(`  ✅ ${label}`);
    } catch (err) {
      results.push({ label, status: 'FAIL', error: err.message });
      failed++;
      console.log(`  ❌ ${label}: ${err.message}`);
    }
  }

  console.log(`\n${passed}/${passed + failed} passed\n`);
  return { passed, failed, results };
}
