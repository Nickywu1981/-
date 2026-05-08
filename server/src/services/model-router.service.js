/**
 * Movio AI v4.1 — Model Router Service (模型调度中台)
 * G5 后端开发 | T-G5-008
 * 单一/混合/自定义三种调度模式 + 负载均衡 + 熔断器 + 超时重试降级
 */
import { CircuitBreaker } from '../utils/circuit-breaker.js';
import { aiCaller } from '../utils/ai-caller.js';

// 模型注册表——添加新模型只需在此注册 + 后台配置
const MODEL_REGISTRY = {
  seedance: { name: 'Seedance', category: 'video', endpoint: process.env.SEEDANCE_ENDPOINT, apiKey: process.env.SEEDANCE_API_KEY },
  tongyi_wanxiang: { name: '通义万象', category: 'image', endpoint: process.env.TONGYI_WANXIANG_ENDPOINT, apiKey: process.env.TONGYI_API_KEY },
  tongyi_qwen: { name: '千问', category: 'text', endpoint: process.env.QWEN_ENDPOINT, apiKey: process.env.QWEN_API_KEY },
  custom: { name: '自定义模型', category: 'custom', endpoint: '', apiKey: '' },
};

// 模型实例缓存 (含熔断器)
const modelInstances = {};
const TASK_MODEL_MAP = {
  video_gen: ['seedance'],
  image_gen: ['tongyi_wanxiang'],
  text_gen: ['tongyi_qwen'],
  action_migrate: ['seedance'],
  digital_human: ['seedance'],
  live_clip: ['seedance'],
};

function getModelInstance(modelKey) {
  if (!modelInstances[modelKey]) {
    const config = MODEL_REGISTRY[modelKey];
    if (!config) return null;
    modelInstances[modelKey] = {
      ...config,
      breaker: new CircuitBreaker({ failureThreshold: 5, cooldownMs: 60000 }),
    };
  }
  return modelInstances[modelKey];
}

/**
 * 单一模式: 指定某模型直接调用
 */
async function singleMode(modelKey, params) {
  const model = getModelInstance(modelKey);
  if (!model || !model.endpoint) throw { status: 400, message: `模型 ${modelKey} 不可用` };

  return aiCaller.call(model.endpoint, model.apiKey, params, {
    timeoutMs: 120000,
    maxRetries: 3,
    breaker: model.breaker,
    modelName: model.name,
  });
}

/**
 * 混合模式: 按 task_type 自动选择最优模型
 */
async function mixedMode(taskType, params) {
  const candidates = TASK_MODEL_MAP[taskType] || [];
  const healthy = candidates.filter(k => {
    const m = getModelInstance(k);
    return m && m.breaker.isAvailable();
  });

  if (healthy.length === 0) {
    throw { status: 503, message: '所有可用模型暂不可用，请稍后重试', degraded: true };
  }

  // 负载均衡: 选当前负载最低的
  const selected = healthy[0]; // MVP: 简单选取第一个可用; 后续按并发数选最少
  return singleMode(selected, params);
}

/**
 * 自定义模式: 从后台配置读取用户指定的模型列表
 */
async function customMode(customModels, taskType, params) {
  if (!customModels || customModels.length === 0) {
    // 降级到混合模式
    return mixedMode(taskType, params);
  }

  const healthy = customModels.filter(k => {
    const m = getModelInstance(k);
    return m && m.breaker.isAvailable();
  });

  if (healthy.length === 0) {
    return mixedMode(taskType, params); // 降级
  }

  return singleMode(healthy[0], params);
}

/**
 * 主调度入口
 */
export async function routeModel({ mode = 'mixed', taskType, modelKey, customModels, params }) {
  switch (mode) {
    case 'single':
      return singleMode(modelKey || 'tongyi_qwen', params);
    case 'mixed':
      return mixedMode(taskType, params);
    case 'custom':
      return customMode(customModels, taskType, params);
    default:
      return mixedMode(taskType, params);
  }
}

/**
 * 重置指定模型的熔断器为半开状态
 */
export function resetBreaker(modelKey) {
  const instance = getModelInstance(modelKey);
  if (!instance) throw { status: 404, message: `模型 ${modelKey} 不存在` };
  instance.breaker.state = 'half-open';
  instance.breaker.failureCount = 0;
  return { modelKey, newState: 'half-open', message: '熔断器已重置为半开状态，下次请求将试探恢复' };
}

/**
 * 获取模型运行状态
 */
export function getModelStatus() {
  const status = {};
  for (const [key, config] of Object.entries(MODEL_REGISTRY)) {
    const instance = getModelInstance(key);
    status[key] = {
      name: config.name,
      category: config.category,
      available: instance ? instance.breaker.isAvailable() : false,
      failedCount: instance ? instance.breaker.failureCount : 0,
      state: instance ? instance.breaker.getState() : 'unknown',
    };
  }
  return status;
}
