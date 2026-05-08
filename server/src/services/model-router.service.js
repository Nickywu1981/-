/**
 * Movio AI v4.2 — Model Router Service (模型调度中台)
 * DB驱动注册表 + 三种调度模式 + 负载均衡 + 熔断器 + 超时重试降级
 */
import { CircuitBreaker } from '../utils/circuit-breaker.js';
import { aiCaller } from '../utils/ai-caller.js';
import { BusinessError } from '../utils/businessError.js';
import * as modelConfigDao from '../dao/modelConfigDao.js';

const modelInstances = {};
const TASK_MODEL_MAP = {
  video_gen: ['seedance'],
  image_gen: ['tongyi_wanxiang'],
  text_gen: ['tongyi_qwen'],
  action_migrate: ['seedance'],
  digital_human: ['seedance'],
  live_clip: ['seedance'],
};

let registryCache = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60000;

async function loadRegistry() {
  if (registryCache && Date.now() < cacheExpiry) return registryCache;
  const rows = await modelConfigDao.listAll(true);
  registryCache = {};
  for (const r of rows) {
    registryCache[r.model_key] = {
      name: r.display_name,
      category: r.category,
      endpoint: r.endpoint,
      apiKey: r.api_key_enc,
      modelId: r.model_id,
      maxTokens: r.max_tokens,
      rateLimitRpm: r.rate_limit_rpm,
      concurrencyMax: r.concurrency_max,
      breakerThreshold: r.breaker_threshold,
      breakerCooldownS: r.breaker_cooldown_s,
      moderationEnabled: r.moderation_enabled,
      moderationAction: r.moderation_action,
      blockedWords: r.blocked_words,
      enabled: r.enabled,
    };
  }
  cacheExpiry = Date.now() + CACHE_TTL_MS;
  return registryCache;
}

export function invalidateCache() { registryCache = null; cacheExpiry = 0; }

function getModelInstance(modelKey, registry) {
  if (!modelInstances[modelKey]) {
    const config = registry[modelKey];
    if (!config || !config.enabled) return null;
    modelInstances[modelKey] = {
      ...config,
      breaker: new CircuitBreaker({
        failureThreshold: config.breakerThreshold || 5,
        cooldownMs: (config.breakerCooldownS || 60) * 1000,
      }),
    };
  }
  return modelInstances[modelKey];
}

async function singleMode(modelKey, params) {
  const registry = await loadRegistry();
  const model = getModelInstance(modelKey, registry);
  if (!model || !model.endpoint) throw new BusinessError(400, `模型 ${modelKey} 不可用`);

  const start = Date.now();
  let status = 'success', errorMsg = '';
  let tokensIn = 0, tokensOut = 0;
  try {
    const result = await aiCaller.call(model.endpoint, model.apiKey, params, {
      timeoutMs: 120000,
      maxRetries: 3,
      breaker: model.breaker,
      modelName: model.name,
    });
    tokensOut = result?.usage?.output_tokens || 0;
    tokensIn = result?.usage?.input_tokens || 0;
    return result;
  } catch (e) {
    status = 'error'; errorMsg = e.message;
    throw e;
  } finally {
    await modelConfigDao.incrementUsage(modelKey, {
      latencyMs: Date.now() - start,
      tokensIn, tokensOut,
      isError: status === 'error',
    });
  }
}

async function mixedMode(taskType, params) {
  const registry = await loadRegistry();
  const candidates = (TASK_MODEL_MAP[taskType] || [])
    .filter(k => { const m = getModelInstance(k, registry); return m && m.breaker.isAvailable(); });

  if (candidates.length === 0) {
    throw new BusinessError(503, '所有可用模型暂不可用，请稍后重试');
  }

  return singleMode(candidates[0], params);
}

async function customMode(customModels, taskType, params) {
  if (!customModels || customModels.length === 0) return mixedMode(taskType, params);

  const registry = await loadRegistry();
  const healthy = customModels.filter(k => {
    const m = getModelInstance(k, registry);
    return m && m.breaker.isAvailable();
  });

  if (healthy.length === 0) return mixedMode(taskType, params);
  return singleMode(healthy[0], params);
}

export async function routeModel({ mode = 'mixed', taskType, modelKey, customModels, params }) {
  switch (mode) {
    case 'single': return singleMode(modelKey || 'tongyi_qwen', params);
    case 'mixed': return mixedMode(taskType, params);
    case 'custom': return customMode(customModels, taskType, params);
    default: return mixedMode(taskType, params);
  }
}

export function resetBreaker(modelKey) {
  const instance = modelInstances[modelKey];
  if (!instance) throw new BusinessError(404, `模型 ${modelKey} 不存在`);
  instance.breaker.state = 'half-open';
  instance.breaker.failureCount = 0;
  return { modelKey, newState: 'half-open', message: '熔断器已重置为半开状态' };
}

export async function getModelStatus() {
  const registry = await loadRegistry();
  const status = {};
  for (const [key, config] of Object.entries(registry)) {
    const instance = getModelInstance(key, registry);
    status[key] = {
      name: config.name,
      category: config.category,
      enabled: config.enabled,
      available: instance ? instance.breaker.isAvailable() : false,
      failedCount: instance ? instance.breaker.failureCount : 0,
      state: instance ? instance.breaker.getState() : 'disabled',
    };
  }
  return status;
}
