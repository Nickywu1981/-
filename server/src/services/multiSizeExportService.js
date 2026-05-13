/**
 * 多尺寸自适应导出服务 (Multi-Size Adaptive Export Service)
 *
 * 任意输入图 → N 种电商尺寸/比例一键批量导出
 * 支持: 主图(1:1) / 详情长图(750×N) / 社媒(3:4) / 头图(16:9) / 缩略图 / 自定义尺寸
 */

import { saveSimpleFile } from '../utils/file-upload.js';
import { BusinessError } from '../utils/businessError.js';
import logger from '../utils/logger.js';

// ==================== 平台尺寸预设 ====================

export const PLATFORM_SIZES = {
  // 国内电商
  taobao_main: { width: 800, height: 800, label: '淘宝主图 1:1', platform: '淘宝' },
  taobao_detail: { width: 750, height: null, label: '淘宝详情长图 750×N', platform: '淘宝' },
  taobao_banner: { width: 1920, height: 700, label: '淘宝店招', platform: '淘宝' },
  jd_main: { width: 800, height: 800, label: '京东主图 1:1', platform: '京东' },
  pdd_main: { width: 800, height: 800, label: '拼多多主图 1:1', platform: '拼多多' },
  douyin_main: { width: 800, height: 800, label: '抖音主图 1:1', platform: '抖音' },
  douyin_cover: { width: 1080, height: 1440, label: '抖音封面 3:4', platform: '抖音' },

  // 跨境电商
  amazon_main: { width: 2000, height: 2000, label: 'Amazon 主图 1:1', platform: 'Amazon' },
  amazon_vertical: { width: 1500, height: 2000, label: 'Amazon A+ 竖图', platform: 'Amazon' },
  shopee_main: { width: 800, height: 800, label: 'Shopee 主图 1:1', platform: 'Shopee' },
  shopee_cover: { width: 1200, height: 630, label: 'Shopee 商店封面', platform: 'Shopee' },

  // 社媒
  instagram_square: { width: 1080, height: 1080, label: 'Instagram 1:1', platform: 'Instagram' },
  instagram_story: { width: 1080, height: 1920, label: 'Instagram Story 9:16', platform: 'Instagram' },
  facebook_post: { width: 1200, height: 630, label: 'Facebook Post', platform: 'Facebook' },
  pinterest: { width: 1000, height: 1500, label: 'Pinterest 2:3', platform: 'Pinterest' },
  xiaohongshu: { width: 1080, height: 1440, label: '小红书 3:4', platform: '小红书' },

  // 通用
  square: { width: 1024, height: 1024, label: '通用正方形 1:1', platform: '通用' },
  wide: { width: 1920, height: 1080, label: '通用宽屏 16:9', platform: '通用' },
  vertical: { width: 1080, height: 1920, label: '通用竖屏 9:16', platform: '通用' },
  thumb: { width: 400, height: 400, label: '缩略图', platform: '通用' },
};

// ==================== 主入口 ====================

/**
 * 单图 → 多尺寸批量导出
 * @param {Object} params
 * @param {string} params.imageUrl - 输入图片URL
 * @param {Array<string>} [params.sizes] - 尺寸key列表，如 ['taobao_main','douyin_cover','instagram_square']
 * @param {Array<{width:number,height:number|null,label:string}>} [params.customSizes] - 自定义尺寸
 * @param {string} [params.format='png'] - 输出格式: png|jpeg|webp
 * @param {number} [params.quality=90] - JPEG/WebP 质量
 */
export async function exportMultiSize(params) {
  const {
    imageUrl, sizes = ['taobao_main', 'douyin_cover'],
    customSizes = [], format = 'png', quality = 90,
  } = params;

  if (!imageUrl) throw new BusinessError(400, 'imageUrl 为必填参数');

  // 下载原图
  const resp = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
  if (!resp.ok) throw new BusinessError(400, `下载图片失败: HTTP ${resp.status}`);
  const sourceBuffer = Buffer.from(await resp.arrayBuffer());

  // 合并预设 + 自定义尺寸
  const allSizes = [
    ...sizes.map((key) => ({ key, ...PLATFORM_SIZES[key] })).filter((s) => s.width),
    ...customSizes.map((s, i) => ({ key: `custom_${i}`, ...s })),
  ];

  if (!allSizes.length) throw new BusinessError(400, '至少需要一种输出尺寸');

  // 批量缩放 + 保存
  const sharp = (await import('sharp')).default;
  const results = {};

  for (const size of allSizes) {
    try {
      const resizeOpts = size.height
        ? { width: size.width, height: size.height, fit: 'cover' }
        : { width: size.width, fit: 'inside', withoutEnlargement: true };

      let pipeline = sharp(sourceBuffer).resize(resizeOpts);

      if (format === 'jpeg') pipeline = pipeline.jpeg({ quality });
      else if (format === 'webp') pipeline = pipeline.webp({ quality });
      else pipeline = pipeline.png();

      const outputBuffer = await pipeline.toBuffer();

      const fakeFile = {
        originalname: `export_${size.key}_${Date.now()}.${format}`,
        buffer: outputBuffer,
        size: outputBuffer.length,
        mimetype: `image/${format}`,
      };
      const saved = await saveSimpleFile(fakeFile);

      results[size.key] = {
        ...saved,
        label: size.label,
        platform: size.platform,
        width: size.width,
        height: size.height,
      };
    } catch (e) {
      logger.warn(`[MultiSize] 尺寸 ${size.key} 导出失败: ${e.message}`);
      results[size.key] = { error: e.message, label: size.label };
    }
  }

  return {
    sourceUrl: imageUrl,
    format,
    sizes: results,
    exportedAt: new Date().toISOString(),
  };
}

// ==================== 批量多尺寸 ====================

export async function batchExportMultiSize(imageUrls, sizeKeys) {
  if (!imageUrls?.length) throw new BusinessError(400, '至少需要一张图片');

  const all = [];
  for (const url of imageUrls) {
    try {
      const r = await exportMultiSize({ imageUrl: url, sizes: sizeKeys });
      all.push({ imageUrl: url, ...r });
    } catch (e) {
      all.push({ imageUrl: url, error: e.message });
    }
  }

  return { total: imageUrls.length, results: all };
}

export default { exportMultiSize, batchExportMultiSize, PLATFORM_SIZES };
