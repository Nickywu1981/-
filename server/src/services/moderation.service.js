/**
 * Movio AI v4.1 — Moderation Service
 * G5 后端开发 | T-G5-005 (NEW v4.1)
 * 三通道审核: 文本(通义千问 moderation) + 图片(阿里绿网) + 视频(截图帧)
 * W1 MVP: 基础敏感词过滤, 后续接入外部API
 */
import db from '../dao/db.js';

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

  // 写入审核日志
  const conn = await db.getConnection();
  try {
    await conn.query(
      `INSERT INTO content_audit_log (user_id, job_id, audit_stage, content_type, original_text, risk_level, risk_tags, action)
       VALUES (?, ?, ?, 'text', ?, ?, ?, ?)`,
      [userId, jobId, stage, text.substring(0, 2000), riskLevel, JSON.stringify(riskTags), action],
    );
  } finally {
    conn.release();
  }

  return { risk_level: riskLevel, action, risk_tags: riskTags };
}

/**
 * 图片审核 (W2 接入阿里绿网)
 */
export async function moderateImage(imageUrl, userId, options = {}) {
  const { stage = 'output', jobId = null } = options;
  // W2: 调用阿里云绿网 API
  // W1: 默认通过，记录日志
  const conn = await db.getConnection();
  try {
    await conn.query(
      `INSERT INTO content_audit_log (user_id, job_id, audit_stage, content_type, original_text, risk_level, action)
       VALUES (?, ?, ?, 'image', ?, 'safe', 'pass')`,
      [userId, jobId, stage, imageUrl],
    );
  } finally {
    conn.release();
  }

  return { risk_level: 'safe', action: 'pass' };
}

/**
 * 视频审核 (W2 接入截图帧审核流水线)
 */
export async function moderateVideo(videoUrl, userId, options = {}) {
  const { stage = 'output', jobId = null } = options;
  // W2: 截图帧 + moderateImage 流水线
  // W1: 默认通过
  const conn = await db.getConnection();
  try {
    await conn.query(
      `INSERT INTO content_audit_log (user_id, job_id, audit_stage, content_type, original_text, risk_level, action)
       VALUES (?, ?, ?, 'video', ?, 'safe', 'pass')`,
      [userId, jobId, stage, videoUrl],
    );
  } finally {
    conn.release();
  }

  return { risk_level: 'safe', action: 'pass' };
}
