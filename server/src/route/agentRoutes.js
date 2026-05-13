/**
 * 电商全能AI Agent 路由
 *
 * 4 条业务链路 + 人工微调 + 参考上传 + 配置查询
 */
import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import { e2bLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/agentController.js';

const router = Router();
const upload = multer({ dest: 'uploads/references/', limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB

// ==================== 全链路生成 ====================
// POST /api/agent/generate — 统一入口，自动意图识别→选择链路
router.post('/generate', authMiddleware, e2bLimiter, ctrl.generate);

// ==================== 人工微调 ====================
// POST /api/agent/tweak/:agentName — 单独重执行某个Agent
router.post('/tweak/:agentName', authMiddleware, ctrl.tweakAgent);

// ==================== 参考上传 ====================
// POST /api/agent/upload-reference — 上传参考图/参考视频
router.post('/upload-reference', authMiddleware, upload.single('file'), ctrl.uploadReference);

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
