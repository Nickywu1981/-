/**
 * Movio AI v4.2 — Model Router Routes
 * GET  /api/admin/models/status — 所有模型状态 + 熔断器
 * POST /api/admin/models/reset-breaker — 重置熔断器
 * P4 新增 CRUD:
 * GET    /api/admin/models/config — 模型配置列表
 * POST   /api/admin/models/config — 注册新模型
 * GET    /api/admin/models/config/:modelKey — 模型详情
 * PUT    /api/admin/models/config/:modelKey — 更新模型
 * DELETE /api/admin/models/config/:modelKey — 删除模型
 * PATCH  /api/admin/models/config/:modelKey/toggle — 启用/禁用
 * GET    /api/admin/models/call-logs — 调用日志
 * GET    /api/admin/models/call-stats/:modelKey — 调用统计
 */
import { Router } from 'express';
import { z } from 'zod';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { validateV4 as _validate } from '../utils/validate.js';
import { requireRole } from '../middleware/rbac.js';
import * as modelRouterService from '../services/model-router.service.js';
import * as modelConfigCtrl from '../controller/modelConfigController.js';

const router = Router();

const resetBreakerSchema = z.object({
  model_id: z.string().min(1, '请提供模型ID').max(50),
});

const modelConfigSchema = z.object({
  model_key: z.string().min(1).max(50),
  display_name: z.string().min(1).max(100),
  vendor: z.string().min(1).max(50),
  category: z.enum(['image', 'video', 'text', 'audio', 'multimodal', 'custom']),
  endpoint: z.string().url('请输入有效URL'),
  api_key: z.string().min(1, '请提供API密钥'),
  model_id: z.string().max(100).optional().default(''),
  max_tokens: z.number().int().min(1).max(1000000).optional().default(4096),
  priority: z.number().int().min(0).max(999).optional().default(0),
  enabled: z.boolean().optional().default(true),
  rate_limit_rpm: z.number().int().min(1).max(10000).optional().default(60),
  rate_limit_rpd: z.number().int().min(1).max(100000).optional().default(1000),
  concurrency_max: z.number().int().min(1).max(100).optional().default(5),
  breaker_threshold: z.number().int().min(1).max(100).optional().default(5),
  breaker_cooldown_s: z.number().int().min(30).max(3600).optional().default(60),
  moderation_enabled: z.boolean().optional().default(true),
  moderation_action: z.enum(['block', 'flag', 'log_only']).optional().default('block'),
  blocked_words: z.string().max(500).optional().default(''),
});

const modelUpdateSchema = modelConfigSchema.partial().omit({ model_key: true });

const toggleSchema = z.object({ enabled: z.boolean() });

// ============ 模型状态 ============

router.get('/status', requireRole('admin'), async (req, res) => {
  try {
    const status = await modelRouterService.getModelStatus();
    return success(res, status);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
});

router.post('/reset-breaker', requireRole('admin'), _validate(resetBreakerSchema), async (req, res) => {
  try {
    const { model_id } = req.validated;
    const result = modelRouterService.resetBreaker(model_id);
    return success(res, result);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
});

// ============ 模型配置 CRUD ============

router.get('/config', requireRole('admin'), (req, res) => modelConfigCtrl.list(req, res));

router.get('/config/:modelKey', requireRole('admin'), (req, res) => modelConfigCtrl.getOne(req, res));

router.post('/config', requireRole('admin'), _validate(modelConfigSchema), (req, res) => {
  return modelConfigCtrl.create(req, res);
});

router.put('/config/:modelKey', requireRole('admin'), _validate(modelUpdateSchema), (req, res) => {
  return modelConfigCtrl.update(req, res);
});

router.delete('/config/:modelKey', requireRole('admin'), (req, res) => modelConfigCtrl.remove(req, res));

router.patch('/config/:modelKey/toggle', requireRole('admin'), _validate(toggleSchema), (req, res) => modelConfigCtrl.toggle(req, res));

// ============ 调用日志 ============

router.get('/call-logs', requireRole('admin'), (req, res) => modelConfigCtrl.callLogs(req, res));

router.get('/call-stats/:modelKey', requireRole('admin'), (req, res) => modelConfigCtrl.callStats(req, res));

export default router;
