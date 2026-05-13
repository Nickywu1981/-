/**
 * Movio AI v4.1 — Internal Test Workbench Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import logger from '../utils/logger.js';
import { isProduction } from '../config/index.js';
import * as modelRouter from '../services/model-router.service.js';

function _safeMsg(err) {
  if (!err) return '模型执行失败';
  if (isProduction) return '模型执行失败';
  return String(err.message || err).slice(0, 200);
}
import { gatewayRoute } from '../gateway/aiGatewayHub.js';

const testHistory = [];
const MAX_HISTORY = 200;

function _addHistory(entry) {
  testHistory.unshift(entry);
  if (testHistory.length > MAX_HISTORY) testHistory.length = MAX_HISTORY;
}

const CATEGORY_LABELS = { text: '文本', image: '图片', video: '视频' };

const MODEL_REGISTRY_CACHE = {
  tongyi_qwen:    { name: '千问 (Qwen)',       category: 'text',  key: 'tongyi_qwen' },
  deepseek:       { name: 'DeepSeek',           category: 'text',  key: 'deepseek' },
  tongyi_wanxiang:{ name: '通义万象',           category: 'image', key: 'tongyi_wanxiang' },
  seedance:       { name: 'Seedance',           category: 'video', key: 'seedance' },
};

export const getModels = wrapController(async (_req, res) => {
  const status = await modelRouter.getModelStatus();
  const categorized = { text: [], image: [], video: [] };

  for (const [key, cfg] of Object.entries(MODEL_REGISTRY_CACHE)) {
    const st = status[key] || { available: false, state: 'unknown', failedCount: 0 };
    categorized[cfg.category].push({
      key,
      name: cfg.name,
      category: cfg.category,
      state: st.state,
      available: st.available,
      failedCount: st.failedCount || 0,
    });
  }

  return success(res, { models: categorized, categories: CATEGORY_LABELS });
});

export const testSingle = wrapController(async (req, res) => {
  const { model_key, prompt, category, params } = req.validated;
  const start = Date.now();

  try {
    const result = await gatewayRoute({
      mode: 'single',
      modelKey: model_key,
      taskType: category + '_gen',
      params: { prompt, ...params },
    });

    const entry = {
      id: 'test_' + Date.now(),
      type: 'single',
      model_key,
      category,
      prompt,
      duration_ms: Date.now() - start,
      result,
      created_at: new Date().toISOString(),
    };
    _addHistory(entry);
    return success(res, entry);
  } catch (err) {
    logger.warn('[TestWorkbench] 单模型测试失败', { model_key, error: err.message });
    const entry = {
      id: 'test_' + Date.now(),
      type: 'single',
      model_key,
      category,
      prompt,
      duration_ms: Date.now() - start,
      error: _safeMsg(err),
      created_at: new Date().toISOString(),
    };
    _addHistory(entry);
    throw err;
  }
});

export const testMixed = wrapController(async (req, res) => {
  const { task_type, prompt, category, params } = req.validated;
  const start = Date.now();

  try {
    const result = await gatewayRoute({
      mode: 'mixed',
      taskType: task_type,
      params: { prompt, ...params },
    });

    const entry = {
      id: 'test_' + Date.now(),
      type: 'mixed',
      task_type,
      category,
      prompt,
      duration_ms: Date.now() - start,
      result,
      created_at: new Date().toISOString(),
    };
    _addHistory(entry);
    return success(res, entry);
  } catch (err) {
    logger.warn('[TestWorkbench] 混合模型测试失败', { task_type, error: err.message });
    const entry = {
      id: 'test_' + Date.now(),
      type: 'mixed',
      task_type,
      category,
      prompt,
      duration_ms: Date.now() - start,
      error: _safeMsg(err),
      created_at: new Date().toISOString(),
    };
    _addHistory(entry);
    throw err;
  }
});

export const testCustom = wrapController(async (req, res) => {
  const { task_type, prompt, category, model_sequence, parallel, params } = req.validated;
  const start = Date.now();
  const steps = [];

  let finalResult = null;

  if (parallel) {
    const promises = model_sequence.map(async (modelKey) => {
      const stepStart = Date.now();
      try {
        const r = await gatewayRoute({
          mode: 'single',
          modelKey,
          taskType: task_type,
          params: { prompt, ...params },
        });
        steps.push({ model_key: modelKey, duration_ms: Date.now() - stepStart, result: r, success: true });
        return { modelKey, r };
      } catch (err) {
        logger.warn('[TestWorkbench] 并行步骤执行失败', { model_key: modelKey, error: err.message });
        steps.push({ model_key: modelKey, duration_ms: Date.now() - stepStart, error: _safeMsg(err), success: false });
        return { modelKey, error: _safeMsg(err) };
      }
    });
    await Promise.allSettled(promises);
  } else {
    let prevResult = null;
    for (const modelKey of model_sequence) {
      const stepStart = Date.now();
      const stepParams = { prompt, ...params };
      if (prevResult) {
        stepParams.previous_output = prevResult;
      }
      try {
        finalResult = await gatewayRoute({
          mode: 'single',
          modelKey,
          taskType: task_type,
          params: stepParams,
        });
        prevResult = finalResult;
        steps.push({ model_key: modelKey, duration_ms: Date.now() - stepStart, result: finalResult, success: true, order: steps.length + 1 });
      } catch (err) {
        logger.warn('[TestWorkbench] 顺序步骤执行失败', { model_key: modelKey, error: err.message });
        steps.push({ model_key: modelKey, duration_ms: Date.now() - stepStart, error: _safeMsg(err), success: false, order: steps.length + 1 });
        break;
      }
    }
  }

  const entry = {
    id: 'test_' + Date.now(),
    type: 'custom',
    task_type,
    category,
    prompt,
    model_sequence,
    parallel,
    duration_ms: Date.now() - start,
    steps,
    result: finalResult || (parallel ? null : steps[steps.length - 1]?.result),
    created_at: new Date().toISOString(),
  };
  _addHistory(entry);

  return success(res, entry);
});

export const testCompare = wrapController(async (req, res) => {
  const { prompt, category, model_keys, params } = req.validated;
  const start = Date.now();
  const comparisons = [];

  const promises = model_keys.map(async (modelKey) => {
    const stepStart = Date.now();
    try {
      const result = await gatewayRoute({
        mode: 'single',
        modelKey,
        taskType: category + '_gen',
        params: { prompt, ...params },
      });
      return { model_key: modelKey, duration_ms: Date.now() - stepStart, result, success: true };
    } catch (err) {
      logger.warn('[TestWorkbench] 对比测试执行失败', { model_key: modelKey, error: err.message });
      return { model_key: modelKey, duration_ms: Date.now() - stepStart, error: _safeMsg(err), success: false };
    }
  });

  const results = await Promise.allSettled(promises);
  for (const r of results) {
    if (r.status === 'fulfilled') comparisons.push(r.value);
    else comparisons.push({ error: _safeMsg(r.reason), success: false });
  }

  const entry = {
    id: 'test_' + Date.now(),
    type: 'compare',
    category,
    prompt,
    model_keys,
    duration_ms: Date.now() - start,
    comparisons,
    created_at: new Date().toISOString(),
  };
  _addHistory(entry);

  return success(res, entry);
});

export const getHistory = wrapController(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
  const category = req.query.category || '';
  const type = req.query.type || '';

  let filtered = testHistory;
  if (category) filtered = filtered.filter(h => h.category === category);
  if (type) filtered = filtered.filter(h => h.type === type);

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return success(res, { items, total, page, pageSize });
});

export const deleteHistory = wrapController(async (req, res) => {
  const idx = testHistory.findIndex(h => h.id === req.params.id);
  if (idx === -1) throw new BusinessError(ERROR_CODE.NOT_FOUND, '记录不存在');
  testHistory.splice(idx, 1);
  return success(res, { deleted: true });
});

export const clearHistory = wrapController(async (_req, res) => {
  testHistory.length = 0;
  return success(res, { cleared: true });
});
