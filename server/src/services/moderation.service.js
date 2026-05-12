/**
 * Movio AI v4.1 — Moderation Service
 * G5 后端开发 | T-G5-005 (NEW v4.1)
 * 三通道审核: 文本(通义千问 moderation) + 图片(阿里绿网) + 视频(截图帧)
 * W1 MVP: 基础敏感词过滤, 后续接入外部API
 */
import { insertContentAuditLog } from '../dao/logDao.js';

/**
 * 文本审核
 */
export async function moderateText(text, userId, options = {}) {
  const { stage = 'input', jobId = null } = options;

  // W1 MVP: 基础敏感词过滤
  // 正式版替换为: 通义千问 content-moderation API
  const BLOCKED_PATTERNS = []; // W1 empty, prod fills from admin config

  let riskLevel = 'safe';
  const riskTags = [];
  let action = 'pass';

  for (const pattern of BLOCKED_PATTERNS) {
    if (text.includes(pattern)) {
      riskLevel = 'blocked';
      riskTags.push('sensitive_word');
      action = 'block';
      break;
    }
  }

  await insertContentAuditLog({
    userId, jobId, auditStage: stage, contentType: 'text',
    originalText: text, riskLevel, riskTags, action,
  });

  return { risk_level: riskLevel, action, risk_tags: riskTags };
}

/**
 * 图片审核 (W2 接入阿里绿网)
 */
export async function moderateImage(imageUrl, userId, options = {}) {
  const { stage = 'output', jobId = null } = options;
  await insertContentAuditLog({
    userId, jobId, auditStage: stage, contentType: 'image',
    originalText: imageUrl, riskLevel: 'safe', riskTags: [], action: 'pass',
  });
  return { risk_level: 'safe', action: 'pass' };
}

/**
 * 视频审核 (W2 接入截图帧审核流水线)
 */
export async function moderateVideo(videoUrl, userId, options = {}) {
  const { stage = 'output', jobId = null } = options;
  await insertContentAuditLog({
    userId, jobId, auditStage: stage, contentType: 'video',
    originalText: videoUrl, riskLevel: 'safe', riskTags: [], action: 'pass',
  });
  return { risk_level: 'safe', action: 'pass' };
}
