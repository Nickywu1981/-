import { Router } from 'express';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';
import * as proxyController from '../controller/proxyController.js';
import { BusinessError } from '../utils/businessError.js';

const router = Router();

// ==================== Zod Schemas ====================

const configSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100),
  code: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/, '编码仅允许小写字母、数字、下划线、连字符'),
  targetUrl: z.string().url('目标URL格式不正确'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
  headers: z.record(z.string()).optional(),
  timeout: z.coerce.number().int().min(1000).max(60000).optional(),
  retryTimes: z.coerce.number().int().min(0).max(5).optional(),
  retryDelay: z.coerce.number().int().min(100).max(10000).optional(),
  rateLimitRpm: z.coerce.number().int().min(1).max(10000).optional(),
  circuitThreshold: z.coerce.number().int().min(1).max(100).optional(),
  circuitRecoveryMs: z.coerce.number().int().min(5000).max(300000).optional(),
});

const whitelistSchema = z.object({
  apiConfigId: z.number().int().positive('配置ID必填'),
  ipCidr: z.string().min(1, 'IP/CIDR不能为空').max(45),
  remark: z.string().max(200).optional(),
});

const whitelistUpdateSchema = z.object({
  ipCidr: z.string().min(1).max(45).optional(),
  remark: z.string().max(200).optional(),
  isActive: z.coerce.number().int().min(0).max(1).optional(),
});

// ==================== 配置 CRUD ====================

router.get('/', authMiddleware, adminAuth, asyncHandler(proxyController.listConfigs));
router.get('/:id', authMiddleware, adminAuth, asyncHandler(proxyController.getConfig));
router.post('/', authMiddleware, adminAuth, validate(configSchema), asyncHandler(proxyController.createConfig));
router.put('/:id', authMiddleware, adminAuth, validate(configSchema.partial()), asyncHandler(proxyController.updateConfig));
router.delete('/:id', authMiddleware, adminAuth, asyncHandler(proxyController.deleteConfig));

// ==================== 代理转发调用 ====================

router.post('/call/:code', authMiddleware, asyncHandler(proxyController.callProxy));

// ==================== 白名单管理 ====================

router.get('/:id/whitelist', authMiddleware, adminAuth, asyncHandler(proxyController.listWhitelist));
router.post('/:id/whitelist', authMiddleware, adminAuth, validate(whitelistSchema), asyncHandler(proxyController.addWhitelist));
router.put('/:id/whitelist/:entryId', authMiddleware, adminAuth, validate(whitelistUpdateSchema), asyncHandler(proxyController.updateWhitelist));
router.delete('/:id/whitelist/:entryId', authMiddleware, adminAuth, asyncHandler(proxyController.removeWhitelist));

// ==================== 熔断管理 ====================

router.get('/:id/circuit', authMiddleware, adminAuth, asyncHandler(proxyController.getCircuitStatus));
router.post('/:id/circuit/reset', authMiddleware, adminAuth, asyncHandler(proxyController.resetCircuit));

// ==================== 调用日志 ====================

router.get('/logs', authMiddleware, adminAuth, asyncHandler(proxyController.listLogs));
router.post('/logs/clean', authMiddleware, adminAuth, asyncHandler(proxyController.cleanLogs));

export default router;
