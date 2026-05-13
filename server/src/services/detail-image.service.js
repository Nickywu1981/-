import { BusinessError } from '../utils/businessError.js';

/**
 * Movio AI v4.1 — Detail Image Service
 * G5 后端开发 | W2
 * 详情图套图生成 / 详情图复刻 / 长图合成 / 商品信息提取
 */
import { submitJob } from './job-queue.service.js';
import * as moderationService from './moderation.service.js';
import db from '../dao/db.js';
import { gatewayInfer } from '../gateway/aiGatewayHub.js';
import logger from '../utils/logger.js';
import { ERROR_CODE } from '../constants/errorCode.js';

/**
 * 从参考图提取商品信息（AI视觉分析）
 * 返回商品名称、品类、核心特征清单
 */
export async function extractProductInfo(userId, { imageUrl }) {
  if (!imageUrl) throw new BusinessError(ERROR_CODE.PARAM_MISSING);

  const prompt = `Analyze this product image and return a JSON object with the following fields (respond in Chinese):
{
  "productName": "商品名称（简洁准确，5-15字）",
  "category": "商品品类（如：女装/男装/鞋靴/箱包/美妆/3C数码/家居/食品/运动户外/母婴）",
  "features": ["核心特征1（严格基于图中可见内容）", "核心特征2", "核心特征3", "核心特征4", "核心特征5"]
}

Rules:
- features must be strictly based on visible content in the image, no fabrication
- Each feature should be short (5-15 characters), describing material/design/function
- Return 3-6 features depending on how much is visible
- productName and category should be specific, not generic
- Return ONLY valid JSON, no markdown wrapping`;

  try {
    const result = await gatewayInfer('gpt-image-2', prompt, {
      userId,
      images: [imageUrl],
      temperature: 0.3,
      maxTokens: 800,
    });

    const text = result?.text || result?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('[extractProductInfo] AI response not valid JSON:', text.slice(0, 200));
      throw new BusinessError(ERROR_CODE.INTERNAL_ERROR);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.productName || !parsed.features?.length) {
      throw new BusinessError(ERROR_CODE.INTERNAL_ERROR);
    }

    return {
      productName: parsed.productName,
      category: parsed.category || '其他',
      features: parsed.features.slice(0, 8),
    };
  } catch (err) {
    if (err instanceof BusinessError) throw err;
    logger.error('[extractProductInfo] failed:', err.message);
    throw new BusinessError(ERROR_CODE.INTERNAL_ERROR);
  }
}

/**
 * 详情图套图一键生成
 */
export async function generateDetailSet(userId, { productName, productImages, highlights, template = 'standard' }) {
  if (!productName) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  if (!productImages || productImages.length === 0) throw new BusinessError(ERROR_CODE.PARAM_MISSING);

  const auditResult = await moderationService.moderateText(productName, userId, { stage: 'input' });
  if (auditResult.action === 'block') {
    throw new BusinessError(ERROR_CODE.CONTENT_MODERATION);
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
  if (!productName) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  if (!scenes || scenes.length === 0) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  if (scenes.length > 20) throw new BusinessError(ERROR_CODE.QUOTA_EXCEEDED);

  const auditResult = await moderationService.moderateText(productName, userId, { stage: 'input' });
  if (auditResult.action === 'block') {
    throw new BusinessError(ERROR_CODE.CONTENT_MODERATION);
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
