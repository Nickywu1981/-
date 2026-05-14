import { BusinessError } from '../utils/businessError.js';

/**
 * Movio AI v4.1 — Video Service
 * G5 后端开发 | W3
 * 视频生成 / 单图生视频 / 多图合成视频 / 视频自动包装 / 角色替换 / 任务进度查询 / 作品管理
 */
import { submitJob } from './job-queue.service.js';
import * as moderationService from './moderation.service.js';
import { findJobById, findUserJobsByTypes } from '../dao/jobQueueDao.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ============================================================
// 视频生成
// ============================================================
export async function generateVideo(userId, { prompt, duration = 15, ratio = '9:16', enhancedPrompt }) {
  const finalPrompt = enhancedPrompt || prompt;

  const auditResult = await moderationService.moderateText(finalPrompt, userId, { stage: 'input' });
  if (auditResult.action === 'block') {
    throw new BusinessError(ERROR_CODE.CONTENT_MODERATION);
  }

  return submitJob(userId, 'video_gen', {
    prompt: finalPrompt,
    duration,
    ratio,
    original_prompt: prompt,
  });
}

// ============================================================
// 单图生视频
// ============================================================
export async function imageToVideo(userId, { imageUrl, prompt, duration = 15, ratio = '9:16' }) {
  const auditResult = await moderationService.moderateText(prompt || '', userId, { stage: 'input' });
  if (auditResult.action === 'block') throw new BusinessError(ERROR_CODE.CONTENT_MODERATION);

  return submitJob(userId, 'image_to_video', {
    image_url: imageUrl,
    prompt: prompt || 'smooth camera movement, cinematic lighting',
    duration,
    ratio,
  });
}

// ============================================================
// 多图合成视频
// ============================================================
export async function multiImageToVideo(userId, { images, prompt, duration = 30, ratio = '9:16', transition = 'fade' }) {
  if (!images || images.length < 2) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  if (images.length > 20) throw new BusinessError(ERROR_CODE.QUOTA_EXCEEDED);

  return submitJob(userId, 'multi_image_to_video', {
    images,           // [{ url }]
    prompt,
    duration,
    ratio,
    transition,       // fade | slide | zoom | none
  });
}

// ============================================================
// 视频自动包装 (字幕/配乐/贴纸/Logo/比例适配)
// ============================================================
export async function autoPackageVideo(userId, { videoUrl, options = {} }) {
  const {
    addSubtitles = true,    // 自动字幕
    addBgm = false,         // 背景音乐
    addStickers = false,    // 贴纸
    addLogo = false,        // 水印Logo
    targetRatio = null,     // 目标比例 (如 9:16 → 16:9 适配)
  } = options;

  return submitJob(userId, 'video_package', {
    video_url: videoUrl,
    add_subtitles: addSubtitles,
    add_bgm: addBgm,
    add_stickers: addStickers,
    add_logo: addLogo,
    target_ratio: targetRatio,
  });
}

// ============================================================
// 角色人物替换
// ============================================================
export async function replaceCharacter(userId, { videoUrl, targetPersonImage }) {
  return submitJob(userId, 'character_replace', {
    video_url: videoUrl,
    target_person_image: targetPersonImage,
  });
}

// ============================================================
// 商品广告一键成片
// ============================================================
export async function productAdVideo(userId, { productName, productImages, highlights, style = 'fast', duration = 30 }) {
  return submitJob(userId, 'product_ad_video', {
    product_name: productName,
    product_images: productImages,
    highlights: highlights || [],
    style,
    duration,
  });
}

// ============================================================
// 视频分镜生成器
// ============================================================
export async function generateStoryboard(userId, { prompt, sceneCount = 5 }) {
  const auditResult = await moderationService.moderateText(prompt, userId, { stage: 'input' });
  if (auditResult.action === 'block') throw new BusinessError(ERROR_CODE.CONTENT_MODERATION);

  return submitJob(userId, 'storyboard_gen', {
    prompt,
    scene_count: sceneCount,
  });
}

// ============================================================
// 视频任务进度查询
// ============================================================
export async function getVideoJobStatus(jobId, userId) {
  const job = await findJobById(jobId, userId);
  if (!job) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return job;
}

// ============================================================
// 视频作品管理
// ============================================================
const VIDEO_TASK_TYPES = [
  'video_gen', 'image_to_video', 'multi_image_to_video', 'video_package',
  'character_replace', 'action_migrate', 'batch_action_migrate',
  'digital_human', 'storyboard_gen', 'product_ad_video',
  'live_clip', 'live_cut', 'live_noise_fix', 'live_subtitle_fix',
  'viral_analysis', 'viral_replicate',
];

export async function getVideoWorks(userId, { page = 1, pageSize = 20, status, taskType } = {}) {
  return findUserJobsByTypes(userId, taskType ? [taskType] : VIDEO_TASK_TYPES, { status, page, pageSize });
}
