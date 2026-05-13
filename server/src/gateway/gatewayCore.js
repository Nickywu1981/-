/**
 * AI Gateway 共享基础设施
 *
 * 所有网关路径 (infer/dispatch/route) 共用的:
 *  - 上下文标准化 + 熔断器 + 超时
 *  - 电商业务中间层管线 (意图→合规→模板→封装)
 *  - Pre-invoke 安全检测管道 (GEO→PII→审核)
 */
import logger from '../utils/logger.js';
import { CircuitBreaker } from '../utils/circuit-breaker.js';
import { sanitizePII, sanitizeObject } from '../services/inputSanitizerService.js';
import { moderateText } from '../services/moderation.service.js';
import { wrapPrompt } from '../services/promptWrapper.js';
import { blockDirectVideoGeneration } from '../services/pipelineOrchestrator.js';
import { aiGatewayConfig, securityConfig, ecommercePipelineConfig } from '../config/index.js';

// ==================== 上下文标准化 ====================

export function normalizeContext(ctx) {
  return {
    userId: ctx?.userId || null,
    tenantId: ctx?.tenantId || null,
    taskType: ctx?.taskType || 'unknown',
    source: ctx?.source || 'consumer',
    correlationId: ctx?.correlationId || _genCorrelationId(),
  };
}

function _genCorrelationId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ==================== 熔断器 + 超时 ====================

const modelBreakers = new Map();
export { modelBreakers };
const BREAKER_CONFIG = {
  enabled: aiGatewayConfig.circuitBreaker.enabled,
  failureThreshold: aiGatewayConfig.circuitBreaker.failureCount,
  cooldownMs: aiGatewayConfig.circuitBreaker.cooldownMs,
  useErrorRate: true,
  errorRateThreshold: aiGatewayConfig.circuitBreaker.errorRate,
  windowDuration: aiGatewayConfig.circuitBreaker.windowMs,
};

export const SINGLE_REQUEST_TIMEOUT = aiGatewayConfig.singleRequestTimeoutMs;
export const TOTAL_TIMEOUT = aiGatewayConfig.totalTimeoutMs;
export const STREAMING_TIMEOUT = aiGatewayConfig.streamingTimeoutMs;

export function getModelBreaker(modelId) {
  if (!BREAKER_CONFIG.enabled) return null;
  if (!modelBreakers.has(modelId)) {
    modelBreakers.set(modelId, new CircuitBreaker(BREAKER_CONFIG));
  }
  return modelBreakers.get(modelId);
}

/** 清理已移出池的模型的断路器实例 */
export function cleanStaleBreakers(activeModelIds) {
  const activeSet = new Set(activeModelIds);
  for (const id of modelBreakers.keys()) {
    if (!activeSet.has(id)) modelBreakers.delete(id);
  }
}

