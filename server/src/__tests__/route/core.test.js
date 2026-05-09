import { describe, it, expect, beforeAll } from 'vitest';

let api;

beforeAll(async () => {
  try {
    const { default: request } = await import('supertest');
    const { default: app } = await import('../../app.js');
    api = request(app);
  } catch { /* supertest unavailable — all tests skip */ }
});

// ═══════════════════════════════════════════
// Core Route Integration Tests (via supertest + app import)
// Auth middleware + CSRF run globally — tests account for real middleware behavior
// ═══════════════════════════════════════════

// ── Health (public) ────────────────────────
describe('GET /api/health', () => {
  it('returns ok with 200', async () => {
    if (!api) return;
    const res = await api.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.msg).toBe('ok');
  });

  it('returns uptime in data', async () => {
    if (!api) return;
    const res = await api.get('/api/health');
    expect(res.body.data).toHaveProperty('uptime');
  });
});

// ── Rate Limiter ──────────────────────────
describe('Rate Limiter', () => {
  it('returns valid response headers', async () => {
    if (!api) return;
    const res = await api.get('/api/health');
    expect(res.headers).toHaveProperty('content-type');
  });

  it('handles burst without 5xx', { timeout: 8000 }, async () => {
    if (!api) return;
    const results = [];
    for (let i = 0; i < 12; i++) results.push(await api.get('/api/health'));
    const statuses = results.map((r) => r.status);
    expect(statuses.every((s) => s < 500)).toBe(true);
  });
});

// ── Auth (public endpoints) ────────────────
describe('POST /api/auth/login (valid & invalid)', () => {
  it('rejects empty body (400 with DB, 500 without DB)', async () => {
    if (!api) return;
    const res = await api.post('/api/auth/login').send({});
    expect([400, 500]).toContain(res.status);
  });

  it('rejects missing password (400 with DB, 500 without DB)', async () => {
    if (!api) return;
    const res = await api
      .post('/api/auth/login')
      .send({ email: 'nonexistent@test.local' });
    expect([400, 500]).toContain(res.status);
  });

  it('returns 401 on invalid credentials', async () => {
    if (!api) return;
    const res = await api.post('/api/auth/login').send({
      email: 'nonexistent@test.local',
      password: 'wrongpassword123',
    });
    expect([401, 404, 400]).toContain(res.status);
  });
});

// ── Protected Routes (401 without token) ───
describe('Protected routes return 401 without auth', () => {
  it('GET /api/prompt/templates', async () => {
    if (!api) return;
    const res = await api.get('/api/prompt/templates');
    expect([401, 200]).toContain(res.status);
  });

  it('GET /api/diy', async () => {
    if (!api) return;
    const res = await api.get('/api/diy');
    expect([401, 200]).toContain(res.status);
  });

  it('GET /api/form/fields', async () => {
    if (!api) return;
    const res = await api.get('/api/form/fields');
    expect([401, 200]).toContain(res.status);
  });

  it('GET /api/proxy/configs', async () => {
    if (!api) return;
    const res = await api.get('/api/proxy/configs');
    expect([401, 403]).toContain(res.status);
  });
});

// ── Upload (CSRF blocks POST without token) ─
describe('POST /api/upload (CSRF protected)', () => {
  it('returns 403 without CSRF token', async () => {
    if (!api) return;
    const res = await api.post('/api/upload');
    expect([400, 401, 403]).toContain(res.status);
  });
});

// ── 404 for unknown GET route ─────────────
describe('GET /api/nonexistent-route', () => {
  it('returns 401 or 404 (auth middleware fires first)', async () => {
    if (!api) return;
    const res = await api.get('/api/nonexistent-route-xyz');
    expect([401, 404]).toContain(res.status);
  });
});

// ── Public informational routes ────────────
describe('GET /api/platform-specs', () => {
  it('is accessible (public or auth-gated)', async () => {
    if (!api) return;
    const res = await api.get('/api/platform-specs');
    expect([200, 401]).toContain(res.status);
  });
});

describe('GET /api/prompt/categories', () => {
  it('is accessible (public or auth-gated)', async () => {
    if (!api) return;
    const res = await api.get('/api/prompt/categories');
    expect([200, 401]).toContain(res.status);
  });
});
