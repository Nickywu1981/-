/**
 * Movio AI v4.1 — Video Routes
 * G5 后端开发 | W3
 * 视频生成 / 动作迁移 / 爆款分析 / 数字人 / 分镜 / 一键成片 / 长视频精剪
 */
import { Router } from 'express';
import { z } from 'zod';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { tierGuard } from '../middleware/tierGuard.js';
import * as videoService from '../services/video.service.js';
import * as actionMigrateService from '../services/action-migrate.service.js';
import * as viralVideoService from '../services/viral-video.service.js';
import * as digitalHumanService from '../services/digital-human.service.js';
import * as liveClipService from '../services/live-clip.service.js';
import * as _promptEnhance from '../services/prompt-enhance.service.js';

const router = Router();

function _validate(schema) {
  return (req, res, next) => {
    const r = schema.safeParse(req.body);
    if (!r.success) {
      return error(res, ERROR_CODE.VALIDATION_ERROR, r.error.errors.map(e => e.message).join('; '));
    }
    req.validated = r.data;
    next();
  };
}

const urlField = z.string().url('URL格式不正确');
const optUrl = z.string().url().optional();

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

const actionMigrateSchema = z.object({
  source_video_url: urlField,
  target_person_image: urlField,
  options: z.object({}).passthrough().optional(),
});

const batchActionMigrateSchema = z.object({
  source_video_urls: z.array(urlField).min(1).max(50),
  target_person_images: z.array(urlField).min(1).max(50),
  options: z.object({}).passthrough().optional(),
});

const viralAnalyzeSchema = z.object({
  video_url: urlField,
  platform: z.string().max(30).optional(),
});

