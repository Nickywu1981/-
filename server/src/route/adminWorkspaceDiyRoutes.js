/**
 * 工作台 DIY 编辑路由 — 管理后台编辑用户端工作台页面和模块
 * Route:  /api/admin/workspace-diy/*
 * Auth:   admin / super_admin only
 */
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/adminWorkspaceDiyController.js';

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
router.get('/', (req, res) => ctrl.getAll(req, res));

// ─── GET /api/admin/workspace-diy/:key — 获取单项配置 ───
router.get('/:key', validateParams(keyParamSchema), (req, res) => ctrl.getByKey(req, res));

// ─── PUT /api/admin/workspace-diy/:key — 更新单项配置 ───
router.put('/:key', heavyLimiter, validateParams(keyParamSchema), validate(putBodySchema, 'body'), (req, res) => ctrl.update(req, res));

// ─── POST /api/admin/workspace-diy/reset/:key — 恢复默认 ───
router.post('/reset/:key', heavyLimiter, validateParams(keyParamSchema), (req, res) => ctrl.reset(req, res));

export default router;
