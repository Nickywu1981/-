/**
 * Movio AI v4.1 — Config Routes / Controller
 * G5 后端开发 | GET /api/config/:group  |  POST /api/admin/config
 */
import { Router } from 'express';
import { z } from 'zod';
import { success, error } from '../utils/response.js';
import { validateV4 as _validate } from '../utils/validate.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as configService from '../services/config.service.js';
import { sseMiddleware } from '../services/config-version.service.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();
const adminRouter = Router();

const setConfigSchema = z.object({
  group_key: z.string().min(1, '请提供配置分组').max(50),
  item_key: z.string().min(1, '请提供配置项').max(50),
  item_value: z.string().max(5000),
});

const rollbackSchema = z.object({
  log_id: z.number().int().positive('请指定变更记录ID'),
});

// GET /api/config/:group — 获取配置组
router.get('/:group', async (req, res) => {
  try {
    const config = await configService.getGroupConfig(
      req.params.group,
      req.user?.id || null,
      req.user?.role || null,
    );
    return success(res, config);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message || '读取配置失败');
  }
});

// GET /api/config/dict/:dictKey — 获取字典
router.get('/dict/:dictKey', async (req, res) => {
  try {
    const dict = await configService.getDict(req.params.dictKey);
    return success(res, dict);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message || '读取字典失败');
  }
});

// GET /api/config/version/stream — SSE 配置版本推送
router.get('/version/stream', sseMiddleware);

// ===============================
// Admin Config Routes (需 admin 权限)
// ===============================

// GET /api/admin/config/groups — 获取所有配置分组
adminRouter.get('/groups', requireRole('admin'), async (req, res) => {
  try {
    const { getGroupList } = await import('../services/config.service.js');
    const groups = await getGroupList();
    return success(res, groups);
  } catch (err) {
    return error(res, ERROR_CODE.INTERNAL_ERROR, err.message || '查询分组失败');
  }
});

// GET /api/admin/config/items/:groupKey — 获取分组下所有配置项(含完整元数据)
adminRouter.get('/items/:groupKey', requireRole('admin'), async (req, res) => {
  try {
    const { getGroupItems } = await import('../services/config.service.js');
    const items = await getGroupItems(req.params.groupKey);
    return success(res, items);
  } catch (err) {
    return error(res, ERROR_CODE.INTERNAL_ERROR, err.message || '查询配置项失败');
  }
});

// POST /api/admin/config — 写入配置
adminRouter.post('/', requireRole('admin'), _validate(setConfigSchema), async (req, res) => {
  try {
    const { group_key, item_key, item_value } = req.validated;
    const result = await configService.setConfig(group_key, item_key, item_value, req.user.id);
    return success(res, result, '配置已更新');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message || '更新配置失败');
  }
});

// POST /api/admin/config/rollback — 回滚配置
adminRouter.post('/rollback', requireRole('admin'), _validate(rollbackSchema), async (req, res) => {
  try {
    const { log_id } = req.validated;
    const result = await configService.rollbackConfig(log_id, req.user.id);
    return success(res, result, '配置已回滚');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message || '回滚失败');
  }
});

// GET /api/admin/config/logs/:group — 变更日志
adminRouter.get('/logs/:group', requireRole('admin'), async (req, res) => {
  try {
    const logs = await configService.getConfigLogs(req.params.group);
    return success(res, logs);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message || '查询日志失败');
  }
});

// GET /api/admin/config/seed/verify — 校验Seed数据
adminRouter.get('/seed/verify', requireRole('admin'), async (req, res) => {
  try {
    const { validateSeed } = await import('../utils/seed-validator.js');
    const result = await validateSeed((await import('../dao/db.js')).default);
    return success(res, result);
  } catch (err) {
    return error(res, ERROR_CODE.INTERNAL_ERROR, err.message || '校验失败');
  }
});

export { router as configPublicRouter, adminRouter as configAdminRouter };