const viralReplicateSchema = z.object({
  analysis_job_id: z.string().min(1, '请提供分析任务ID'),
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
router.post('/generate', _validate(generateSchema), tierGuard('video'), async (req, res) => {
  try {
    const { prompt, duration, ratio, enhanced_prompt } = req.validated;
    const result = await videoService.generateVideo(req.user.id, { prompt, duration, ratio, enhancedPrompt: enhanced_prompt });
    return success(res, result, '视频生成任务已提交');
  } catch (err) { return error(res, err.status || 500, err.message, err.status || 500); }
});

router.post('/image-to-video', _validate(imageToVideoSchema), tierGuard('video'), async (req, res) => {
  try {
    const { image_url, prompt, duration, ratio } = req.validated;
    const result = await videoService.imageToVideo(req.user.id, { imageUrl: image_url, prompt, duration, ratio });
    return success(res, result, '图生视频任务已提交');
  } catch (err) { return error(res, err.status || 500, err.message, err.status || 500); }
});

router.post('/multi-image-to-video', _validate(multiImageSchema), tierGuard('video'), async (req, res) => {
  try {
    const { images, prompt, duration, ratio, transition } = req.validated;
    const result = await videoService.multiImageToVideo(req.user.id, { images, prompt, duration, ratio, transition });
    return success(res, result, '多图合成任务已提交');
  } catch (err) { return error(res, err.status || 500, err.message, err.status || 500); }
});

router.post('/package', _validate(packageSchema), async (req, res) => {
  try {
    const { video_url, options } = req.validated;
    const result = await videoService.autoPackageVideo(req.user.id, { videoUrl: video_url, options });
    return success(res, result, '视频包装任务已提交');
  } catch (err) { return error(res, err.status || 500, err.message, err.status || 500); }
});

router.post('/replace-character', _validate(replaceCharSchema), tierGuard('video'), async (req, res) => {
  try {
    const { video_url, target_person_image } = req.validated;
    const result = await videoService.replaceCharacter(req.user.id, { videoUrl: video_url, targetPersonImage: target_person_image });
    return success(res, result, '角色替换任务已提交');
  } catch (err) { return error(res, err.status || 500, err.message, err.status || 500); }
});

router.post('/product-ad', _validate(productAdSchema), tierGuard('video'), async (req, res) => {
  try {
    const { product_name, product_images, highlights, style, duration } = req.validated;
    const result = await videoService.productAdVideo(req.user.id, { productName: product_name, productImages: product_images, highlights, style, duration });
    return success(res, result, '一键成片任务已提交');
  } catch (err) { return error(res, err.status || 500, err.message, err.status || 500); }
});

router.post('/storyboard', _validate(storyboardSchema), async (req, res) => {
  try {
    const { prompt, scene_count } = req.validated;
    const result = await videoService.generateStoryboard(req.user.id, { prompt, sceneCount: scene_count || 5 });
    return success(res, result, '分镜生成任务已提交');
  } catch (err) { return error(res, err.status || 500, err.message, err.status || 500); }
});

// ============================================================
// 动作迁移 (杀手功能)
// ============================================================
router.post('/action-migrate', _validate(actionMigrateSchema), tierGuard('video'), async (req, res) => {
  try {
    const { source_video_url, target_person_image, options } = req.validated;
    const result = await actionMigrateService.migrateAction(req.user.id, { sourceVideoUrl: source_video_url, targetPersonImage: target_person_image, options });
    return success(res, result, '动作迁移任务已提交');
  } catch (err) { return error(res, err.status || 500, err.message, err.status || 500); }
});

router.post('/action-migrate/batch', _validate(batchActionMigrateSchema), tierGuard('video'), async (req, res) => {
  try {
    const { source_video_urls, target_person_images, options } = req.validated;
    const result = await actionMigrateService.batchMigrateAction(req.user.id, { sourceVideoUrls: source_video_urls, targetPersonImages: target_person_images, options });
    return success(res, result, `批量动作迁移已提交 (${result.total_jobs || '?'} 个子任务)`);
  } catch (err) { return error(res, err.status || 500, err.message, err.status || 500); }
});

router.get('/action-migrate/batch/:id/progress', async (req, res) => {
  try {
    const result = await actionMigrateService.getBatchMigrateProgress(req.params.id, req.user.id);
    return success(res, result);
  } catch (err) { return error(res, err.status || 500, err.message, err.status || 500); }
});

// ============================================================
// 爆款视频
// ============================================================
router.post('/viral/analyze', _validate(viralAnalyzeSchema), async (req, res) => {
  try {
    const { video_url, platform } = req.validated;
    const result = await viralVideoService.analyzeViralVideo(req.user.id, { videoUrl: video_url, platform });
    return success(res, result, '爆款分析任务已提交');
  } catch (err) { return error(res, err.status || 500, err.message, err.status || 500); }
});

router.post('/viral/replicate', _validate(viralReplicateSchema), tierGuard('video'), async (req, res) => {
  try {
    const { analysis_job_id, product_name, product_images, custom_prompt } = req.validated;
    const result = await viralVideoService.replicateViralVideo(req.user.id, { analysisJobId: analysis_job_id, productName: product_name, productImages: product_images, customPrompt: custom_prompt });
    return success(res, result, '爆款复刻任务已提交');
  } catch (err) { return error(res, err.status || 500, err.message, err.status || 500); }
});

// ============================================================
// 数字人
// ============================================================
router.post('/digital-human', _validate(digitalHumanSchema), tierGuard('video'), async (req, res) => {
  try {
    const { text, audio_url, avatar_style, background } = req.validated;
    const result = await digitalHumanService.createDigitalHuman(req.user.id, { text, audioUrl: audio_url, avatarStyle: avatar_style, background });
    return success(res, result, '数字人任务已提交');
  } catch (err) { return error(res, err.status || 500, err.message, err.status || 500); }
});

// ============================================================
// 长视频精剪
// ============================================================
router.post('/smart-clip', _validate(smartClipSchema), tierGuard('video'), async (req, res) => {
  try {
    const { video_url, duration, clip_count, style, clip_regions } = req.validated;

    const result = clip_regions
      ? await liveClipService.smartClipWithRegions(req.user.id, { videoUrl: video_url, clipRegions: clip_regions })
      : await liveClipService.smartClipLiveVideo(req.user.id, { videoUrl: video_url, duration, clipCount: clip_count, style });
    return success(res, result, '精剪任务已提交');
  } catch (err) { return error(res, err.status || 500, err.message, err.status || 500); }
});

router.post('/remove-redundant', _validate(removeRedundantSchema), tierGuard('video'), async (req, res) => {
  try {
    const { video_url, threshold } = req.validated;
    const result = await liveClipService.removeRedundantSegments(req.user.id, { videoUrl: video_url, threshold });
    return success(res, result, '去冗余任务已提交');
  } catch (err) { return error(res, err.status || 500, err.message, err.status || 500); }
});

router.post('/optimize-audio', _validate(optimizeAudioSchema), tierGuard('video'), async (req, res) => {
  try {
    const { video_url, level } = req.validated;
    const result = await liveClipService.optimizeAudio(req.user.id, { videoUrl: video_url, level });
    return success(res, result, '杂音优化任务已提交');
  } catch (err) { return error(res, err.status || 500, err.message, err.status || 500); }
});

router.post('/subtitle-fix', _validate(subtitleFixSchema), async (req, res) => {
  try {
    const { video_url, source_language } = req.validated;
    const result = await liveClipService.subtitleCorrection(req.user.id, { videoUrl: video_url, sourceLanguage: source_language });
    return success(res, result, '字幕校对任务已提交');
  } catch (err) { return error(res, err.status || 500, err.message, err.status || 500); }
});

// ============================================================
// 作品管理
// ============================================================
router.get('/works', async (req, res) => {
  try {
    const result = await videoService.getVideoWorks(req.user.id, {
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 20,
      status: req.query.status,
      taskType: req.query.task_type,
    });
    return success(res, result);
  } catch (err) { return error(res, 500, err.message); }
});

router.get('/job/:id', async (req, res) => {
  try {
    const job = await videoService.getVideoJobStatus(req.params.id, req.user.id);
    return success(res, job);
  } catch (err) { return error(res, err.status || 500, err.message, err.status || 500); }
});

export default router;
