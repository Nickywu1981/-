/**
 * Movio AI v4.2 — Moderation Service (双通道增强版)
 *
 * 三通道审核: 文本(自建AC自动机 + 阿里云绿网) + 图片(阿里绿网) + 视频(截图帧)
 * 审核结果分级: pass / review / block
 */
import { checkText } from './sensitiveWordService.js';
import { dualChannelCheck } from './aliyunGreenService.js';
import { insertContentAuditLog } from '../dao/logDao.js';
import logger from '../utils/logger.js';

/**
 * 文本审核 — 双通道（自建词库 + 阿里云绿网）
 */
export async function moderateText(text, userId, options = {}) {
  const { stage = 'input', jobId = null } = options;

  if (!text || typeof text !== 'string') {
    return { risk_level: 'safe', action: 'pass', risk_tags: [] };
  }

  const truncated = text.slice(0, 10000);

  // 通道1: 自建 AC 自动机
  const selfResult = await checkText(truncated);

  // 通道2: 阿里云绿网（自建已拦截则跳过）
  const dualResult = await dualChannelCheck(truncated, selfResult);

  const riskTags = dualResult.violations.map(v => v.source === 'aliyun_green' ? v.label : v.word);

  await insertContentAuditLog({
    userId, jobId, auditStage: stage, contentType: 'text',
    originalText: truncated.slice(0, 1000),
    riskLevel: dualResult.riskLevel,
    riskTags,
    action: dualResult.action,
  });

  logger.info(`[Moderation] 文本审核: stage=${stage}, action=${dualResult.action}, violations=${dualResult.violations.length}`);

  return {
    risk_level: dualResult.riskLevel,
    action: dualResult.action,
    risk_tags: riskTags,
    violations: dualResult.violations,
  };
}

/**
 * 图片审核 — 阿里云绿网 imageScan
 */
export async function moderateImage(imageUrl, userId, options = {}) {
  const { stage = 'output', jobId = null } = options;

  // TODO: W2 接入阿里云绿网图片检测
  await insertContentAuditLog({
    userId, jobId, auditStage: stage, contentType: 'image',
    originalText: imageUrl, riskLevel: 'safe', riskTags: [], action: 'pass',
  });
  return { risk_level: 'safe', action: 'pass' };
}

/**
 * 视频审核 — 阿里云绿网 videoScan
 */
export async function moderateVideo(videoUrl, userId, options = {}) {
  const { stage = 'output', jobId = null } = options;

  // TODO: W2 接入阿里云绿网视频检测（截图帧审核流水线）
  await insertContentAuditLog({
    userId, jobId, auditStage: stage, contentType: 'video',
    originalText: videoUrl, riskLevel: 'safe', riskTags: [], action: 'pass',
  });
  return { risk_level: 'safe', action: 'pass' };
}
