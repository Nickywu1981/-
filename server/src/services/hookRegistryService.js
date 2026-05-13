/**
 * Hook/Plugin 注册中心 — Hook Registry
 *
 * 功能：
 * - Pre-invoke / Post-invoke 钩子链（类 Koa 洋葱模型）
 * - 动态注册/移除钩子，支持优先级排序
 * - 钩子错误隔离（单钩子失败不影响后续钩子）
 *
 * 使用方式：
 *   import { registerHook, runPreHooks, runPostHooks } from './hookRegistryService.js';
 *   registerHook('pre', 'quota-check', quotaCheckFn, 100);
 */
import logger from '../utils/logger.js';
import { securityConfig } from '../config/index.js';

// ==================== 钩子存储 ====================

const hooks = {
  pre: [],   // pre-invoke hooks: [{ name, fn, priority, enabled }]
  post: [],  // post-invoke hooks
  custom: new Map(), // custom lifecycle hooks
};

// ==================== 钩子管理 ====================

/**
 * 注册钩子
 * @param {'pre'|'post'|string} phase - 生命周期阶段
 * @param {string} name - 钩子名称（唯一标识）
 * @param {Function} fn - 钩子函数 (context) => { blocked?, reason?, modified? } | void
 * @param {number} [priority=500] - 优先级（越小越先执行）
 */
export function registerHook(phase, name, fn, priority = 500) {
  if (!hooks[phase]) {
    hooks.custom.set(`${phase}:${name}`, { name, fn, priority, phase });
    return;
  }

  const existing = hooks[phase].find(h => h.name === name);
  if (existing) {
    existing.fn = fn;
    existing.priority = priority;
    existing.enabled = true;
    logger.info(`[HookRegistry] 已更新钩子: ${phase}/${name}`);
    return;
  }

  hooks[phase].push({ name, fn, priority, enabled: true });
  hooks[phase].sort((a, b) => a.priority - b.priority);
  logger.info(`[HookRegistry] 已注册钩子: ${phase}/${name} (priority=${priority})`);
}

/**
 * 移除钩子
 */
export function removeHook(phase, name) {
  if (!hooks[phase]) return false;
  const idx = hooks[phase].findIndex(h => h.name === name);
  if (idx >= 0) {
    hooks[phase].splice(idx, 1);
    logger.info(`[HookRegistry] 已移除钩子: ${phase}/${name}`);
    return true;
  }
  return false;
}

/**
 * 禁用/启用钩子
 */
