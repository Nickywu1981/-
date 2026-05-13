/**
 * 提示词强制封装器 — 关闭裸调用入口
 *
 * 所有商家请求必须经此模块包装后再下发模型：
 *   原始输入 → 意图分类 → 合规校验 → 模板匹配 → 提示词封装 → 下发模型
 *
 * 禁止任何环节跳过此管线直接调用模型。
 */
import { classifyIntent } from './intentClassifier.js';
import { checkCompliance } from './adComplianceEngine.js';
import { matchAndFill, getModelHint } from './templateEngine.js';
import logger from '../utils/logger.js';

/**
 * 完整封装管线 — 单次调用完成全部中间层处理
 *
 * @param {string} rawInput    商家原始输入
 * @param {object} ctx         上下文
 * @param {string} ctx.userId
 * @param {string} ctx.platform   目标平台 (taobao|douyin|jd|kuaishou)
 * @param {string} ctx.industry   行业 (clothing|cosmetic|electronics|food|home)
 * @param {object} ctx.variables  模板变量 { productName, features, specs, ... }
 * @param {string} ctx.brandTone  品牌调性
 *
 * @returns {{
 *   blocked: boolean,
 *   blockReason?: string,
 *   intent: { intentId: string, category: string, label: string, confidence: number },
 *   compliance: { passed: boolean, violations: Array },
 *   wrapped: { system: string, prompt: string, intentId: string, category: string },
 *   modelHint: { type: string, provider: string },
 *   sanitizedInput: string
 * }}
 */
export async function wrapPrompt(rawInput, ctx = {}) {
  const result = {
    blocked: false,
    blockReason: null,
    intent: null,
    compliance: null,
    wrapped: null,
    modelHint: null,
    sanitizedInput: rawInput,
  };

  if (!rawInput || typeof rawInput !== 'string' || !rawInput.trim()) {
    result.blocked = true;
    result.blockReason = '输入内容不能为空';
    return result;
  }

  const trimmed = rawInput.trim();

  // ── Step 1: 意图识别 ──
  let intent;
  try {
    intent = await classifyIntent(trimmed, {
      userId: ctx.userId,
      platform: ctx.platform,
      historyTags: ctx.historyTags,
    });
    result.intent = {
      intentId: intent.intentId,
      category: intent.category,
      label: intent.label,
      confidence: intent.confidence,
    };
    logger.info('[PromptWrapper] intent classified', { intentId: intent.intentId, confidence: intent.confidence, source: intent.source });
  } catch (e) {
    logger.warn('[PromptWrapper] intent classification failed, fallback to copywriting', e.message);
    intent = { intentId: 'copywriting', category: 'text', label: '营销文案', confidence: 0.3, source: 'fallback' };
    result.intent = {
      intentId: intent.intentId,
      category: intent.category,
      label: intent.label,
      confidence: intent.confidence,
    };
  }

  // ── Step 2: 合规校验 ──
  try {
    const complianceResult = checkCompliance(trimmed, {
      platform: ctx.platform || 'taobao',
      industry: ctx.industry || null,
      strict: false,
    });
    result.compliance = {
      passed: complianceResult.passed,
      violations: complianceResult.violations,
    };

    if (!complianceResult.passed) {
      // 有 block 级别违规 → 拦截
      result.blocked = true;
      const blockers = complianceResult.violations.filter(v => v.action === 'block');
      result.blockReason = blockers.map(v =>
        `"${v.matched}" 违反${v.source}${v.category}规定`
      ).join('；');
      result.sanitizedInput = complianceResult.sanitizedText;
      logger.warn('[PromptWrapper] blocked by compliance', {
        intentId: intent.intentId,
        violations: blockers.map(v => v.matched),
      });
      return result;
    }

    // 有 warn 级别 → 使用脱敏文本继续
    if (complianceResult.violations.length > 0) {
      result.sanitizedInput = complianceResult.sanitizedText;
      logger.info('[PromptWrapper] compliance warnings', {
        warnings: complianceResult.violations.map(v => v.matched),
      });
    }
  } catch (e) {
    logger.error('[PromptWrapper] compliance check failed, blocking request', e.message);
    result.blocked = true;
    result.blockReason = '合规校验服务暂时不可用，请稍后重试';
    result.compliance = { passed: false, violations: [] };
    return result;
  }

  // ── Step 3: 模板匹配 + 变量填充 ──
  try {
    const wrapped = await matchAndFill(intent.intentId, {
      productName: ctx.variables?.productName || ctx.productName || '商品',
      ...(ctx.variables || {}),
    }, {
      industry: ctx.industry,
      platform: ctx.platform,
      brandTone: ctx.brandTone,
    });
    result.wrapped = wrapped;
    logger.info('[PromptWrapper] template matched', { intentId: intent.intentId, category: wrapped.category });
  } catch (e) {
    logger.warn('[PromptWrapper] template matching failed, using raw input', e.message);
    result.wrapped = {
      system: '你是专业的电商内容创作专家。',
      prompt: result.sanitizedInput,
      intentId: intent.intentId,
      category: intent.category,
    };
  }

  // ── Step 4: 模型推荐 ──
  result.modelHint = getModelHint(intent.intentId);

  return result;
}

/**
 * 快捷方法：仅做合规校验（用于敏感场景的二次确认）
 */
export async function quickComplianceCheck(text, opts = {}) {
  const { checkCompliance } = await import('./adComplianceEngine.js');
  return checkCompliance(text, opts);
}

export default { wrapPrompt, quickComplianceCheck };
