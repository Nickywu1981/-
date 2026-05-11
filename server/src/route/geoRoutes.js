/**
 * Geo-IP 语言建议中间件
 * 通过请求 IP 判断访客所在国家，返回建议语言代码
 *
 * 优先级：国内 IP → zh，英语国家 → en，西语国家 → es，默认 → zh
 */
import { Router } from 'express';
import { success } from '../utils/response.js';

const router = Router();

// 内联国家→语言映射，无需外部 GeoIP 数据库
const COUNTRY_TO_LOCALE = {
  // 中文区
  CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh', SG: 'zh',
  // 英语区
  US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en', IN: 'en', PH: 'en',
  NG: 'en', ZA: 'en', KE: 'en', GH: 'en', TZ: 'en', UG: 'en', JM: 'en', TT: 'en',
  // 西语区
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es',
  GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es', SV: 'es', NI: 'es',
  CR: 'es', PA: 'es', UY: 'es', GQ: 'es',
};

// Cloudflare / 常见 CDN IP 国家头
function extractCountry(req) {
  return (
    req.headers['cf-ipcountry'] ||
    req.headers['x-geo-country'] ||
    req.headers['x-ip-country'] ||
    ''
  ).toUpperCase();
}

// 从 X-Forwarded-For 或 req.ip 提取真实 IP
function extractIP(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return xff.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '';
}

router.get('/api/geo/suggest-locale', async (req, res) => {
  try {
    const country = extractCountry(req);
    if (country && COUNTRY_TO_LOCALE[country]) {
      return success(res, { locale: COUNTRY_TO_LOCALE[country], country, source: 'cdn-header' });
    }

    const ip = extractIP(req);
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return success(res, { locale: 'zh', country: 'LOCAL', source: 'localhost-fallback' });
    }

    try {
      const r = await fetch(`https://ip-api.com/json/${encodeURIComponent(ip)}?fields=countryCode`, { signal: AbortSignal.timeout(3000) });
      const data = await r.json();
      const cc = (data?.countryCode || '').toUpperCase();
      const locale = COUNTRY_TO_LOCALE[cc] || 'zh';
      return success(res, { locale, country: cc, source: 'ip-api' });
    } catch {
      // IP-API unreachable — fallback to zh
      return success(res, { locale: 'zh', country: 'UNKNOWN', source: 'error-fallback' });
    }
  } catch {
    // outer guard — return safe default
    return success(res, { locale: 'zh', country: 'UNKNOWN', source: 'error-fallback' });
  }
});

export default router;
