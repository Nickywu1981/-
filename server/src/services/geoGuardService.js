/**
 * GEO 地域守卫服务 — P2 增强
 *
 * 在现有 geoRulesService 之上补充：
 *   1) IP → 国家自动解析 (支持本地缓存)
 *   2) 就近路由 — 优先选择区域最优模型端点
 *   3) 结构化 GEO 决策日志
 */
import logger from '../utils/logger.js';
import { evaluateRules } from './geoRulesService.js';
import config from '../config/index.js';

// IP → 国家 本地缓存 (TTL 1h)
const ipCache = new Map();
const IP_CACHE_TTL = 3600000;
const GEO_API = config.geoIpApiUrl || 'https://ip-api.com/json';

// 区域 → 模型端点映射 (就近路由)
const REGION_ENDPOINTS = {
  CN: { baseUrl: process.env.AI_BASE_URL_CN || process.env.OPENAI_BASE_URL, label: '中国内地' },
  US: { baseUrl: process.env.AI_BASE_URL_US || process.env.OPENAI_BASE_URL, label: '北美' },
  EU: { baseUrl: process.env.AI_BASE_URL_EU || process.env.OPENAI_BASE_URL, label: '欧洲' },
  SG: { baseUrl: process.env.AI_BASE_URL_SG || process.env.OPENAI_BASE_URL, label: '东南亚' },
  JP: { baseUrl: process.env.AI_BASE_URL_JP || process.env.OPENAI_BASE_URL, label: '日本' },
};

/**
 * IP → 国家代码
 * @param {string} ip 客户端 IP
 * @returns {Promise<{ countryCode: string, country: string, city: string, region: string }|null>}
 */
export async function resolveIpToCountry(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return { countryCode: 'CN', country: 'China', city: 'Local', region: 'local' };
  }

  const cached = ipCache.get(ip);
  if (cached && Date.now() - cached.ts < IP_CACHE_TTL) {
    return cached.data;
  }

  try {
    const res = await fetch(`${GEO_API}/${ip}?fields=countryCode,country,city,region`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const result = {
      countryCode: data.countryCode || 'UNKNOWN',
      country: data.country || 'Unknown',
      city: data.city || 'Unknown',
      region: data.region || 'Unknown',
    };
    ipCache.set(ip, { data: result, ts: Date.now() });
    logger.debug('[GEO] IP resolved', { ip: ip.slice(0, 8) + '***', country: result.countryCode });
    return result;
  } catch (err) {
    logger.warn('[GEO] IP lookup failed, using default', { ip: ip.slice(0, 8) + '***', error: err.message });
    return { countryCode: 'CN', country: 'China', city: 'Unknown', region: 'default' };
  }
}

/**
 * 全链路 GEO 守卫 — 解析 IP → 评估规则 → 就近路由
 * @returns {Promise<{ blocked: boolean, blockReason?: string, geo: object, regionEndpoint?: string }>}
 */
export async function geoGuard(ip, modelId, platformCode) {
  const geo = await resolveIpToCountry(ip);
  const countryCode = geo.countryCode;

  // 评估 GEO 规则
  let rules;
  try {
    rules = await evaluateRules(countryCode, platformCode);
  } catch (err) {
    logger.warn('[GEO] Rule evaluation failed', err.message);
    rules = { locale: null, blockedModels: [], reviewLevel: 0, outputConstraints: null };
  }

  // 模型封锁检查
  if (rules.blockedModels?.includes(modelId)) {
    logger.warn('[GEO] Model blocked by geo rule', { modelId, countryCode, platformCode });
    return {
      blocked: true,
      blockReason: `模型 ${modelId} 在您所在地区 (${geo.country}) 不可用`,
      geo: { countryCode, ...geo, rules },
    };
  }

  // 就近路由 — 选择区域端点
  const regionEndpoint = REGION_ENDPOINTS[countryCode]?.baseUrl || null;

  logger.info('[GEO] Guard passed', {
    countryCode,
    modelId,
    reviewLevel: rules.reviewLevel,
    hasRegionEndpoint: !!regionEndpoint,
  });

  return {
    blocked: false,
    geo: { countryCode, country: geo.country, city: geo.city, rules, reviewLevel: rules.reviewLevel },
    regionEndpoint,
  };
}

/**
 * 定期清理 IP 缓存
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of ipCache) {
    if (now - entry.ts > IP_CACHE_TTL * 2) ipCache.delete(key);
  }
}, 600000).unref();

export default { resolveIpToCountry, geoGuard };
