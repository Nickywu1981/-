import { Router } from 'express';
import {
  submitScriptGen, submitShotPlan, submitViralClone, submitViralAnalyze, submitViralReplicate,
  submitActionBatch, submitVideoBeautify, submitVoiceGen, submitVoiceClone, submitVideoEdit,
  getTaskResult, listMyTasks,
} from '../controller/advancedVideoController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const scriptGenSchema = z.object({
  productName: z.string().min(1, '产品名称不能为空').max(200),
  platform: z.string().min(1, '平台不能为空'),
  language: z.string().optional(),
  tone: z.string().optional(),
});
const shotPlanSchema = z.object({
  productSellingPoints: z.string().min(1, '卖点不能为空'),
  platform: z.string().optional(),
});
const viralCloneSchema = z.object({
  videoUrl: z.string().url('请提供有效的视频URL'),
});
const viralAnalyzeSchema = z.object({
  videoUrl: z.string().url('请提供有效的视频URL'),
});
const viralReplicateSchema = z.object({
  videoUrl: z.string().url('请提供有效的视频URL'),
  productImages: z.array(z.string().url()).min(1, '至少需要一张产品图'),
});
const videoBeautifySchema = z.object({ videoUrl: z.string().url('请提供有效的视频URL') });
const voiceGenSchema = z.object({
  script: z.string().min(1, '脚本不能为空').max(5000),
  voice: z.string().optional(),
  language: z.string().optional(),
});
const voiceCloneSchema = z.object({
  audioUrl: z.string().url('请提供音频样本URL'),
  script: z.string().min(1, '要合成的文本不能为空'),
});

router.post('/script-gen', authMiddleware, heavyLimiter, validate(scriptGenSchema), asyncHandler(submitScriptGen));
router.post('/shot-plan', authMiddleware, heavyLimiter, validate(shotPlanSchema), asyncHandler(submitShotPlan));
router.post('/viral-clone', authMiddleware, heavyLimiter, validate(viralCloneSchema), asyncHandler(submitViralClone));
router.post('/viral-analyze', authMiddleware, heavyLimiter, validate(viralAnalyzeSchema), asyncHandler(submitViralAnalyze));
router.post('/viral-replicate', authMiddleware, heavyLimiter, validate(viralReplicateSchema), asyncHandler(submitViralReplicate));
router.get('/viral-replicate/:taskId', authMiddleware, asyncHandler(getTaskResult));
router.post('/action-batch', authMiddleware, heavyLimiter, asyncHandler(submitActionBatch));
router.post('/beautify', authMiddleware, heavyLimiter, validate(videoBeautifySchema), asyncHandler(submitVideoBeautify));
router.post('/voice-gen', authMiddleware, heavyLimiter, validate(voiceGenSchema), asyncHandler(submitVoiceGen));
router.post('/voice-clone', authMiddleware, heavyLimiter, validate(voiceCloneSchema), asyncHandler(submitVoiceClone));
router.post('/video-edit', authMiddleware, heavyLimiter, asyncHandler(submitVideoEdit));

router.get('/tasks', authMiddleware, asyncHandler(listMyTasks));
router.get('/tasks/:taskId', authMiddleware, asyncHandler(getTaskResult));

export default router;
