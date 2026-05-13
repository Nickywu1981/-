/**
 * 输出审核服务 — LLM 响应后置过滤 (增强版)
 *
 * 复用 sensitiveWordService 敏感词库 + 阿里云绿网 + PII二次脱敏
 * 三级动作: block — 拦截 / warn — 标记 / log — 仅记录
 * 支持流式输出预留
 */
import * as sensitiveWordService from './sensitiveWordService.js';
import { textScan } from './aliyunGreenService.js';
import { sanitizePII } from './inputSanitizerService.js';
import logger from '../utils/logger.js';

/**
 * 审核输出文本
 * @param {string} text - LLM 输出文本
 * @param {Object} [opts]
 * @param {number} [opts.level=5] - 审核级别 0-5 (0=关闭, 5=最严)
 * @param {string[]} [opts.blockedTerms=[]] - GEO 自定义禁止词
 * @param {Object} [opts.requiredPatterns] - 必须包含/排除的模式
 * @param {boolean} [opts.enableAliyun=false] - 是否启用阿里云绿网
 * @param {boolean} [opts.enablePIIMask=true] - 是否对输出进行PII二次脱敏
 * @returns {{ passed: boolean, riskLevel: string, violations: Array, sanitizedOutput: string|null }}
 */
export async function moderateOutput(text, {
  level = 5,
  blockedTerms = [],
  requiredPatterns = null,
  enableAliyun = false,
  enablePIIMask = true,
} = {}) {
  if (!text || typeof text !== 'string') {
    return { passed: true, riskLevel: 'safe', violations: [], sanitizedOutput: null };
  }

  // 级别为 0 则完全跳过审核
  if (level === 0) return { passed: true, riskLevel: 'safe', violations: [], sanitizedOutput: null };

  const violations = [];

  // 自建敏感词扫描
  try {
    const result = await sensitiveWordService.checkText(text);
    if (result && result.hits && result.hits.length > 0) {
      violations.push(...result.hits.map(h => ({
        source: 'self_built',
        word: h.word,
        category: h.category || 'unknown',
        level: h.level,
      })));
    }
  } catch (e) {
    logger.warn(`[OutputModeration] Sensitive word scan failed: ${e.message}`);
  }

  // 阿里云绿网增强检测
  if (enableAliyun && violations.length === 0) {
    try {
      const aliResult = await textScan(text);
      if (!aliResult.passed) {
        violations.push(
          ...aliResult.violations.map(v => ({
            source: 'aliyun_green',
            label: v.label,
            rate: v.rate,
            suggestion: v.suggestion,
          })),
        );
      }
    } catch (e) {
      logger.warn(`[OutputModeration] AliyunGreen scan failed: ${e.message}`);
    }
  }

  // GEO 自定义禁止词检查
  if (blockedTerms.length > 0) {
    const lower = text.toLowerCase();
    for (const term of blockedTerms) {
      if (lower.includes(term.toLowerCase())) {
        violations.push({ word: term, type: 'custom_blocked', source: 'geo_rules' });
      }
    }
  }

  // 必须包含/排除模式检查
  if (requiredPatterns) {
    if (requiredPatterns.mustNotContain && Array.isArray(requiredPatterns.mustNotContain)) {
      for (const pattern of requiredPatterns.mustNotContain) {
        if (text.includes(pattern)) {
          violations.push({ word: pattern, type: 'forbidden_pattern', source: 'geo_rules' });
        }
      }
    }
    if (requiredPatterns.mustStartWith && !text.startsWith(requiredPatterns.mustStartWith)) {
      violations.push({ word: 'mustStartWith', type: 'pattern_mismatch', detail: requiredPatterns.mustStartWith, source: 'geo_rules' });
    }
  }

  const passed = violations.length === 0;
  const riskLevel = violations.length === 0 ? 'safe'
    : violations.length <= 2 ? 'low'
    : violations.length <= 5 ? 'medium'
    : 'high';

  // PII 二次脱敏（模型输出可能生成含 PII 的文本）
  let sanitizedOutput = null;
  if (enablePIIMask && passed) {
    try {
      const { sanitized, maskedCount } = sanitizePII(text);
      if (maskedCount > 0) {
        sanitizedOutput = sanitized;
        logger.info(`[OutputModeration] PII 二次脱敏: ${maskedCount} 处`);
      }
    } catch (e) {
      logger.warn(`[OutputModeration] PII mask failed: ${e.message}`);
    }
  }

  return { passed, riskLevel, violations: violations.slice(0, 20), sanitizedOutput };
}
