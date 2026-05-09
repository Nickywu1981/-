import { BusinessError } from '../utils/businessError.js';

/**
 * Movio AI v4.1 — Video Translation Service
 * G5 后端开发 | Phase 2
 * 视频语音翻译 / 视频字幕翻译 / 视频面容翻译
 */
import { submitJob } from './job-queue.service.js';
import * as moderationService from './moderation.service.js';
import videoTranslateDao from '../dao/videoTranslateDao.js';

/**
 * 视频语音翻译 (语音翻译成其他语言配音)
 */
export async function translateVoice(userId, {
  videoUrl,
  sourceLang = 'zh',
  targetLang = 'en',
  voiceType = 'natural',
}) {
  const audit = await moderationService.moderateText(
    `voice_translate:${sourceLang}→${targetLang}`, userId, { stage: 'input' },
  );
  if (audit.action === 'block') {
    throw new BusinessError(422, '翻译请求包含违规参数');
  }

  return submitJob(userId, 'video_voice_translate', {
    video_url: videoUrl,
    source_lang: sourceLang,
    target_lang: targetLang,
    voice_type: voiceType,
  }, { priority: 5 });
}

/**
 * 视频字幕翻译
 */
export async function translateSubtitles(userId, {
  videoUrl,
  sourceLang = 'zh',
  targetLang = 'en',
  subtitleStyle = 'default',
}) {
  return submitJob(userId, 'video_subtitle_translate', {
    video_url: videoUrl,
    source_lang: sourceLang,
    target_lang: targetLang,
    subtitle_style: subtitleStyle,
  }, { priority: 5 });
}

/**
 * 视频面容翻译 (口型同步/数字人重新配音)
 */
export async function translateFace(userId, {
  videoUrl,
  sourceLang = 'zh',
  targetLang = 'en',
  avatarStyle = 'original',
}) {
  const audit = await moderationService.moderateText(
    `face_translate:${sourceLang}→${targetLang}`, userId, { stage: 'input' },
  );
  if (audit.action === 'block') {
    throw new BusinessError(422, '面容翻译请求包含违规参数');
  }

  return submitJob(userId, 'video_face_translate', {
    video_url: videoUrl,
    source_lang: sourceLang,
    target_lang: targetLang,
    avatar_style: avatarStyle,
  }, { priority: 5 });
}

/**
 * 获取用户翻译历史
 */
export async function getUserTranslateHistory(userId, { type, page = 1, limit = 20 } = {}) {
  return videoTranslateDao.findByUser(userId, { taskType: type || null, page, limit });
}

// 支持的语言列表
export const SUPPORTED_LANGS = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية' },
  { code: 'th', label: 'ไทย' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'id', label: 'Bahasa Indonesia' },
];
