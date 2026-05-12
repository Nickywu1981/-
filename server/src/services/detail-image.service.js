import { BusinessError } from '../utils/businessError.js';

/**
 * Movio AI v4.1 — Detail Image Service
 * G5 后端开发 | W2
 * 详情图套图生成 / 详情图复刻
 */
import { submitJob } from './job-queue.service.js';
import * as moderationService from './moderation.service.js';
import db from '../dao/db.js';

/**
 * 详情图套图一键生成
 */
export async function generateDetailSet(userId, { productName, productImages, highlights, template = 'standard' }) {
  if (!productName) throw new BusinessError(400, '请提供商品名称');
  if (!productImages || productImages.length === 0) throw new BusinessError(400, '请提供至少一张商品图');

  const auditResult = await moderationService.moderateText(productName, userId, { stage: 'input' });
  if (auditResult.action === 'block') {
    throw new BusinessError(422, '内容包含违规信息');
  }

  return submitJob(userId, 'detail_set_gen', {
    product_name: productName,
    product_images: productImages,
    highlights: highlights || [],
    template,
  }, { priority: 5 });
}

/**
 * 详情图复刻
 */
export async function replicateDetail(userId, { referenceUrl, productName, productImages, template = 'standard' }) {
  return submitJob(userId, 'detail_replicate', {
    reference_url: referenceUrl,
    product_name: productName,
    product_images: productImages,
    template,
  }, { priority: 5 });
}

/**
 * 电商详情长图合成
 * @param {Object} params
 * @param {string} params.productName - 商品名称
 * @param {Array<{prompt: string, imageUrl?: string}>} params.scenes - 场景列表 (1-20)
 * @param {string} [params.platform] - 目标平台
 * @param {string} [params.style] - 风格
 * @param {number} [params.width] - 输出宽度
 */
export async function generateLongImage(userId, { productName, scenes, platform, style, width = 750 }) {
  if (!productName) throw new BusinessError(400, '请提供商品名称');
  if (!scenes || scenes.length === 0) throw new BusinessError(400, '至少1个场景');
  if (scenes.length > 20) throw new BusinessError(400, '最多20个场景');

  const auditResult = await moderationService.moderateText(productName, userId, { stage: 'input' });
  if (auditResult.action === 'block') {
    throw new BusinessError(422, '内容包含违规信息');
  }

  return submitJob(userId, 'detail_long_image', {
    product_name: productName,
    scenes: scenes.map(s => ({ prompt: s.prompt || '', image_url: s.imageUrl || null })),
    platform,
    style,
    width,
  }, { priority: 6 });
}

/**
 * 详情图作品查询
 */
export async function getDetailWorks(userId, { page = 1, pageSize = 20 } = {}) {
  const conn = await db.getConnection();
  try {
    const [countRows] = await conn.query(
      "SELECT COUNT(*) as total FROM job_queue WHERE user_id = ? AND task_type IN ('detail_set_gen','detail_replicate','detail_long_image')",
      [userId],
    );
    const total = countRows[0].total;

    const [rows] = await conn.query(
      `SELECT id, task_type, status, progress, result_data, created_at, completed_at
       FROM job_queue WHERE user_id = ? AND task_type IN ('detail_set_gen','detail_replicate','detail_long_image')
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [userId, pageSize, (page - 1) * pageSize],
    );

    return { list: rows, total, page, pageSize };
  } finally {
    conn.release();
  }
}
