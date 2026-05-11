/**
 * 工作台 DIY 编辑路由 — 管理后台编辑用户端工作台页面和模块
 * Route:  /api/admin/workspace-diy/*
 * Auth:   admin / super_admin only
 */
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { getAllConfig, getConfigByKey, saveConfig, deleteConfigByKey } from '../services/siteConfigService.js';
import logger from '../utils/logger.js';

const router = Router();

// 所有接口均需管理员身份
router.use(authMiddleware, adminAuth);

// ─── Zod schemas ───
const keyParamSchema = z.object({
  key: z.string().min(1).max(100),
});
const putBodySchema = z.object({
  config_value: z.union([z.array(z.unknown()), z.object({}).passthrough()]),
  description: z.string().optional(),
});

const validateParams = (schema) => validate(schema, 'params');

// ─── GET /api/admin/workspace-diy — 获取所有配置 ───
router.get('/', async (req, res, next) => {
  try {
    const rows = await getAllConfig();
    const config = {};
    for (const r of rows) config[r.config_key] = r.config_value;
    return success(res, { config, updatedAt: rows[0]?.updated_at || null });
  } catch (err) { next(err); }
});

// ─── GET /api/admin/workspace-diy/:key — 获取单项配置 ───
router.get('/:key', validateParams(keyParamSchema), async (req, res, next) => {
  try {
    const row = await getConfigByKey(req.params.key);
    if (!row) return error(res, ERROR_CODE.NOT_FOUND, '配置项不存在');
    return success(res, row);
  } catch (err) { next(err); }
});

// ─── PUT /api/admin/workspace-diy/:key — 更新单项配置 ───
router.put('/:key', heavyLimiter, validateParams(keyParamSchema), validate(putBodySchema, 'body'), async (req, res, next) => {
  try {
    const { config_value, description } = req.body;
    const updatedBy = req.user?.username || req.user?.email || 'admin';
    await saveConfig(req.params.key, config_value, 'json', description || '');
    logger.info(`[workspace-diy] ${req.params.key} 已更新 by ${updatedBy}`);
    return success(res, { message: `${req.params.key} 已保存`, updatedBy });
  } catch (err) { next(err); }
});

// ─── POST /api/admin/workspace-diy/reset/:key — 恢复默认 ───
router.post('/reset/:key', heavyLimiter, validateParams(keyParamSchema), async (req, res, next) => {
  try {
    const row = await getConfigByKey(req.params.key);
    if (!row) return error(res, ERROR_CODE.NOT_FOUND, '配置项不存在');
    await deleteConfigByKey(req.params.key);
    logger.info(`[workspace-diy] ${req.params.key} 已重置为默认值 by ${req.user?.username || 'admin'}`);
    return success(res, { message: `${req.params.key} 已重置为默认值` });
  } catch (err) { next(err); }
});

export default router;
