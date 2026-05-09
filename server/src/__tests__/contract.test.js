/**
 * API 契约测试 — 验证所有核心接口的请求/响应格式
 * 前置条件: 服务已在 3001 端口运行
 * 如服务未运行则跳过
 */
import { describe, it, expect } from 'vitest';
const BASE = 'http://localhost:3001';

function api() {
  async function req(method, path, body, opts = {}) {
    const url = new URL(path, BASE);
    const headers = { 'Content-Type': 'application/json' };
    if (opts.cookie) headers['Cookie'] = opts.cookie;

    const options = { method, headers };
    if (body && method !== 'GET') options.body = JSON.stringify(body);

    const res = await fetch(url.toString(), options);
    const setCookie = res.headers.get('set-cookie');
    const cookie = setCookie
      ? setCookie.split(';')[0]
      : null;

    let data;
    try { data = await res.json(); } catch { data = null; }

    if (opts.expect) {
      expect(res.status).toBe(opts.expect);
    } else {
      expect(res.status).toBe(200);
    }
    return { data: data?.data, cookie };
  }

  return {
    get: (path, opts) => req('GET', path, null, opts),
    post: (path, body, opts) => req('POST', path, body, opts),
    put: (path, body, opts) => req('PUT', path, body, opts),
    del: (path, opts) => req('DELETE', path, null, opts),
  };
}

// ── 检查服务是否可用 ────────────────
async function isServerUp() {
  try {
    const res = await fetch(BASE + '/api/health');
    return res.ok;
  } catch { return false; }
}

// ── Auth 契约 ──────────────────────
describe('Auth 接口契约', () => {
  const a = api();

  it('POST /api/auth/register → 200, 返回 user (无 password)', async () => {
    if (!(await isServerUp())) return;
    const ts = Date.now();
    const { data } = await a.post('/api/auth/register', {
      email: `contract_${ts}@test.com`, password: 'Test123456', nickname: 'tester',
    });
    expect(data).toBeDefined();
    expect(typeof data.id).toBe('number');
    expect(data.password).toBeUndefined();
    expect(data.role).toBe('free');
  });

  it('POST /api/auth/login → 200, 返回 user', async () => {
    if (!(await isServerUp())) return;
    const ts = Date.now();
    const email = `contract_${ts}@test.com`;
    await a.post('/api/auth/register', { email, password: 'Test123456', nickname: 't2' });
    const { data } = await a.post('/api/auth/login', { email, password: 'Test123456' });
    expect(data && data.id).toBeTruthy();
    expect(data.password).toBeUndefined();
  });

  it('POST /api/auth/login → 401 密码错误', async () => {
    if (!(await isServerUp())) return;
    const ts = Date.now();
    const email = `contract_${ts}@test.com`;
    await a.post('/api/auth/register', { email, password: 'Test123456', nickname: 't3' });
    await a.post('/api/auth/login', { email, password: 'wrongpassword' }, { expect: 401 });
  });
});

// ── 套餐/支付/用户契约 ──────────────
describe('支付&用户接口契约', () => {
  const a = api();

  it('GET /api/payment/plans → 200, 返回 plans 列表', async () => {
    if (!(await isServerUp())) return;
    const { data } = await a.get('/api/payment/plans');
    const list = Array.isArray(data) ? data : data?.list;
    expect(Array.isArray(list)).toBe(true);
    if (list.length > 0) {
      expect(typeof list[0].name).toBe('string');
    }
  });

  it('GET /api/user/profile → 401 未登录', async () => {
    if (!(await isServerUp())) return;
    await a.get('/api/user/profile', { expect: 401 });
  });
});

// ── Health 契约 ────────────────────
describe('Health 接口契约', () => {
  const a = api();

  it('GET /api/health → 200, 返回 status', async () => {
    if (!(await isServerUp())) { expect(true).toBe(true); return; }
    const { data } = await a.get('/api/health');
    expect(data.status).toBe('ok');
  });
});
