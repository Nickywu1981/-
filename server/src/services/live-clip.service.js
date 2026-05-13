import { BusinessError } from '../utils/businessError.js';

/**
 * Movio AI v4.1 — Live Clip Service (长视频录播智能精剪)
 * G5 后端开发 | W3
 * 长视频智能精剪 / 多余片段删减 / 人声杂音优化 / 自动字幕校对
 */
import { submitJob } from './job-queue.service.js';
import { ERROR_CODE } from '../constants/errorCode.js';

/**
 * 长视频智能精剪 — 自动识别高光片段
 */
export async function smartClipLiveVideo(userId, { videoUrl, duration = 60, clipCount = 3, style = 'fast' }) {
  return submitJob(userId, 'live_clip', {
    video_url: videoUrl,
    target_duration: duration,
    clip_count: clipCount,
    style,
    clip_regions: null, // AI 自动检测; 用户可选传 [{start, end}]
  });
}

/**
 * 长视频智能精剪 — 手动指定剪切点
 */
export async function smartClipWithRegions(userId, { videoUrl, clipRegions }) {
  if (!clipRegions || clipRegions.length === 0) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  return submitJob(userId, 'live_clip', {
    video_url: videoUrl,
    clip_regions: clipRegions, // [{ start: 125.0, end: 180.0 }, ...]
    style: 'manual',
  });
}

/**
 * 录播多余片段删减 (静音段/重复段)
 */
export async function removeRedundantSegments(userId, { videoUrl, threshold = 0.8 }) {
  return submitJob(userId, 'live_cut', {
    video_url: videoUrl,
    similarity_threshold: threshold,
  });
}

/**
 * 人声杂音优化
 */
export async function optimizeAudio(userId, { videoUrl, level = 'standard' }) {
  return submitJob(userId, 'live_noise_fix', {
    video_url: videoUrl,
    optimization_level: level, // light | standard | aggressive
  });
}

/**
 * 长视频自动字幕校对
 */
export async function subtitleCorrection(userId, { videoUrl, sourceLanguage = 'zh' }) {
  return submitJob(userId, 'live_subtitle_fix', {
    video_url: videoUrl,
    source_language: sourceLanguage,
  });
}
