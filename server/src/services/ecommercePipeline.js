/**
 * E-Commerce AI 统一中间处理管道
 *
 * 强制规则：所有商家请求必须经过此管道，禁止裸调底层模型
 *
 * 四大链路（统一入口 → 自动分流）：
 *   图片链:    GEO守卫→意图识别→合规校验→模板匹配→提示词封装→记忆注入→网关调度→后处理→记忆归档
 *   详情页链:  GEO守卫→意图识别→合规校验→模板匹配→提示词封装→记忆注入→网关调度→后处理→记忆归档
 *   视频链:    GEO守卫→意图识别→合规校验→模板匹配→提示词封装→记忆注入→网关调度→后处理→记忆归档
 *   文案语音链:GEO守卫→意图识别→合规校验→模板匹配→提示词封装→记忆注入→网关调度→后处理→记忆归档
 *
 * 核心封装委托给 promptWrapper.js（意图/合规/模板三步合一），
 * 本管道负责 GEO + 记忆 + 调度 + 归档等全事务编排。
 */
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';
import { wrapPrompt } from './promptWrapper.js';
import { geoGuard } from './geoGuardService.js';
import { buildMemoryInjection, rememberConversation } from './ltmEnhancer.js';
import { gatewayDispatch } from '../gateway/aiGatewayHub.js';

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
 * @param {string} [req.ip]           客户端 IP（用于 GEO 地域守卫）
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

  // ── Step 0: GEO 地域守卫 (P2) ──
  if (req.ip) {
    try {
      const guardResult = await geoGuard(req.ip, null, platform);
      if (guardResult.blocked) throw new BusinessError(451, guardResult.blockReason);
      pipelineLog.steps.push({ step: 'geo', country: guardResult.geo?.countryCode, ms: Date.now() - pipelineStart });
    } catch (err) {
      if (err instanceof BusinessError) throw err;
      logger.warn('[Pipeline] GEO guard skipped', err.message);
    }
  }

  // ── Steps 1-4: 提示词统一封装（promptWrapper: 意图+合规+模板+封装 四合一） ──
  const wrapResult = await wrapPrompt(userInput, {
    userId: ctx?.userId,
    platform,
    industry,
    brandTone: req.tone || null,
    variables: {
      productName: productName || '未指定商品',
      productFeatures: req.productFeatures || '',
      sellingPoints: req.sellingPoints || '',
      specs: req.specs || '',
      language: language || 'zh-CN',
      platform,
      ...(req.extra || {}),
    },
    historyTags: null,
  });

  if (wrapResult.blocked) {
    const err = new BusinessError(422, wrapResult.blockReason || '内容不合规');
    err.compliance = wrapResult.compliance;
    throw err;
  }

  pipelineLog.steps.push(
    { step: 'intent', result: wrapResult.intent?.intentId, ms: Date.now() - pipelineStart },
    { step: 'compliance', passed: wrapResult.compliance?.passed, warnings: wrapResult.compliance?.violations?.length || 0, ms: Date.now() - pipelineStart },
    { step: 'wrap', ms: Date.now() - pipelineStart },
  );

  const intent = wrapResult.intent;
  const wrapped = wrapResult.wrapped;
  const modelHint = wrapResult.modelHint;

  // ── Step 4.5: 长记忆智能注入 (P2) ──
  if (ctx?.userId && wrapped) {
    try {
      const memoryInjected = await buildMemoryInjection({
        userId: ctx.userId,
        maxTokens: 500,
        contextHint: `${intent?.label || ''} | ${productName || ''} | ${platform}`,
      });
      if (memoryInjected) {
        wrapped.system = memoryInjected + '\n\n' + wrapped.system;
        pipelineLog.steps.push({ step: 'memory', injected: true, ms: Date.now() - pipelineStart });
      }
    } catch (err) {
      logger.warn('[Pipeline] Memory injection skipped', err.message);
    }
  }

  // ── Step 5: 网关调度 ──
  logger.info('[Pipeline] Step 5: Gateway dispatch', { intentId: intent?.intentId, category: modelHint?.type });
  const dispatchReq = {
    mode: 'auto',
    taskType: _modelHintToTaskType(modelHint),
    params: {
      messages: [
        { role: 'system', content: wrapped?.system || '' },
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
      skipBusinessPipeline: true,
    });
  } catch (err) {
    logger.error('[Pipeline] Gateway dispatch failed', err.message);
    throw new BusinessError(502, `模型调度失败: ${err.message}`);
  }
  pipelineLog.steps.push({ step: 'dispatch', model: result?.model, ms: Date.now() - pipelineStart });
  pipelineLog.steps.push({ step: 'postprocess', totalMs: Date.now() - pipelineStart });

  // ── Step 7: 记忆归档 (P2) ──
  if (ctx?.userId) {
    rememberConversation({
      userId: ctx.userId,
      productName,
      platform,
      style: req.tone,
      keyDecisions: [`通过${intent?.label || '电商'}管道生成了内容`],
    }).catch(err => logger.warn('[Pipeline] Remember failed', err.message));
  }

  logger.info('[Pipeline] Complete', {
    intentId: intent?.intentId,
    category: modelHint?.type,
    totalMs: Date.now() - pipelineStart,
    model: result?.model,
  });

  return {
    intent: { id: intent?.intentId, category: intent?.category, label: intent?.label, confidence: intent?.confidence },
    compliance: { passed: true, warnings: wrapResult.compliance?.violations?.length || 0 },
    template: { category: modelHint?.type },
    wrappedPrompt: wrapped?.system || '',
    result,
    meta: { pipelineMs: Date.now() - pipelineStart, steps: pipelineLog.steps },
  };
}

function _modelHintToTaskType(hint) {
  const map = {
    image: 'image_gen',
    video: 'video_gen',
    text: 'text_gen',
    multi_modal: 'text_gen',
    voice: 'tts',
  };
  return map[hint?.type] || 'text_gen';
}

export default { processMerchantRequest };
