/**
 * 输出审核服务 — LLM 响应后置过滤
 *
 * 复用 sensitiveWordService 敏感词库，支持三级动作:
 *   block — 拦截并返回空
 *   warn  — 通过但标记违规
 *   log   — 仅记录审计日志
 */
import * as sensitiveWordService from './sensitiveWordService.js';
import logger from '../utils/logger.js';

/**
 * 审核输出文本
 * @param {string} text - LLM 输出文本
 * @param {Object} [opts]
 * @param {number} [opts.level=5] - 审核级别 0-5
 * @param {string[]} [opts.blockedTerms=[]] - 自定义禁止词
 * @param {Object} [opts.requiredPatterns] - 必须包含/排除的模式
 */
export async function moderateOutput(text, { level = 5, blockedTerms = [], requiredPatterns } = {}) {
  if (!text || typeof text !== 'string') {
    return { passed: true, riskLevel: 'safe', violations: [] };
  }

  const violations = [];

  // 敏感词扫描
  try {
    const result = await sensitiveWordService.checkText(text);
    if (result && result.violations) {
      violations.push(...result.violations);
    }
  } catch (e) {
    logger.warn(`[Moderation] Sensitive word scan failed: ${e.message}`);
  }

  // 自定义禁止词
  if (blockedTerms.length > 0) {
    const lower = text.toLowerCase();
    for (const term of blockedTerms) {
      if (lower.includes(term.toLowerCase())) {
        violations.push({ word: term, type: 'custom_blocked' });
      }
    }
  }

  // 必须包含/排除模式检查
  if (requiredPatterns) {
    if (requiredPatterns.mustNotContain && Array.isArray(requiredPatterns.mustNotContain)) {
      for (const pattern of requiredPatterns.mustNotContain) {
        if (text.includes(pattern)) {
          violations.push({ word: pattern, type: 'forbidden_pattern' });
        }
      }
    }
    if (requiredPatterns.mustStartWith && !text.startsWith(requiredPatterns.mustStartWith)) {
      violations.push({ word: 'mustStartWith', type: 'pattern_mismatch', detail: requiredPatterns.mustStartWith });
    }
  }

  const passed = violations.length === 0;
  const riskLevel = violations.length === 0 ? 'safe'
    : violations.length <= 2 ? 'low'
    : violations.length <= 5 ? 'medium'
    : 'high';

  return { passed, riskLevel, violations: violations.slice(0, 20) };
}
