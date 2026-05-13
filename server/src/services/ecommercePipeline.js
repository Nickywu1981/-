/**
 * E-Commerce AI 统一中间处理管道
 *
 * 强制规则：所有商家请求必须经过此管道，禁止裸调底层模型
 *
 * 四大链路（统一入口 → 自动分流）：
 *   图片链:    意图识别→合规校验→模板匹配→提示词封装→网关预检→多模型调度→后处理
 *   详情页链:  意图识别→合规校验→模板匹配→提示词封装→网关预检→多模型调度→后处理
 *   视频链:    意图识别→合规校验→模板匹配→提示词封装→网关预检→多模型调度→后处理
 *   文案语音链:意图识别→合规校验→模板匹配→提示词封装→网关预检→多模型调度→后处理
 */
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';
import { classifyIntent } from './intentClassifier.js';
import { checkCompliance, isBlocked } from './adComplianceEngine.js';
import { getTemplate, fillTemplate } from './prompts/ecommerceTemplates.js';
import {
  gatewayInfer,
  gatewayDispatch,
  gatewayRoute,
} from '../gateway/aiGatewayHub.js';

// ==================== 管道主入口 ====================

/**
 * 商家请求统一处理 — 唯一入口，禁止绕过
 *
 * @param {object} req
 * @param {string} req.userInput      用户原始输入（必填）
 * @param {string} [req.productName]  商品名称
 * @param {string} [req.productFeatures] 商品特征
 * @param {string} [req.sellingPoints] 卖点
 * @param {string} [req.specs]        规格参数
 * @param {string} [req.platform]     目标平台
 * @param {string} [req.industry]     行业 (clothing|beauty|3c_digital|food|home)
 * @param {string} [req.language]     语言
 * @param {string} [req.tone]         风格
 * @param {object} [req.extra]        额外模板变量
 * @param {object} [req.ctx]          上下文 { userId, tenantId }
 * @returns {object} { intent, compliance, wrappedPrompt, result, meta }
 */
export async function processMerchantRequest(req = {}) {
  const { userInput, productName, platform = '通用', industry, language, ctx } = req;
  const pipelineStart = Date.now();
  const pipelineLog = { steps: [] };

  if (!userInput || !userInput.trim()) {
    throw new BusinessError(400, '请输入需求描述');
  }

  // ──────── Step 1: 意图识别 ────────
  logger.info('[Pipeline] Step 1: Classifying intent', { input: userInput.slice(0, 80) });
  const intent = await classifyIntent(userInput, {
    userId: ctx?.userId,
    platform,
  });
  pipelineLog.steps.push({ step: 'intent', result: intent.intentId, ms: Date.now() - pipelineStart });

  // ──────── Step 2: 合规校验 ────────
  logger.info('[Pipeline] Step 2: Compliance check');
  const complianceInput = [userInput, productName, req.sellingPoints, req.productFeatures]
    .filter(Boolean).join(' ');
  const compliance = checkCompliance(complianceInput, { platform, industry });

  if (!compliance.passed) {
    const blockers = compliance.violations.filter(v => v.action === 'block');
    logger.warn('[Pipeline] Compliance blocked', {
      violations: blockers.map(v => v.matched),
      intent: intent.intentId,
    });
    const err = new BusinessError(422, '内容合规校验未通过');
    err.compliance = { violations: compliance.violations, sanitizedText: compliance.sanitizedText };
    throw err;
  }
  pipelineLog.steps.push({ step: 'compliance', passed: true, warnings: compliance.violations.length, ms: Date.now() - pipelineStart });

  // ──────── Step 3: 模板匹配 ────────
  logger.info('[Pipeline] Step 3: Template matching', { intentId: intent.intentId, industry });
  const templatePack = getTemplate(intent.intentId, industry);

  if (!templatePack) {
    logger.error('[Pipeline] No template found', { intentId: intent.intentId });
    throw new BusinessError(500, `未找到匹配的提示词模板 (intent: ${intent.intentId})`);
  }
  pipelineLog.steps.push({ step: 'template', key: templatePack.templateKey, category: templatePack.category, ms: Date.now() - pipelineStart });

  // ──────── Step 4: 提示词封装 ────────
  logger.info('[Pipeline] Step 4: Wrapping prompt');
  const templateVars = {
    productName: productName || '未指定商品',
    productFeatures: req.productFeatures || '',
    sellingPoints: req.sellingPoints || '',
    specs: req.specs || '',
    platform,
    language: language || 'zh-CN',
    tone: req.tone || 'professional',
    ...(req.extra || {}),
  };

  const wrapped = fillTemplate(templatePack.template, templateVars);
  pipelineLog.steps.push({ step: 'wrap', promptLength: wrapped.systemPrompt.length, ms: Date.now() - pipelineStart });

  // ──────── Step 5: 网关预检 + 模型调度 ────────
  logger.info('[Pipeline] Step 5: Gateway dispatch', {
    category: templatePack.category,
    intentId: intent.intentId,
  });

  const dispatchReq = {
    mode: 'auto',
    taskType: _mapCategoryToTaskType(templatePack.category),
    params: {
      messages: [
        { role: 'system', content: wrapped.systemPrompt },
        { role: 'user', content: userInput },
      ],
      temperature: 0.7,
    },
    fallback: true,
  };

  let result;
  try {
    result = await gatewayDispatch(dispatchReq, {
      ...ctx,
      taskType: dispatchReq.taskType,
      source: 'ecommerce_pipeline',
    });
  } catch (err) {
    logger.error('[Pipeline] Gateway dispatch failed', err.message);
    throw new BusinessError(502, `模型调度失败: ${err.message}`);
  }
  pipelineLog.steps.push({ step: 'dispatch', model: result?.model, ms: Date.now() - pipelineStart });

  // ──────── Step 6: 输出后处理 ────────
  // (已由 gatewayHub post-invoke 完成: 输出审核 + postProcessOutput + buildErrorResponse)
  pipelineLog.steps.push({ step: 'postprocess', ms: Date.now() - pipelineStart, totalMs: Date.now() - pipelineStart });

  logger.info('[Pipeline] Complete', {
    intentId: intent.intentId,
    category: templatePack.category,
    totalMs: Date.now() - pipelineStart,
    model: result?.model,
  });

  return {
    intent: { id: intent.intentId, category: intent.category, label: intent.label, confidence: intent.confidence },
    compliance: { passed: true, warnings: compliance.violations.length },
    template: { category: templatePack.category, key: templatePack.templateKey },
    wrappedPrompt: wrapped.systemPrompt,
    result,
    meta: { pipelineMs: Date.now() - pipelineStart, steps: pipelineLog.steps },
  };
}

// ==================== 辅助 ====================

function _mapCategoryToTaskType(category) {
  const map = {
    image:  'image_gen',
    detail: 'text_gen',
    video:  'video_gen',
    text:   'text_gen',
  };
  return map[category] || 'text_gen';
}

export default { processMerchantRequest };
