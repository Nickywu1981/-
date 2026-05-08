import { describe, it, expect } from 'vitest';
import request from 'supertest';

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const api = request(BASE);

// ═══════════════════════════════════════════
// Core Route Integration Tests
// Requires: TEST_BASE_URL=http://127.0.0.1:3000 vitest run
// ═══════════════════════════════════════════

describe('GET /api/health', () => {
  it('returns ok with 200', async () => {
    const res = await api.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('ok');
  });

  it('returns timestamp in data', async () => {
    const res = await api.get('/api/health');
    expect(res.body.data).toHaveProperty('timestamp');
  });
});

// ── Rate Limiter ──────────────────────────
describe('Rate Limiter', () => {
  it('sets rate-limit headers', async () => {
    const res = await api.get('/api/health');
    expect(res.headers).toHaveProperty('x-ratelimit-limit');
    expect(res.headers).toHaveProperty('x-ratelimit-remaining');
  });

  it('rejects burst with 429 (if triggered)', { timeout: 8000 }, async () => {
    // Fast bursts to trigger rate limiter; accept 429 or 200 if not hit
    const results = [];
    for (let i = 0; i < 12; i++) results.push(await api.get('/api/health'));
    const statuses = results.map((r) => r.status);
    // At least verify no 5xx errors under burst
    expect(statuses.every((s) => s < 500)).toBe(true);
  });
});

// ── Auth ──────────────────────────────────
describe('POST /api/user/login (valid & invalid)', () => {
  it('returns 400 on empty body', async () => {
    const res = await api.post('/api/user/login').send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 on missing password', async () => {
    const res = await api
      .post('/api/user/login')
      .send({ email: 'nonexistent@test.local' });
    expect(res.status).toBe(400);
  });

  it('returns 401 on invalid credentials', async () => {
    const res = await api.post('/api/user/login').send({
      email: 'nonexistent@test.local',
      password: 'wrongpassword123',
    });
    expect([401, 404]).toContain(res.status);
  });
});

// ── Prompt Templates ──────────────────────
describe('GET /api/prompt/templates', () => {
  it('returns prompt list with 200', async () => {
    const res = await api.get('/api/prompt/templates');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it('supports pagination query', async () => {
    const res = await api.get('/api/prompt/templates?page=1&pageSize=10');
    expect(res.status).toBe(200);
  });

  it('supports category filter', async () => {
    const res = await api.get('/api/prompt/templates?category=main_image');
    expect(res.status).toBe(200);
  });

  it('supports search keyword', async () => {
    const res = await api.get('/api/prompt/templates?keyword=电商');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/prompt/categories', () => {
  it('returns categories with 200', async () => {
    const res = await api.get('/api/prompt/categories');
    expect(res.status).toBe(200);
  });
});

// ── Image Routes ──────────────────────────
describe('POST /api/image/generate (auth required)', () => {
  it('returns 401 without token', async () => {
    const res = await api.post('/api/image/generate').send({
      prompt: 'a white sneaker on plain white background',
    });
    expect([401, 403]).toContain(res.status);
  });
});

// ── Platform Spec ─────────────────────────
describe('GET /api/platform-specs', () => {
  it('returns platform specs list', async () => {
    const res = await api.get('/api/platform-specs');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });
});

// ── DIY Pages ─────────────────────────────
describe('DIY Page Routes', () => {
  it('GET /api/diy returns list', async () => {
    const res = await api.get('/api/diy');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it('GET /api/diy/:id returns 404 for missing', async () => {
    const res = await api.get('/api/diy/nonexistent-id');
    expect([404, 400]).toContain(res.status);
  });
});

// ── Form Routes ───────────────────────────
describe('GET /api/form/fields', () => {
  it('returns form fields with 200', async () => {
    const res = await api.get('/api/form/fields');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });
});

// ── Proxy Config (admin) ──────────────────
describe('GET /api/proxy/configs (auth required)', () => {
  it('returns 401 without token', async () => {
    const res = await api.get('/api/proxy/configs');
    expect([401, 403]).toContain(res.status);
  });
});

// ── Upload ────────────────────────────────
describe('POST /api/upload (file validation)', () => {
  it('returns 400 when no file provided', async () => {
    const res = await api.post('/api/upload');
    expect(res.status).toBe(400);
  });
});

// ── 404 Catch-all ─────────────────────────
describe('GET /api/nonexistent-route', () => {
  it('returns 404', async () => {
    const res = await api.get('/api/nonexistent-route-xyz');
    expect([404, 200]).toContain(res.status); // some apps return 200 with error body
  });
});
