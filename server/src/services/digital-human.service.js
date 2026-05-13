import { BusinessError } from '../utils/businessError.js';

/**
 * Movio AI v4.1 — Digital Human Service (口播数字人)
 * G5 后端开发 | W3
 */
import { submitJob } from './job-queue.service.js';
import * as moderationService from './moderation.service.js';
import { ERROR_CODE } from '../constants/errorCode.js';

/**
 * 口播数字人 — 文本/音频驱动
 */
export async function createDigitalHuman(userId, { text, audioUrl, avatarStyle = 'realistic', background = 'studio' }) {
  if (!text && !audioUrl) throw new BusinessError(ERROR_CODE.PARAM_MISSING);

  if (text) {
    const auditResult = await moderationService.moderateText(text, userId, { stage: 'input' });
    if (auditResult.action === 'block') throw new BusinessError(ERROR_CODE.CONTENT_MODERATION);
  }

  return submitJob(userId, 'digital_human', {
    text,
    audio_url: audioUrl,
    avatar_style: avatarStyle,
    background,
  }, { priority: 4 });
}
