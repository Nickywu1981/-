/**
 * Platform — AI 模型网关
 *
 * 四层架构 - 中台层 - AI模型网关
 * 职责: 统一模型注册/调度/熔断/降级/多模态路由
 *
 * 封装 aiEngine + modelDispatcher + model-router.service 的统一入口。
 * 下游模块保持独立，此处提供面向业务的统一抽象层。
 */

// ==================== 模型调度模式 ====================

export const DISPATCH_MODES = {
  AUTO: 'auto',       // 自动选择最优模型
  CUSTOM: 'custom',   // 指定模型
  SINGLE: 'single',   // 单模型直调
};

// ==================== 模型类别 ====================

export const MODEL_CATEGORIES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
};

// ==================== 统一模型调用 ====================

/**
 * 统一 AI 模型调用入口
 * @param {Object} opts
 * @param {string} opts.taskType - 任务类型 (image_gen / video_gen / text_gen / tts / ...)
 * @param {Object} opts.params - 任务参数
 * @param {string} [opts.mode='auto'] - 调度模式
 * @param {string} [opts.modelKey] - 指定模型(仅 custom/single 模式)
 * @param {number} [opts.priority] - 优先级 1-10
 * @returns {Promise<Object>} 生成结果
 */
export async function dispatchModelCall({ taskType, params, mode = 'auto', modelKey, priority = 5 }) {
  const [{ callModel }, { dispatchJob }] = await Promise.all([
    import('../services/aiEngine.js'),
    import('../services/modelDispatcher.js'),
  ]);

  if (mode === 'single' && modelKey) {
    return callModel(modelKey, params);
  }

  // auto / custom 模式走调度器
  return dispatchJob({ taskType, params, mode, modelKey, priority });
}

/**
 * 获取所有可用模型列表
 * @returns {Array<{id: string, name: string, category: string, status: string}>}
 */
export async function listAvailableModels() {
  const { listModels } = await import('../services/aiEngine.js');
  return listModels().map(m => ({
    id: m.id,
    name: m.name,
    category: m.category,
    status: m.health ? (await m.health()).status : 'unknown',
  }));
}

/**
 * 获取模型熔断状态
 * @returns {Promise<Object>}
 */
export async function getCircuitBreakerStatus() {
  try {
    const { getCircuitStatus } = await import('../services/model-router.service.js');
    return getCircuitStatus();
  } catch {
    return { status: 'unavailable' };
  }
}

/**
 * 重置模型熔断器
 * @param {string} modelKey
 */
export async function resetCircuitBreaker(modelKey) {
  const { resetCircuit } = await import('../services/model-router.service.js');
  return resetCircuit(modelKey);
}
