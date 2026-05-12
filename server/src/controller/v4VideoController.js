/**
 * Movio AI v4.1 — Video Controller
 * 视频生成 / 动作迁移 / 爆款分析 / 数字人 / 分镜 / 一键成片 / 长视频精剪
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import * as videoService from '../services/video.service.js';
import * as actionMigrateService from '../services/action-migrate.service.js';
import * as viralVideoService from '../services/viral-video.service.js';
import * as digitalHumanService from '../services/digital-human.service.js';
import * as liveClipService from '../services/live-clip.service.js';

// ============================================================
// 视频生成
// ============================================================
export const generateVideo = wrapController(async (req, res) => {
  const { prompt, duration, ratio, enhanced_prompt } = req.validated;
  const result = await videoService.generateVideo(req.user.id, { prompt, duration, ratio, enhancedPrompt: enhanced_prompt });
  return success(res, result, '视频生成任务已提交');
});

export const imageToVideo = wrapController(async (req, res) => {
  const { image_url, prompt, duration, ratio } = req.validated;
  const result = await videoService.imageToVideo(req.user.id, { imageUrl: image_url, prompt, duration, ratio });
  return success(res, result, '图生视频任务已提交');
});

export const multiImageToVideo = wrapController(async (req, res) => {
  const { images, prompt, duration, ratio, transition } = req.validated;
  const result = await videoService.multiImageToVideo(req.user.id, { images, prompt, duration, ratio, transition });
  return success(res, result, '多图合成任务已提交');
});

export const autoPackageVideo = wrapController(async (req, res) => {
  const { video_url, options } = req.validated;
  const result = await videoService.autoPackageVideo(req.user.id, { videoUrl: video_url, options });
  return success(res, result, '视频包装任务已提交');
});

export const replaceCharacter = wrapController(async (req, res) => {
  const { video_url, target_person_image } = req.validated;
  const result = await videoService.replaceCharacter(req.user.id, { videoUrl: video_url, targetPersonImage: target_person_image });
  return success(res, result, '角色替换任务已提交');
});

export const productAdVideo = wrapController(async (req, res) => {
  const { product_name, product_images, highlights, style, duration } = req.validated;
  const result = await videoService.productAdVideo(req.user.id, { productName: product_name, productImages: product_images, highlights, style, duration });
  return success(res, result, '一键成片任务已提交');
});

export const generateStoryboard = wrapController(async (req, res) => {
  const { prompt, scene_count } = req.validated;
  const result = await videoService.generateStoryboard(req.user.id, { prompt, sceneCount: scene_count || 5 });
  return success(res, result, '分镜生成任务已提交');
});

// ============================================================
// 动作迁移
// ============================================================
export const migrateAction = wrapController(async (req, res) => {
  const { source_video_url, target_person_image, options } = req.validated;
  const result = await actionMigrateService.migrateAction(req.user.id, { sourceVideoUrl: source_video_url, targetPersonImage: target_person_image, options });
  return success(res, result, '动作迁移任务已提交');
});

export const batchMigrateAction = wrapController(async (req, res) => {
  const { source_video_urls, target_person_images, options } = req.validated;
  const result = await actionMigrateService.batchMigrateAction(req.user.id, { sourceVideoUrls: source_video_urls, targetPersonImages: target_person_images, options });
  return success(res, result, `批量动作迁移已提交 (${result.total_jobs || '?'} 个子任务)`);
});

export const getBatchMigrateProgress = wrapController(async (req, res) => {
  const result = await actionMigrateService.getBatchMigrateProgress(req.params.id, req.user.id);
  return success(res, result);
});

// ============================================================
// 爆款视频
// ============================================================
export const analyzeViralVideo = wrapController(async (req, res) => {
  const { video_url, platform } = req.validated;
  const result = await viralVideoService.analyzeViralVideo(req.user.id, { videoUrl: video_url, platform });
  return success(res, result, '爆款分析任务已提交');
});

export const replicateViralVideo = wrapController(async (req, res) => {
  const { analysis_job_id, product_name, product_images, custom_prompt } = req.validated;
  const result = await viralVideoService.replicateViralVideo(req.user.id, { analysisJobId: analysis_job_id, productName: product_name, productImages: product_images, customPrompt: custom_prompt });
  return success(res, result, '爆款复刻任务已提交');
});

// ============================================================
// 数字人
// ============================================================
export const createDigitalHuman = wrapController(async (req, res) => {
  const { text, audio_url, avatar_style, background } = req.validated;
  const result = await digitalHumanService.createDigitalHuman(req.user.id, { text, audioUrl: audio_url, avatarStyle: avatar_style, background });
  return success(res, result, '数字人任务已提交');
});

// ============================================================
// 长视频精剪
// ============================================================
export const smartClipLiveVideo = wrapController(async (req, res) => {
  const { video_url, duration, clip_count, style, clip_regions } = req.validated;
  const result = clip_regions
    ? await liveClipService.smartClipWithRegions(req.user.id, { videoUrl: video_url, clipRegions: clip_regions })
    : await liveClipService.smartClipLiveVideo(req.user.id, { videoUrl: video_url, duration, clipCount: clip_count, style });
  return success(res, result, '精剪任务已提交');
});

export const removeRedundantSegments = wrapController(async (req, res) => {
  const { video_url, threshold } = req.validated;
  const result = await liveClipService.removeRedundantSegments(req.user.id, { videoUrl: video_url, threshold });
  return success(res, result, '去冗余任务已提交');
});

export const optimizeAudio = wrapController(async (req, res) => {
  const { video_url, level } = req.validated;
  const result = await liveClipService.optimizeAudio(req.user.id, { videoUrl: video_url, level });
  return success(res, result, '杂音优化任务已提交');
});

export const subtitleCorrection = wrapController(async (req, res) => {
  const { video_url, source_language } = req.validated;
  const result = await liveClipService.subtitleCorrection(req.user.id, { videoUrl: video_url, sourceLanguage: source_language });
  return success(res, result, '字幕校对任务已提交');
});

// ============================================================
// 作品管理
// ============================================================
export const getVideoWorks = wrapController(async (req, res) => {
  const result = await videoService.getVideoWorks(req.user.id, {
    page: parseInt(req.query.page, 10) || 1,
    pageSize: parseInt(req.query.pageSize, 10) || 20,
    status: req.query.status,
    taskType: req.query.task_type,
  });
  return success(res, result);
});

export const getVideoJobStatus = wrapController(async (req, res) => {
  const job = await videoService.getVideoJobStatus(req.params.id, req.user.id);
  return success(res, job);
});
