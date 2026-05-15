/**
 * 电商全能AI Agent 路由
 *
 * 4 条业务链路 + 人工微调 + 参考上传 + 配置查询
 */
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { authMiddleware } from '../middleware/auth.js';
import { e2bLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';
import * as ctrl from '../controller/agentController.js';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ALLOWED_MIME = ['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime','image/avif','image/bmp','image/tiff'];
const upload = multer({
  storage: multer.diskStorage({
    destination: path.resolve(__dirname, '../../uploads/references/'),
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ALLOWED_MIME.includes(file.mimetype)),
});

// ===== Zod Schemas =====

const generateSchema = z.object({
  userInput: z.string().min(1, '需求描述不能为空').max(2000),
  productName: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  referenceVideoUrl: z.string().url().optional().or(z.literal('')),
  platform: z.string().optional().default('taobao'),
  industry: z.string().optional(),
  videoDuration: z.coerce.number().int().positive().max(300).optional().default(30),
  needsVoice: z.boolean().optional().default(false),
  extra: z.object({}).passthrough().optional(),
});

const tweakAgentSchema = z.object({
  agentParams: z.object({}).passthrough().optional().default({}),
  context: z.object({}).passthrough().optional().default({}),
  state: z.object({}).passthrough().optional(),
  userId: z.number().int().positive().optional(),
});

const uploadRefSchema = z.object({
  type: z.string().max(50).optional(),
});

// ==================== 全链路生成 ====================
// POST /api/agent/generate — 统一入口，自动意图识别→选择链路
router.post('/generate', authMiddleware, e2bLimiter, validate(generateSchema), ctrl.generate);

// ==================== 人工微调 ====================
// POST /api/agent/tweak/:agentName — 单独重执行某个Agent
router.post('/tweak/:agentName', authMiddleware, validate(tweakAgentSchema), ctrl.tweakAgent);

// ==================== 参考上传 ====================
// POST /api/agent/upload-reference — 上传参考图/参考视频
router.post('/upload-reference', authMiddleware, upload.single('file'), validate(uploadRefSchema), ctrl.uploadReference);

// ==================== 查询接口 ====================
// GET /api/agent/intents — 支持的意图列表
router.get('/intents', authMiddleware, ctrl.listIntents);

// GET /api/agent/industries — 支持的行业列表
router.get('/industries', authMiddleware, ctrl.listIndustries);

// GET /api/agent/config — 可配置清单（行业/风格/模型/分镜数/视频时长/配音开关）
router.get('/config', authMiddleware, ctrl.getConfig);

// GET /api/agent/status/:taskId — 查询任务状态
router.get('/status/:taskId', authMiddleware, ctrl.getPipelineStatus);

export default router;
