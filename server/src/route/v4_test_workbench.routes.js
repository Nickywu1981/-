/**
 * Movio AI v4.1 — Internal Test Workbench API
 * G5 后端开发 | 内部测试台专用
 *
 * 端点:
 *   GET  /api/test/models          — 可用模型列表（按类别分组 + 状态）
 *   POST /api/test/single          — 单模型测试
 *   POST /api/test/mixed           — 自动混合模型测试
 *   POST /api/test/custom          — 自定义多模型编排测试
 *   POST /api/test/compare         — 多模型并行对比
 *   GET  /api/test/history         — 测试历史记录
 *   DELETE /api/test/history/:id   — 删除单条历史
 *   DELETE /api/test/history       — 清空历史
 */
import { Router } from 'express';
import { z } from 'zod';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { validateV4 as _validate } from '../utils/validate.js';
import { requireRole } from '../middleware/rbac.js';
import * as modelRouter from '../services/model-router.service.js';

const router = Router();

// ---- 内存测试历史（MVP: 不建表，重启即清） ----
const testHistory = [];
const MAX_HISTORY = 200;

function _addHistory(entry) {
  testHistory.unshift(entry);
  if (testHistory.length > MAX_HISTORY) testHistory.length = MAX_HISTORY;
}

// ---- Zod Schemas ----
const singleTestSchema = z.object({
  model_key: z.string().min(1).max(50),
  prompt: z.string().min(1, '请输入提示词').max(5000),
  category: z.enum(['text', 'image', 'video']),
  params: z.record(z.unknown()).optional().default({}),
});

const mixedTestSchema = z.object({
  task_type: z.string().min(1).max(50),
  prompt: z.string().min(1, '请输入提示词').max(5000),
  category: z.enum(['text', 'image', 'video']),
  params: z.record(z.unknown()).optional().default({}),
});

const customTestSchema = z.object({
  task_type: z.string().min(1).max(50),
  prompt: z.string().min(1, '请输入提示词').max(5000),
  category: z.enum(['text', 'image', 'video']),
  model_sequence: z.array(z.string().min(1)).min(1, '至少选择一个模型'),
  parallel: z.boolean().optional().default(false),
  params: z.record(z.unknown()).optional().default({}),
});

const compareTestSchema = z.object({
  prompt: z.string().min(1, '请输入提示词').max(5000),
  category: z.enum(['text', 'image', 'video']),
  model_keys: z.array(z.string().min(1)).min(2, '对比至少需要2个模型'),
  params: z.record(z.unknown()).optional().default({}),
});

// ---- 可用模型分类视图 ----
const CATEGORY_LABELS = { text: '文本', image: '图片', video: '视频' };

function __categoryFor(key) {
  const m = MODEL_REGISTRY_CACHE[key];
  return m ? m.category : 'unknown';
}

// 镜像 model-router 注册表（此处只读引用）
const MODEL_REGISTRY_CACHE = {
  tongyi_qwen:    { name: '千问 (Qwen)',       category: 'text',  key: 'tongyi_qwen' },
  deepseek:       { name: 'DeepSeek',           category: 'text',  key: 'deepseek' },
  tongyi_wanxiang:{ name: '通义万象',           category: 'image', key: 'tongyi_wanxiang' },
  seedance:       { name: 'Seedance',           category: 'video', key: 'seedance' },
};

