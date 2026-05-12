import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../config/index.js', () => ({
  default: { geoIpApiUrl: 'http://ip-api.com/json' },
}));

// We test suggestLocale — the only export
import { suggestLocale } from '../../controller/geoController.js';

function mockRes() {
  const res = {};
  res._jsonBody = null;
  res.json = vi.fn(function (body) { res._jsonBody = body; return res; });
  res.setHeader = vi.fn();
  res.status = vi.fn(function () { return res; });
  return res;
}
function mockReq(overrides = {}) {
  return { headers: {}, ip: '127.0.0.1', socket: { remoteAddress: null }, ...overrides };
}

describe('geoController — suggestLocale', () => {
  it('cf-ipcountry header 返回对应locale', async () => {
    const res = mockRes();
    await suggestLocale(mockReq({ headers: { 'cf-ipcountry': 'US' } }), res);
    expect(res._jsonBody.data.locale).toBe('en');
    expect(res._jsonBody.data.source).toBe('cdn-header');
  });

  it('x-geo-country header 返回对应locale', async () => {
    const res = mockRes();
    await suggestLocale(mockReq({ headers: { 'x-geo-country': 'ES' } }), res);
    expect(res._jsonBody.data.locale).toBe('es');
  });

  it('未知国家码无CDN头时走localhost回退', async () => {
    const res = mockRes();
    await suggestLocale(mockReq({ ip: '127.0.0.1' }), res);
    expect(res._jsonBody.data.locale).toBe('zh');
    expect(res._jsonBody.data.source).toBe('localhost-fallback');
  });

  it('局域网IP走localhost回退', async () => {
    const res = mockRes();
    await suggestLocale(mockReq({ ip: '192.168.1.1' }), res);
    expect(res._jsonBody.data.locale).toBe('zh');
    expect(res._jsonBody.data.source).toBe('localhost-fallback');
  });

  it('10.x 内网IP走localhost回退', async () => {
    const res = mockRes();
    await suggestLocale(mockReq({ ip: '10.0.0.1' }), res);
    expect(res._jsonBody.data.locale).toBe('zh');
  });

  it('x-forwarded-for 从头部取IP', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ countryCode: 'JP' }) }));
    const res = mockRes();
    const req = mockReq({ headers: { 'x-forwarded-for': '8.8.8.8' }, ip: '', socket: undefined });
    await suggestLocale(req, res);
    expect(global.fetch).toHaveBeenCalled();
  });
});
