/**
 * 3D 预览路由
 * POST /api/3d/upload — 上传 3D 模型
 * GET  /api/3d/models — 用户模型列表
 * GET  /api/3d/demo/:key — 获取示例模型
 */
import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { authMiddleware } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { uploadQuotaGuard, magicNumberGuard } from '../middleware/upload.js';
import { validateV4 as _validate } from '../utils/validate.js';
import * as ctrl from '../controller/v4ThreeDController.js';

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.resolve(__dirname, '../../uploads/3d')),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.glb', '.gltf', '.fbx', '.obj', '.stl'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// POST /api/3d/upload
router.post('/upload', uploadLimiter, authMiddleware, upload.single('model'), uploadQuotaGuard, magicNumberGuard, ctrl.upload);

const modelsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// GET /api/3d/models
router.get('/models', authMiddleware, _validate(modelsQuerySchema, 'query'), ctrl.getModels);

// GET /api/3d/demo/:key — 示例模型（GLB）
const demoParamsSchema = z.object({
  key: z.enum(['shoe', 'watch', 'bag', 'bottle']),
});

router.get('/demo/:key', _validate(demoParamsSchema, 'params'), ctrl.getDemo);

export default router;
