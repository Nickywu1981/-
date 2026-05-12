/**
 * Geo Controller — IP 地理位置语言建议
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

const GEOIP_URL = config.geoIpApiUrl;

const COUNTRY_TO_LOCALE = {
  CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh', SG: 'zh',
  US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en', IN: 'en', PH: 'en',
  NG: 'en', ZA: 'en', KE: 'en', GH: 'en', TZ: 'en', UG: 'en', JM: 'en', TT: 'en',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es',
  GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es', SV: 'es', NI: 'es',
  CR: 'es', PA: 'es', UY: 'es', GQ: 'es',
};

function extractCountry(req) {
  return (
    req.headers['cf-ipcountry'] ||
    req.headers['x-geo-country'] ||
    req.headers['x-ip-country'] ||
    ''
  ).toUpperCase();
}

function extractIP(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return xff.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '';
}

export const suggestLocale = wrapController(async (req, res) => {
  const country = extractCountry(req);
  if (country && COUNTRY_TO_LOCALE[country]) {
    return success(res, { locale: COUNTRY_TO_LOCALE[country], country, source: 'cdn-header' });
  }

  const ip = extractIP(req);
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return success(res, { locale: 'zh', country: 'LOCAL', source: 'localhost-fallback' });
  }

  try {
    const r = await fetch(`${GEOIP_URL}/${encodeURIComponent(ip)}?fields=countryCode`, { signal: AbortSignal.timeout(3000) });
    const data = await r.json();
    const cc = (data?.countryCode || '').toUpperCase();
    const locale = COUNTRY_TO_LOCALE[cc] || 'zh';
    return success(res, { locale, country: cc, source: 'ip-api' });
  } catch (e) {
    logger.warn('[Geo] IP 定位查询失败', { error: e.message });
    return success(res, { locale: 'zh', country: 'UNKNOWN', source: 'error-fallback' });
  }
});
