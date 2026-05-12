/**
 * Movio AI v4.1 — Config Routes
 * G5 后端开发 | GET /api/config/:group  |  POST /api/admin/config
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate } from '../utils/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { sseMiddleware } from '../services/config-version.service.js';
import { requireRole } from '../middleware/rbac.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/v4ConfigController.js';

const router = Router();
const adminRouter = Router();
adminRouter.use(requireRole('admin'));
adminRouter.use(rateLimiter);

const setConfigSchema = z.object({
  group_key: z.string().min(1, '请提供配置分组').max(50),
  item_key: z.string().min(1, '请提供配置项').max(50),
  item_value: z.string().max(5000),
});

const rollbackSchema = z.object({
  log_id: z.number().int().positive('请指定变更记录ID'),
});

// GET /api/config/:group — 获取配置组
router.get('/:group', authMiddleware, rateLimiter, ctrl.getGroupConfig);

// GET /api/config/dict/:dictKey — 获取字典
router.get('/dict/:dictKey', rateLimiter, ctrl.getDict);

// GET /api/config/version/stream — SSE 配置版本推送
router.get('/version/stream', rateLimiter, sseMiddleware);

// ===============================
// Admin Config Routes (需 admin 权限)
// ===============================

// GET /api/admin/config/groups — 获取所有配置分组
adminRouter.get('/groups', requireRole('admin'), ctrl.getGroupList);

// GET /api/admin/config/items/:groupKey — 获取分组下所有配置项(含完整元数据)
adminRouter.get('/items/:groupKey', requireRole('admin'), ctrl.getGroupItems);

// POST /api/admin/config — 写入配置
adminRouter.post('/', requireRole('admin'), _validate(setConfigSchema), ctrl.setConfig);

// POST /api/admin/config/rollback — 回滚配置
adminRouter.post('/rollback', requireRole('admin'), _validate(rollbackSchema), ctrl.rollbackConfig);

// GET /api/admin/config/logs/:group — 变更日志
adminRouter.get('/logs/:group', requireRole('admin'), ctrl.getConfigLogs);

// GET /api/admin/config/seed/verify — 校验Seed数据
adminRouter.get('/seed/verify', requireRole('admin'), ctrl.verifySeed);

export { router as configPublicRouter, adminRouter as configAdminRouter };