export function timeoutPromise(ms, label) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${label} 超时 (${ms}ms)`)), ms),
  );
}

// ==================== Step 0: 业务管线 (强制) ====================

/**
 * 电商业务中间层管线 — 所有商家请求必经之路
 * 意图识别 → 合规校验 → 模板匹配 → 提示词封装
 *
 * 禁止跳过此步骤直接调用模型。
 *
 * @returns {{ blocked: boolean, blockReason?: string, wrapResult: object }}
 */
export async function runBusinessPipeline(input, ctx = {}) {
  // 仅对商家请求执行业务管线（source=consumer 或未指定）
  if (ctx.source === 'admin' || ctx.skipBusinessPipeline) {
    return { blocked: false, wrapResult: null };
  }

  try {
    const wrapResult = await wrapPrompt(
      typeof input === 'string' ? input : (input?.prompt || input?.text || ''),
      {
        userId: ctx.userId,
        platform: ctx.platform || ctx.platformCode || 'taobao',
        industry: ctx.industry || null,
        brandTone: ctx.brandTone || null,
        variables: ctx.variables || {},
        historyTags: ctx.historyTags || null,
      },
    );

    if (wrapResult.blocked) {
      return {
        blocked: true,
        blockReason: wrapResult.blockReason || '内容不符合平台合规要求',
        wrapResult,
      };
    }

    // 视频直生成阻断：无分镜表则拒绝
    const intentId = wrapResult.intent?.intentId;
    if (intentId) {
      const videoBlock = blockDirectVideoGeneration(intentId, ctx);
      if (videoBlock.blocked) {
        return { blocked: true, blockReason: videoBlock.reason, wrapResult };
      }
    }

    return { blocked: false, wrapResult };
  } catch (e) {
    logger.warn('[Gateway] Business pipeline crashed, allowing raw prompt through — this bypasses template wrapping', { error: e.message, stack: e.stack?.substring(0, 300) });
    return { blocked: false, wrapResult: null, pipelineCrashed: true };
  }
}

// ==================== Pre-invoke 安全检测 ====================

/**
 * 统一 pre-invoke 安全检查管线
 * GEO 规则 → PII 脱敏 → 内容安全审核
 * @returns {{ blocked: boolean, blockReason?: string, sanitizedInput: any, geoConstraints: object|null, moderationResult: object|null }}
 */
export async function runPreInvokeSecurityChecks(modelId, input, context) {
  const result = {
    blocked: false,
    blockReason: null,
    sanitizedInput: input,
    geoConstraints: null,
    moderationResult: null,
  };

  // 0. 强制封装管道检查 — 禁止商家裸调底层模型
  if (ecommercePipelineConfig.forceWrap) {
    const allowedSources = ['ecommerce_pipeline', 'admin', 'internal', 'system', 'migration', 'test'];
    const source = context?.source || context?.taskType || '';
    if (!allowedSources.includes(source)) {
      result.blocked = true;
      result.blockReason = '裸调用已关闭。请通过 /api/ecommerce/generate 统一入口提交请求，系统将自动完成意图识别、合规校验、模板封装后下发模型。';
      return result;
    }
  }

  // 1. GEO 规则检查
  const countryCode = context.countryCode || context.geo?.country || null;
  const platformCode = context.platformCode || context.taskType || null;
  if (countryCode) {
    try {
      const { evaluateRules } = await import('../services/geoRulesService.js');
      const geoConstraints = await evaluateRules(countryCode, platformCode);
      result.geoConstraints = geoConstraints;
      if (geoConstraints?.blockedModels?.includes(modelId)) {
        result.blocked = true;
        result.blockReason = `Model ${modelId} is not available in your region`;
        return result;
      }
    } catch (e) {
      logger.warn(`[Gateway] GEO evaluation failed: ${e.message}`);
    }
  }

  // 2. PII 敏感信息脱敏
  if (securityConfig.sanitizeInput) {
    try {
      if (typeof input === 'string') {
        const { sanitized, maskedCount } = sanitizePII(input);
        if (maskedCount > 0) {
          result.sanitizedInput = sanitized;
          logger.info(`[Gateway] PII 脱敏: ${maskedCount} 处 (user=${context.userId})`);
        }
      } else if (typeof input === 'object' && input !== null) {
        result.sanitizedInput = sanitizeObject(input);
      }
    } catch (e) {
      logger.warn(`[Gateway] PII sanitization failed: ${e.message}`);
    }
  }

  // 3. 内容安全审核（敏感词/违禁词检测）
  if (securityConfig.selfBuiltWordlistEnabled && context.userId) {
    try {
      const textToCheck = typeof input === 'string' ? input : JSON.stringify(input);
      const modResult = await moderateText(textToCheck, context.userId, { stage: 'input' });
      result.moderationResult = modResult;
      if (modResult.action === 'block') {
        result.blocked = true;
        result.blockReason = '内容包含违规信息，请修改后重试';
        return result;
      }
    } catch (e) {
      logger.warn(`[Gateway] Content moderation failed: ${e.message}`);
    }
  }

  return result;
}