export function toggleHook(phase, name, enabled) {
  const list = hooks[phase];
  if (!list) return false;
  const h = list.find(hook => hook.name === name);
  if (h) {
    h.enabled = enabled;
    logger.info(`[HookRegistry] 钩子 ${phase}/${name}: ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }
  return false;
}

/**
 * 列出所有注册的钩子
 */
export function listHooks(phase = null) {
  if (phase) return hooks[phase]?.filter(h => h.enabled) || [];
  return {
    pre: hooks.pre.filter(h => h.enabled),
    post: hooks.post.filter(h => h.enabled),
    custom: Array.from(hooks.custom.values()),
  };
}

// ==================== 钩子执行 ====================

/**
 * 运行 Pre-invoke 钩子链
 * 任一钩子返回 { blocked: true, reason } 则中断
 *
 * @param {object} context - { modelId, userId, input, taskType, source, ... }
 * @returns {{ blocked: boolean, reason?: string, modifiedContext: object }}
 */
export async function runPreHooks(context) {
  const modifiedCtx = { ...context };

  for (const hook of hooks.pre) {
    if (!hook.enabled) continue;
    try {
      const result = await hook.fn(modifiedCtx);
      if (result?.blocked) {
        logger.warn(`[HookRegistry] Pre-hook "${hook.name}" 阻止请求: ${result.reason}`);
        return { blocked: true, reason: result.reason, hookName: hook.name, modifiedContext: modifiedCtx };
      }
      if (result?.modified) {
        Object.assign(modifiedCtx, result.modified);
      }
    } catch (e) {
      logger.warn(`[HookRegistry] Pre-hook "${hook.name}" 执行异常: ${e.message}`);
      // 钩子错误不阻塞流程（配置策略可改）
      if (hook.failBlock !== false) continue;
      return { blocked: true, reason: `Hook "${hook.name}" failed: ${e.message}`, hookName: hook.name, modifiedContext: modifiedCtx };
    }
  }

  return { blocked: false, modifiedContext: modifiedCtx };
}

/**
 * 运行 Post-invoke 钩子链
 * 所有钩子按优先级依次执行，不会中断
 *
 * @param {object} context - { modelId, userId, result, tokensIn, tokensOut, cost, status, ... }
 * @returns {object} 合并后的 context（可能被钩子修改）
 */
export async function runPostHooks(context) {
  let modifiedCtx = { ...context };

  for (const hook of hooks.post) {
    if (!hook.enabled) continue;
    try {
      const result = await hook.fn(modifiedCtx);
      if (result?.modified) {
        Object.assign(modifiedCtx, result.modified);
      }
    } catch (e) {
      logger.warn(`[HookRegistry] Post-hook "${hook.name}" 执行异常: ${e.message}`);
    }
  }

  return modifiedCtx;
}

// ==================== 内置钩子注册 ====================

/**
 * 注册默认内置钩子（在 Gateway 初始化时调用）
 */
export function registerBuiltinHooks() {
  // Pre-invoke: GEO 规则检查（priority=100, 最早）
  registerHook('pre', 'geo-check', async (ctx) => {
    if (!ctx.countryCode) return { blocked: false };

    try {
      const { evaluateRules } = await import('./geoRulesService.js');
      const geoConstraints = await evaluateRules(ctx.countryCode, ctx.platformCode || ctx.taskType);
      ctx._geoConstraints = geoConstraints;
      if (geoConstraints?.blockedModels?.includes(ctx.modelId)) {
        return { blocked: true, reason: `Model ${ctx.modelId} is not available in your region` };
      }
    } catch (e) {
      logger.warn(`[Hook:geo] GEO evaluation failed: ${e.message}`);
    }
    return { blocked: false };
  }, 100);

  // Pre-invoke: PII 脱敏（priority=200）
  registerHook('pre', 'pii-sanitize', async (ctx) => {
    const sanitizeEnabled = securityConfig.sanitizeInput;
    if (!sanitizeEnabled || !ctx.input) return { blocked: false };

    try {
      const { sanitizePII, sanitizeObject } = await import('./inputSanitizerService.js');
      if (typeof ctx.input === 'string') {
        const { sanitized, maskedCount } = sanitizePII(ctx.input);
        if (maskedCount > 0) {
          return { modified: { input: sanitized, _piiMaskedCount: maskedCount } };
        }
      } else if (typeof ctx.input === 'object') {
        return { modified: { input: sanitizeObject(ctx.input) } };
      }
    } catch (e) {
      logger.warn(`[Hook:pii] PII sanitization failed: ${e.message}`);
    }
    return { blocked: false };
  }, 200);

  // Pre-invoke: 内容审核（priority=300）
  registerHook('pre', 'content-moderation', async (ctx) => {
    const moderationEnabled = securityConfig.selfBuiltWordlistEnabled;
    if (!moderationEnabled || !ctx.userId) return { blocked: false };

    try {
      const { moderateText } = await import('./moderation.service.js');
      const textToCheck = typeof ctx.input === 'string' ? ctx.input : JSON.stringify(ctx.input);
      const result = await moderateText(textToCheck, ctx.userId, { stage: 'input' });
      ctx._moderationResult = result;
      if (result.action === 'block') {
        return { blocked: true, reason: '内容包含违规信息' };
      }
    } catch (e) {
      logger.warn(`[Hook:moderation] Content moderation failed: ${e.message}`);
    }
    return { blocked: false };
  }, 300);

  // Pre-invoke: 模型权限检查（priority=400）
  registerHook('pre', 'model-acl', async (ctx) => {
    const aclEnabled = securityConfig.modelAclEnabled;
    if (!aclEnabled) return { blocked: false };

    try {
      const { checkModelAccess } = await import('./modelAccessControlService.js');
      const result = checkModelAccess({ id: ctx.userId, role: ctx._userRole }, ctx.modelId, ctx.taskType);
      if (!result.allowed) {
        return { blocked: true, reason: result.reason };
      }
    } catch (e) {
      logger.warn(`[Hook:acl] Model ACL failed: ${e.message}`);
    }
    return { blocked: false };
  }, 400);

  // Post-invoke: Token 泄漏检测（priority=500）
  registerHook('post', 'token-leak-check', async (ctx) => {
    const enabled = securityConfig.tokenLeakProtection;
    if (!enabled || !ctx.userId) return {};

    try {
      const { comprehensiveCheck } = await import('./tokenLeakProtectionService.js');
      const result = comprehensiveCheck(ctx.userId, ctx._ip, ctx.tokensIn + ctx.tokensOut);
      if (result.suspicious) {
        logger.warn(`[Hook:token-leak] Suspicious: ${result.reasons.join(', ')}`);
      }
    } catch (e) {
      logger.warn(`[Hook:token-leak] Check failed: ${e.message}`);
    }
    return {};
  }, 500);

  logger.info('[HookRegistry] 内置钩子已注册 (geo/pii/moderation/acl/token-leak)');
}

export default { registerHook, removeHook, toggleHook, listHooks, runPreHooks, runPostHooks, registerBuiltinHooks };
