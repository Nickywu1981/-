import { Router } from 'express';
import {
  submitScriptGen, submitShotPlan, submitViralClone, submitViralAnalyze, submitViralReplicate,
  submitActionBatch, submitVideoBeautify, submitVoiceGen, submitVoiceClone, submitVideoEdit,
  getTaskResult, listMyTasks,
} from '../controller/advancedVideoController.js';
import { authMiddleware } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { tierGuard } from '../middleware/tierGuard.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const scriptGenSchema = z.object({
  productInfo: z.string().min(1, '请输入产品卖点信息').max(5000),
  scriptType: z.string().optional(),
  lang: z.string().optional(),
  length: z.coerce.number().int().positive().optional(),
});
const shotPlanSchema = z.object({
  productInfo: z.string().min(1, '请输入产品信息').max(5000),
  videoStyle: z.string().optional(),
  totalDuration: z.coerce.number().int().positive().optional(),
});
const viralCloneSchema = z.object({
  referenceVideoUrl: z.string().url('请提供爆款视频URL'),
  productImageUrl: z.string().url('请提供产品图URL'),
  matchStrength: z.coerce.number().min(0).max(1).optional(),
});
const viralAnalyzeSchema = z.object({
  url: z.string().url('请提供有效的视频URL'),
});
const viralReplicateSchema = z.object({
  analysisResult: z.string().optional(),
  productImageUrl: z.string().url('请提供产品图URL'),
  productName: z.string().max(200).optional(),
});
const actionBatchSchema = z.object({
  actionVideoUrl: z.string().url('请提供动作视频URL'),
  productImageUrls: z.array(z.string().url()).min(1, '至少需要一张产品图'),
  targetAction: z.string().optional(),
});
const videoBeautifySchema = z.object({
  videoUrl: z.string().url('请提供有效的视频URL'),
  options: z.object({}).passthrough().optional(),
});
const voiceGenSchema = z.object({
  text: z.string().min(1, '文案不能为空').max(5000),
  voiceType: z.string().optional(),
  speed: z.coerce.number().min(0.5).max(2).optional(),
  lang: z.string().optional(),
});
const voiceCloneSchema = z.object({
  audioSampleUrl: z.string().url('请提供音频样本URL'),
  text: z.string().optional(),
  presetVoice: z.string().optional(),
});

const videoEditSchema = z.object({
  videoUrl: z.string().min(1, '请提供视频URL').max(2000),
  edits: z.array(z.unknown()).optional().default([]),
  bgm: z.string().max(500).optional(),
  subtitle: z.boolean().optional(),
});

router.post('/script-gen', authMiddleware, heavyLimiter, tierGuard('video'), validate(scriptGenSchema), submitScriptGen);
router.post('/shot-plan', authMiddleware, heavyLimiter, tierGuard('video'), validate(shotPlanSchema), submitShotPlan);
router.post('/viral-clone', authMiddleware, heavyLimiter, tierGuard('video'), validate(viralCloneSchema), submitViralClone);
router.post('/viral-analyze', authMiddleware, heavyLimiter, tierGuard('video'), validate(viralAnalyzeSchema), submitViralAnalyze);
router.post('/viral-replicate', authMiddleware, heavyLimiter, tierGuard('video'), validate(viralReplicateSchema), submitViralReplicate);
router.post('/action-batch', authMiddleware, heavyLimiter, tierGuard('video'), validate(actionBatchSchema), submitActionBatch);
router.post('/beautify', authMiddleware, heavyLimiter, tierGuard('video'), validate(videoBeautifySchema), submitVideoBeautify);
router.post('/voice-gen', authMiddleware, heavyLimiter, tierGuard('video'), validate(voiceGenSchema), submitVoiceGen);
router.post('/voice-clone', authMiddleware, heavyLimiter, tierGuard('video'), validate(voiceCloneSchema), submitVoiceClone);
router.post('/video-edit', authMiddleware, heavyLimiter, tierGuard('video'), validate(videoEditSchema), submitVideoEdit);

router.get('/tasks', authMiddleware, listMyTasks);
router.get('/tasks/:taskId', authMiddleware, validate(z.object({ taskId: z.string().regex(/^\d+$/).transform(Number) }), 'params'), getTaskResult);

export default router;
