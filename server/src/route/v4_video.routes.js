/**
 * Movio AI v4.1 — Video Routes
 * G5 后端开发 | W3
 * 视频生成 / 动作迁移 / 爆款分析 / 数字人 / 分镜 / 一键成片 / 长视频精剪
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate, validate, paginationSchema } from '../utils/validate.js';
import { tierGuard } from '../middleware/tierGuard.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { authMiddleware } from '../middleware/auth.js';
import * as ctrl from '../controller/v4VideoController.js';

const router = Router();
router.use(authMiddleware);

const idParamSchema = z.object({ id: z.string().min(1).max(50) });

const urlField = z.string().url('URL格式不正确');
const optUrl = z.string().url().optional();

const worksQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  task_type: z.string().optional(),
});

// Schemas
const generateSchema = z.object({
  prompt: z.string().min(1, '请提供提示词').max(4000),
  duration: z.number().int().min(1).max(600).optional(),
  ratio: z.string().optional(),
  enhanced_prompt: z.string().max(4000).optional(),
});

const imageToVideoSchema = z.object({
  image_url: urlField,
  prompt: z.string().max(4000).optional(),
  duration: z.number().int().min(1).max(60).optional(),
  ratio: z.string().optional(),
});

const multiImageSchema = z.object({
  images: z.array(urlField).min(1, '至少一张图片').max(20, '最多20张'),
  prompt: z.string().max(4000).optional(),
  duration: z.number().int().min(1).max(60).optional(),
  ratio: z.string().optional(),
  transition: z.string().max(30).optional(),
});

const packageSchema = z.object({
  video_url: urlField,
  options: z.object({}).passthrough().optional(),
});

const replaceCharSchema = z.object({
  video_url: urlField,
  target_person_image: urlField,
});

const productAdSchema = z.object({
  product_name: z.string().min(1, '请提供商品名称').max(200),
  product_images: z.array(urlField).min(1).max(10).optional(),
  highlights: z.array(z.string().max(300)).max(10).optional(),
  style: z.string().max(50).optional(),
  duration: z.number().int().min(5).max(120).optional(),
});

const storyboardSchema = z.object({
  prompt: z.string().min(1, '请提供描述').max(4000),
  scene_count: z.number().int().min(2).max(20).default(5),
});

const enhancedOptionsSchema = z.object({
  replace_background: z.union([z.boolean(), z.string().url('背景图片URL格式不正确')]).optional(),
  replace_clothing: z.boolean().optional(),
  clothing_style: z.string().max(100).optional(),
  clothing_color: z.string().max(50).optional(),
  keep_original_audio: z.boolean().optional(),
  bgm_url: optUrl,
  volume: z.number().min(0).max(1).optional(),
  voiceover: z.object({
    text: z.string().min(1).max(1000),
    voice_type: z.string().max(50).optional(),
  }).optional(),
}).optional();

const actionMigrateSchema = z.object({
  source_video_url: urlField,
  target_person_image: urlField,
  options: z.object({}).passthrough().optional(),
  enhanced_options: enhancedOptionsSchema,
});

const batchActionMigrateSchema = z.object({
  source_video_urls: z.array(urlField).min(1).max(50),
  target_person_images: z.array(urlField).min(1).max(50),
  options: z.object({}).passthrough().optional(),
  enhanced_options: enhancedOptionsSchema,
});

const viralAnalyzeSchema = z.object({
  video_url: urlField,
  platform: z.string().max(30).optional(),
});

const viralReplicateSchema = z.object({
  analysis_job_id: z.string().min(1, '请提供分析任务ID').max(50),
  product_name: z.string().min(1, '请提供商品名称').max(200),
  product_images: z.array(urlField).max(10).optional(),
  custom_prompt: z.string().max(4000).optional(),
});

const digitalHumanSchema = z.object({
  text: z.string().max(5000).optional(),
  audio_url: optUrl,
  avatar_style: z.string().max(50).optional(),
  background: z.string().max(500).optional(),
});

const smartClipSchema = z.object({
  video_url: urlField,
  duration: z.number().int().min(1).optional(),
  clip_count: z.number().int().min(1).max(50).optional(),
  style: z.string().max(50).optional(),
  clip_regions: z.array(z.object({
    start: z.number(), end: z.number(),
  })).max(50).optional(),
});

const removeRedundantSchema = z.object({
  video_url: urlField,
  threshold: z.number().min(0).max(1).optional(),
});

const optimizeAudioSchema = z.object({
  video_url: urlField,
  level: z.enum(['light', 'medium', 'strong']).optional(),
});

const subtitleFixSchema = z.object({
  video_url: urlField,
  source_language: z.string().max(10).optional(),
});

// ============================================================
// 视频生成
// ============================================================
router.post('/generate', heavyLimiter, _validate(generateSchema), tierGuard('video'), ctrl.generateVideo);
router.post('/image-to-video', heavyLimiter, _validate(imageToVideoSchema), tierGuard('video'), ctrl.imageToVideo);
router.post('/multi-image-to-video', heavyLimiter, _validate(multiImageSchema), tierGuard('video'), ctrl.multiImageToVideo);
router.post('/package', heavyLimiter, tierGuard('video'), _validate(packageSchema), ctrl.autoPackageVideo);
router.post('/replace-character', heavyLimiter, _validate(replaceCharSchema), tierGuard('video'), ctrl.replaceCharacter);
router.post('/product-ad', heavyLimiter, _validate(productAdSchema), tierGuard('video'), ctrl.productAdVideo);
router.post('/storyboard', heavyLimiter, tierGuard('video'), _validate(storyboardSchema), ctrl.generateStoryboard);

// ============================================================
// 动作迁移 (杀手功能)
// ============================================================
router.post('/action-migrate', heavyLimiter, _validate(actionMigrateSchema), tierGuard('video'), ctrl.migrateAction);
router.post('/action-migrate/batch', heavyLimiter, _validate(batchActionMigrateSchema), tierGuard('video'), ctrl.batchMigrateAction);
router.get('/action-migrate/batch/:id/progress', validate(idParamSchema, 'params'), ctrl.getBatchMigrateProgress);

// ============================================================
// 爆款视频
// ============================================================
router.post('/viral/analyze', heavyLimiter, tierGuard('video'), _validate(viralAnalyzeSchema), ctrl.analyzeViralVideo);
router.post('/viral/replicate', heavyLimiter, _validate(viralReplicateSchema), tierGuard('video'), ctrl.replicateViralVideo);

// ============================================================
// 数字人
// ============================================================
router.post('/digital-human', heavyLimiter, _validate(digitalHumanSchema), tierGuard('video'), ctrl.createDigitalHuman);

// ============================================================
// 长视频精剪
// ============================================================
router.post('/smart-clip', heavyLimiter, _validate(smartClipSchema), tierGuard('video'), ctrl.smartClipLiveVideo);
router.post('/remove-redundant', heavyLimiter, _validate(removeRedundantSchema), tierGuard('video'), ctrl.removeRedundantSegments);
router.post('/optimize-audio', heavyLimiter, _validate(optimizeAudioSchema), tierGuard('video'), ctrl.optimizeAudio);
router.post('/subtitle-fix', heavyLimiter, tierGuard('video'), _validate(subtitleFixSchema), ctrl.subtitleCorrection);

// ============================================================
// 作品管理
// ============================================================
router.get('/works', validate(worksQuerySchema, 'query'), ctrl.getVideoWorks);
router.get('/job/:id', validate(idParamSchema, 'params'), ctrl.getVideoJobStatus);

export default router;
