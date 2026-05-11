import * as geoRulesDao from '../dao/geoRulesDao.js';
import logger from '../utils/logger.js';

export async function listRules() {
  return geoRulesDao.listAll();
}

export async function getRule(id) {
  const rule = await geoRulesDao.getById(id);
  if (!rule) throw Object.assign(new Error('GEO rule not found'), { status: 404 });
  return rule;
}

export async function createRule(data) {
  const id = await geoRulesDao.insert(data);
  logger.info('[GEO] Rule created', { id, name: data.rule_name });
  return { id };
}

export async function updateRule(id, data) {
  const affected = await geoRulesDao.update(id, data);
  if (affected === 0) throw Object.assign(new Error('GEO rule not found'), { status: 404 });
  logger.info('[GEO] Rule updated', { id });
  return { affected };
}

export async function deleteRule(id) {
  const affected = await geoRulesDao.remove(id);
  if (affected === 0) throw Object.assign(new Error('GEO rule not found'), { status: 404 });
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

  const matched = allRules.filter(r => {
    let countries = r.country_codes;
    if (typeof countries === 'string') countries = JSON.parse(countries);
    if (!Array.isArray(countries) || !countries.includes(countryCode)) return false;

    if (r.platform_codes && platformCode) {
      let platforms = r.platform_codes;
      if (typeof platforms === 'string') platforms = JSON.parse(platforms);
      if (Array.isArray(platforms) && platforms.length > 0 && !platforms.includes(platformCode)) return false;
    }
    return true;
  });

  const result = { locale: null, blockedModels: [], reviewLevel: 0, outputConstraints: null };
  for (const rule of matched.sort((a, b) => (b.priority || 0) - (a.priority || 0))) {
    if (rule.locale && !result.locale) result.locale = rule.locale;
    if (rule.blocked_models) {
      const blocked = typeof rule.blocked_models === 'string' ? JSON.parse(rule.blocked_models) : rule.blocked_models;
      if (Array.isArray(blocked)) result.blockedModels = [...new Set([...result.blockedModels, ...blocked])];
    }
    if ((rule.review_level || 0) > result.reviewLevel) result.reviewLevel = rule.review_level;
    if (rule.output_constraints && !result.outputConstraints) {
      result.outputConstraints = typeof rule.output_constraints === 'string' ? JSON.parse(rule.output_constraints) : rule.output_constraints;
    }
  }

  return result;
}