// GET /api/test/models
router.get('/models', requireRole('admin'), async (req, res) => {
  try {
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
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
});

// POST /api/test/single — 单模型独立测试
router.post('/single', requireRole('admin'), _validate(singleTestSchema), async (req, res) => {
  const { model_key, prompt, category, params } = req.validated;
  const start = Date.now();

  try {
    const result = await modelRouter.routeModel({
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
    const entry = {
      id: 'test_' + Date.now(),
      type: 'single',
      model_key,
      category,
      prompt,
      duration_ms: Date.now() - start,
      error: err.message,
      created_at: new Date().toISOString(),
    };
    _addHistory(entry);
    return error(res, ERROR_CODE.INTERNAL_ERROR, err.message, { test_id: entry.id });
  }
});

// POST /api/test/mixed — 自动混合模型调用
router.post('/mixed', requireRole('admin'), _validate(mixedTestSchema), async (req, res) => {
  const { task_type, prompt, category, params } = req.validated;
  const start = Date.now();

  try {
    const result = await modelRouter.routeModel({
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
    const entry = {
      id: 'test_' + Date.now(),
      type: 'mixed',
      task_type,
      category,
      prompt,
      duration_ms: Date.now() - start,
      error: err.message,
      created_at: new Date().toISOString(),
    };
    _addHistory(entry);
    return error(res, ERROR_CODE.INTERNAL_ERROR, err.message, { test_id: entry.id });
  }
});

// POST /api/test/custom — 自定义多模型编排测试
router.post('/custom', requireRole('admin'), _validate(customTestSchema), async (req, res) => {
  const { task_type, prompt, category, model_sequence, parallel, params } = req.validated;
  const start = Date.now();
  const steps = [];

  try {
    let finalResult = null;

    if (parallel) {
      // 并行模式：所有模型同时调，收集全部结果
      const promises = model_sequence.map(async (modelKey) => {
        const stepStart = Date.now();
        try {
          const r = await modelRouter.routeModel({
            mode: 'single',
            modelKey,
            taskType: task_type,
            params: { prompt, ...params },
          });
          steps.push({ model_key: modelKey, duration_ms: Date.now() - stepStart, result: r, success: true });
          return { modelKey, r };
        } catch (err) {
          steps.push({ model_key: modelKey, duration_ms: Date.now() - stepStart, error: err.message, success: false });
          return { modelKey, error: err.message };
        }
      });
      await Promise.allSettled(promises);
    } else {
      // 串行模式：按顺序逐个执行，前一个的输出可做下一个的输入
      let prevResult = null;
      for (const modelKey of model_sequence) {
        const stepStart = Date.now();
        const stepParams = { prompt, ...params };
        if (prevResult) {
          stepParams.previous_output = prevResult;
        }
        try {
          finalResult = await modelRouter.routeModel({
            mode: 'single',
            modelKey,
            taskType: task_type,
            params: stepParams,
          });
          prevResult = finalResult;
          steps.push({ model_key: modelKey, duration_ms: Date.now() - stepStart, result: finalResult, success: true, order: steps.length + 1 });
        } catch (err) {
          steps.push({ model_key: modelKey, duration_ms: Date.now() - stepStart, error: err.message, success: false, order: steps.length + 1 });
          break; // 串行模式：某步失败则停止
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
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
});

// POST /api/test/compare — 多模型并行对比
router.post('/compare', requireRole('admin'), _validate(compareTestSchema), async (req, res) => {
  const { prompt, category, model_keys, params } = req.validated;
  const start = Date.now();
  const comparisons = [];

  const promises = model_keys.map(async (modelKey) => {
    const stepStart = Date.now();
    try {
      const result = await modelRouter.routeModel({
        mode: 'single',
        modelKey,
        taskType: category + '_gen',
        params: { prompt, ...params },
      });
      return { model_key: modelKey, duration_ms: Date.now() - stepStart, result, success: true };
    } catch (err) {
      return { model_key: modelKey, duration_ms: Date.now() - stepStart, error: err.message, success: false };
    }
  });

  const results = await Promise.allSettled(promises);
  for (const r of results) {
    if (r.status === 'fulfilled') comparisons.push(r.value);
    else comparisons.push({ error: r.reason?.message || 'Unknown error', success: false });
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

// GET /api/test/history
router.get('/history', requireRole('admin'), async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 20));
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

// DELETE /api/test/history/:id
router.delete('/history/:id', requireRole('admin'), async (req, res) => {
  const idx = testHistory.findIndex(h => h.id === req.params.id);
  if (idx === -1) return error(res, ERROR_CODE.NOT_FOUND, '记录不存在');
  testHistory.splice(idx, 1);
  return success(res, { deleted: true });
});

// DELETE /api/test/history — 清空全部
router.delete('/history', requireRole('admin'), async (req, res) => {
  testHistory.length = 0;
  return success(res, { cleared: true });
});

export default router;
