import * as geoRulesDao from '../dao/geoRulesDao.js';
import logger from '../utils/logger.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { BusinessError } from '../utils/businessError.js';

export async function listRules() {
  return geoRulesDao.listAll();
}

export async function getRule(id) {
  const rule = await geoRulesDao.getById(id);
  if (!rule) throw new BusinessError(ERROR_CODE.NOT_FOUND);
  return rule;
}

export async function createRule(data) {
  const id = await geoRulesDao.insert(data);
  logger.info('[GEO] Rule created', { id, name: data.rule_name });
  return { id };
}

export async function updateRule(id, data) {
  const affected = await geoRulesDao.update(id, data);
  if (affected === 0) throw new BusinessError(ERROR_CODE.NOT_FOUND);
  logger.info('[GEO] Rule updated', { id });
  return { affected };
}

export async function deleteRule(id) {
  const affected = await geoRulesDao.remove(id);
  if (affected === 0) throw new BusinessError(ERROR_CODE.NOT_FOUND);
  logger.info('[GEO] Rule deleted', { id });
  return { affected };
}

/**
 * GEO 规则评估引擎 — 根据国家/平台返回匹配规则
 * @param {string} countryCode - 国家代码如 'US'
 * @param {string} [platformCode] - 平台代码如 'amazon'
 * @returns {{ locale: string|null, blockedModels: string[], reviewLevel: number, outputConstraints: object|null }}
 */
export async function evaluateRules(countryCode, platformCode) {
  if (!countryCode) {
    return { locale: null, blockedModels: [], reviewLevel: 0, outputConstraints: null };
  }

  const allRules = await geoRulesDao.getMatchingRules(countryCode, platformCode);

  const safeParseArray = (v) => {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
      try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
  };
  const safeParseObj = (v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) return v;
    if (typeof v === 'string') {
      try { return JSON.parse(v); } catch { return null; }
    }
    return null;
  };

  const matched = allRules.filter(r => {
    const countries = safeParseArray(r.country_codes);
    if (!countries.includes(countryCode)) return false;

    if (r.platform_codes && platformCode) {
      const platforms = safeParseArray(r.platform_codes);
      if (platforms.length > 0 && !platforms.includes(platformCode)) return false;
    }
    return true;
  });

  const result = { locale: null, blockedModels: [], reviewLevel: 0, outputConstraints: null };
  for (const rule of matched.sort((a, b) => (b.priority || 0) - (a.priority || 0))) {
    if (rule.locale && !result.locale) result.locale = rule.locale;
    if (rule.blocked_models) {
      const blocked = safeParseArray(rule.blocked_models);
      if (blocked.length) result.blockedModels = [...new Set([...result.blockedModels, ...blocked])];
    }
    if ((rule.review_level || 0) > result.reviewLevel) result.reviewLevel = rule.review_level;
    if (rule.output_constraints && !result.outputConstraints) {
      result.outputConstraints = safeParseObj(rule.output_constraints);
    }
  }

  return result;
}
