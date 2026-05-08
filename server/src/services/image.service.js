import { BusinessError } from '../utils/businessError.js';

/**
 * Movio AI v4.1 — Image Service
 * G5 后端开发 | W2
 * 图像生成 / 主图复刻 / 批量生图 / 批量改图 / 批量替换
 * 通过模型调度中台调用通义万象
 */
import { routeModel } from './model-router.service.js';
import { submitJob } from './job-queue.service.js';
import * as moderationService from './moderation.service.js';
import db from '../dao/db.js';

/**
 * 图像生成 (入口: 提交异步任务)
 */
export async function generateImage(userId, { prompt, ratio = '1:1', style = 'realistic', enhancedPrompt }) {
  const finalPrompt = enhancedPrompt || prompt;

  // 内容审核 (输入)
  const auditResult = await moderationService.moderateText(finalPrompt, userId, { stage: 'input' });
  if (auditResult.action === 'block') {
    throw new BusinessError(422, '提示词包含违规内容，请修改后重试');
  }

  // 提交异步任务
  return submitJob(userId, 'image_gen', {
    prompt: finalPrompt,
    ratio,
    style,
    original_prompt: prompt,
  }, { priority: 5 });
}

/**
 * 电商主图复刻
 */
export async function replicateMainImage(userId, { referenceImageUrl, productName, style = 'realistic', ratio = '1:1' }) {
  // 内容审核
  const auditResult = await moderationService.moderateText(productName, userId, { stage: 'input' });
  if (auditResult.action === 'block') {
    throw new BusinessError(422, '内容包含违规信息');
  }

  return submitJob(userId, 'image_replicate', {
    reference_url: referenceImageUrl,
    product_name: productName,
    style,
    ratio,
  }, { priority: 5 });
}

/**
 * 批量生图
 */
export async function batchGenerateImage(userId, { prompts, ratio = '1:1', style = 'realistic' }) {
  if (!prompts || prompts.length === 0) throw new BusinessError(400, '请提供至少一个提示词');
  if (prompts.length > 50) throw new BusinessError(400, '单次批量最多50个');

  // 逐条审核
  for (const p of prompts) {
    const auditResult = await moderationService.moderateText(p, userId, { stage: 'input' });
    if (auditResult.action === 'block') {
      throw new BusinessError(422, `提示词"${p.substring(0, 20)}..."包含违规内容`);
    }
  }

  return submitJob(userId, 'batch_image_gen', {
    prompts,
    ratio,
    style,
    count: prompts.length,
  }, { priority: 4 });
}

/**
 * 批量改图
 */
export async function batchEditImage(userId, { images, operations }) {
  if (!images || images.length === 0) throw new BusinessError(400, '请提供至少一张图片');
  if (images.length > 30) throw new BusinessError(400, '单次批量最多30张');

  return submitJob(userId, 'batch_image_edit', {
    images,           // [{ url, ... }]
    operations,       // [{ type: 'resize'|'crop'|'recolor'|'remove_bg', params: {...} }]
    count: images.length,
  }, { priority: 4 });
}

/**
 * 批量图片替换 (如换背景/换场景)
 */
export async function batchReplaceImage(userId, { images, newBackground, newScene }) {
  if (!images || images.length === 0) throw new BusinessError(400, '请提供至少一张图片');
  if (images.length > 30) throw new BusinessError(400, '单次批量最多30张');

  return submitJob(userId, 'batch_image_replace', {
    images,
    new_background: newBackground,
    new_scene: newScene,
    count: images.length,
  }, { priority: 4 });
}

/**
 * 图片作品查询
 */
export async function getImageWorks(userId, { page = 1, pageSize = 20, status } = {}) {
  const conn = await db.getConnection();
  try {
    let where = "WHERE user_id = ? AND task_type IN ('image_gen','image_replicate','batch_image_gen','batch_image_edit','batch_image_replace')";
    const params = [userId];

    if (status) { where += ' AND status = ?'; params.push(status); }

    const [countRows] = await conn.query(`SELECT COUNT(*) as total FROM job_queue ${where}`, params);
    const total = countRows[0].total;

    const [rows] = await conn.query(
      `SELECT id, task_type, status, progress, result_data, error_message, created_at, completed_at
       FROM job_queue ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize],
    );

    return { list: rows, total, page, pageSize };
  } finally {
    conn.release();
  }
}
