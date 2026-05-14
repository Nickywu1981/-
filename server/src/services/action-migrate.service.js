import { BusinessError } from '../utils/businessError.js';

/**
 * Movio AI v4.1 — Action Migrate Service (动作迁移 — 全球独家杀手功能)
 * G5 后端开发 | W3
 * 单人动作迁移 / 批量动作迁移
 * 增强: 换背景 / 换衣服 / 音频处理
 */
import { submitJob } from './job-queue.service.js';
import * as moderationService from './moderation.service.js';
import { findJobById, findChildJobsByBatchId } from '../dao/jobQueueDao.js';
import { ERROR_CODE } from '../constants/errorCode.js';

function buildEnhancedOptions({
  replaceBackground = false, backgroundUrl = null,
  replaceClothing = false, clothingStyle = null, clothingColor = null,
  keepOriginalAudio = false, bgmUrl = null, volume = 1.0, voiceover = null,
}) {
  const enh = {};
  if (replaceBackground) {
    enh.replace_background = replaceBackground;
    enh.background_url = backgroundUrl;
  }
  if (replaceClothing) {
    enh.replace_clothing = replaceClothing;
    if (clothingStyle) enh.clothing_style = clothingStyle;
    if (clothingColor) enh.clothing_color = clothingColor;
  }
  if (keepOriginalAudio) enh.keep_original_audio = true;
  if (bgmUrl) enh.bgm_url = bgmUrl;
  if (volume !== 1.0) enh.volume = Math.max(0, Math.min(1, volume));
  if (voiceover?.text) enh.voiceover = voiceover;
  return Object.keys(enh).length ? enh : undefined;
}

/**
 * 动作迁移 — 单人
 */
export async function migrateAction(userId, {
  sourceVideoUrl, targetPersonImage, options = {},
  replaceBackground, backgroundUrl, replaceClothing, clothingStyle, clothingColor,
  keepOriginalAudio, bgmUrl, volume, voiceover,
}) {
  // 内容审核 (视频)
  const auditResult = await moderationService.moderateVideo(sourceVideoUrl, userId, { stage: 'input' });
  if (auditResult.action === 'block') throw new BusinessError(ERROR_CODE.CONTENT_MODERATION);

  return submitJob(userId, 'action_migrate', {
    source_video_url: sourceVideoUrl,
    target_person_image: targetPersonImage,
    options,
    enhanced_options: buildEnhancedOptions({
      replaceBackground, backgroundUrl, replaceClothing, clothingStyle, clothingColor,
      keepOriginalAudio, bgmUrl, volume, voiceover,
    }),
  }, { priority: 3 });
}

/**
 * 批量动作迁移 — 全球独家
 */
export async function batchMigrateAction(userId, {
  sourceVideoUrls, targetPersonImages, options = {},
  replaceBackground, backgroundUrl, replaceClothing, clothingStyle, clothingColor,
  keepOriginalAudio, bgmUrl, volume, voiceover,
}) {
  if (!sourceVideoUrls || sourceVideoUrls.length === 0) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  if (!targetPersonImages || targetPersonImages.length === 0) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  if (sourceVideoUrls.length > 10) throw new BusinessError(ERROR_CODE.QUOTA_EXCEEDED);
  if (targetPersonImages.length > 20) throw new BusinessError(ERROR_CODE.QUOTA_EXCEEDED);

  const totalJobs = sourceVideoUrls.length * targetPersonImages.length;
  if (totalJobs > 100) throw new BusinessError(ERROR_CODE.QUOTA_EXCEEDED, `Batch limit 100, current: ${totalJobs}`);

  // 逐视频审核
  for (const url of sourceVideoUrls) {
    const auditResult = await moderationService.moderateVideo(url, userId, { stage: 'input' });
    if (auditResult.action === 'block') throw new BusinessError(ERROR_CODE.CONTENT_MODERATION);
  }

  return submitJob(userId, 'batch_action_migrate', {
    source_video_urls: sourceVideoUrls,
    target_person_images: targetPersonImages,
    options,
    total_jobs: totalJobs,
    enhanced_options: buildEnhancedOptions({
      replaceBackground, backgroundUrl, replaceClothing, clothingStyle, clothingColor,
      keepOriginalAudio, bgmUrl, volume, voiceover,
    }),
  }, { priority: 3 });
}

/**
 * 获取动作迁移任务进度 (含子任务)
 */
export async function getBatchMigrateProgress(jobId, userId) {
  const parent = await findJobById(jobId, userId);
  if (!parent) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);

  const children = await findChildJobsByBatchId(jobId);

  return {
    ...parent,
    sub_tasks: children,
    completed_count: children.filter(c => c.status === 'completed').length,
    total_count: children.length,
  };
}
