/**
 * 详情长图编排管线 (Detail Long Image Pipeline)
 *
 * 电商核心管线：商品主图 → 白底图 → 多场景图 → 长图拼接 → 多尺寸导出
 *
 * 阶段:
 *   1. 主图预处理（抠图/白底/精修）
 *   2. 多场景图批量生成（咖啡厅/卧室/户外/办公等）
 *   3. Sharp 垂直拼接为详情长图（750×N）
 *   4. 多尺寸自适应导出（1:1 主图 / 3:4 社媒 / 16:9 头图）
 */

import { pipeline } from './aiEngine.js';
import { jobQueueService } from './job-queue.service.js';
import { saveSimpleFile } from '../utils/file-upload.js';
import { BusinessError } from '../../utils/businessError.js';
import logger from '../utils/logger.js';

// ==================== 场景模板库 ====================

const SCENE_TEMPLATES = {
  fashion: [
    { name: '都市街拍', prompt: 'professional fashion photography, model wearing the product, urban street background, natural lighting, high-end commercial photography, 8k detail' },
    { name: '咖啡厅', prompt: 'product displayed in a cozy modern cafe, warm ambient lighting, lifestyle photography, depth of field, commercial quality' },
    { name: '工作室', prompt: 'studio photography, clean white background, professional product shot, soft studio lighting, e-commerce standard, ultra detailed' },
  ],
  home: [
    { name: '客厅', prompt: 'product in a modern living room setting, natural window light, interior design photography, warm tones, high resolution' },
    { name: '卧室', prompt: 'product in a cozy bedroom scene, soft morning light, lifestyle home photography, comfortable atmosphere, 8k' },
    { name: '厨房', prompt: 'product in a clean modern kitchen, bright daylight, home appliance photography style, sharp details' },
  ],
  outdoor: [
    { name: '户外自然', prompt: 'product in natural outdoor setting, golden hour sunlight, nature background, adventure lifestyle photography, 8k' },
    { name: '海滩度假', prompt: 'product on a tropical beach, sunset lighting, vacation lifestyle, luxury travel photography' },
    { name: '城市夜景', prompt: 'product in a city night scene, neon lights bokeh, urban lifestyle photography, cinematic lighting' },
  ],
  general: [
    { name: '场景1', prompt: 'professional e-commerce product photography, clean composition, commercial lighting, white background, ultra detailed' },
    { name: '场景2', prompt: 'product in a modern minimalist setting, soft natural light, lifestyle commercial photography, high-end' },
    { name: '场景3', prompt: 'creative product display, artistic composition, premium brand photography, magazine quality, 8k' },
  ],
};

// ==================== 多尺寸配置 ====================

const SIZE_PRESETS = {
  main: { width: 800, height: 800, label: '主图 1:1' },
  detail: { width: 750, height: null, label: '详情长图 750×N' },
  social: { width: 1080, height: 1440, label: '社媒 3:4' },
  banner: { width: 1920, height: 1080, label: '头图 16:9' },
  thumb: { width: 400, height: 400, label: '缩略图 1:1' },
};

// ==================== 主入口 ====================

/**
 * 执行详情长图完整管线
 * @param {Object} params
 * @param {string} params.productImageUrl - 商品主图 URL
 * @param {string} params.productName - 商品名称（用于 prompt 增强）
 * @param {string} [params.category='general'] - 场景模板分类: fashion|home|outdoor|general
 * @param {Array<string>} [params.customScenePrompts] - 自定义场景 prompt 列表
 * @param {Array<string>} [params.exportSizes] - 导出尺寸: ['main','detail','social','banner','thumb']
 * @param {number} [params.sceneCount=3] - 场景数量
 * @param {number} params.userId
 * @param {number} [params.tenantId]
 * @param {Function} [params.onProgress] - 进度回调 (phase, pct)
 */
export async function executeDetailLongImage(params) {
  const {
    productImageUrl, productName = '', category = 'general',
    customScenePrompts, exportSizes = ['main', 'detail'],
    sceneCount = 3, userId, tenantId, onProgress,
  } = params;

  if (!productImageUrl) throw new BusinessError(400, 'productImageUrl 为必填参数');

  const scenes = customScenePrompts
    ? customScenePrompts.slice(0, sceneCount).map((p, i) => ({ name: `自定义${i + 1}`, prompt: p }))
    : (SCENE_TEMPLATES[category] || SCENE_TEMPLATES.general).slice(0, sceneCount);

  const enhancedScenes = productName
    ? scenes.map((s) => ({ ...s, prompt: `${s.prompt}, product: ${productName}` }))
    : scenes;

  onProgress?.('scenes_ready', 5);

  // === Phase 1: 主图预处理（白底图） ===
  onProgress?.('preprocess', 10);
  const preprocessInput = {
    prompt: `professional e-commerce product photography, pure white background, studio lighting, ${productName}`,
    imageUrl: productImageUrl,
    size: '1024x1024',
  };

  let processedImageUrl = productImageUrl;
  try {
    const { gatewayInfer } = await import('../gateway/aiGatewayHub.js');
    const preResult = await gatewayInfer('gpt-image-2', preprocessInput, {
      userId, tenantId, taskType: 'detail_long_image', source: 'pipeline',
    });
    if (preResult?.images?.[0]?.url) {
      processedImageUrl = preResult.images[0].url;
    }
  } catch (e) {
    logger.warn(`[DetailLongImage] 预处理失败，使用原图: ${e.message}`);
  }
  onProgress?.('preprocess_done', 20);

  // === Phase 2: 多场景图批量生成 ===
  const sceneImages = [];
  for (let i = 0; i < enhancedScenes.length; i++) {
    const scene = enhancedScenes[i];
    try {
      const { gatewayInfer } = await import('../gateway/aiGatewayHub.js');
      const result = await gatewayInfer('gpt-image-2', {
        prompt: scene.prompt,
        size: '1024x1024',
        n: 1,
      }, { userId, tenantId, taskType: 'detail_long_image', source: 'pipeline' });

      const url = result?.images?.[0]?.url;
      if (url) {
        sceneImages.push({ name: scene.name, url, prompt: scene.prompt });
      }
    } catch (e) {
      logger.warn(`[DetailLongImage] 场景 ${scene.name} 生成失败: ${e.message}`);
    }
  }
  onProgress?.('scenes_done', 50);

  // === Phase 3: Sharp 垂直拼接为详情长图 ===
  const compositeResult = await compositeLongImage(sceneImages, 750, onProgress);
  onProgress?.('composite_done', 75);

  // === Phase 4: 多尺寸导出 ===
  const exports = {};
  for (const sizeKey of exportSizes) {
    const preset = SIZE_PRESETS[sizeKey];
    if (!preset) continue;
    try {
      const resized = await resizeImage(compositeResult.buffer, preset.width, preset.height);
      const fakeFile = {
        originalname: `detail_${sizeKey}_${Date.now()}.png`,
        buffer: resized,
        size: resized.length,
        mimetype: 'image/png',
      };
      const saved = await saveSimpleFile(fakeFile);
      exports[sizeKey] = { ...saved, label: preset.label, width: preset.width, height: preset.height };
    } catch (e) {
      logger.warn(`[DetailLongImage] 尺寸 ${sizeKey} 导出失败: ${e.message}`);
    }
  }
  onProgress?.('export_done', 95);

  const finalResult = {
    scenes: sceneImages.map((s) => ({ name: s.name, url: s.url })),
    composite: compositeResult.file,
    exports,
    sceneCount: sceneImages.length,
    category,
    completedAt: new Date().toISOString(),
  };

  onProgress?.('complete', 100);
  return finalResult;
}

// ==================== Sharp 长图拼接 ====================

async function compositeLongImage(sceneImages, outputWidth, onProgress) {
  if (sceneImages.length === 0) throw new BusinessError(500, '无可用场景图进行拼接');

  const sharp = (await import('sharp')).default;
  const buffers = [];
  const metas = [];

  for (const scene of sceneImages) {
    const resp = await fetch(scene.url);
    if (!resp.ok) throw new BusinessError(500, `下载场景图失败: HTTP ${resp.status}`);
    const buf = Buffer.from(await resp.arrayBuffer());
    const resized = await sharp(buf)
      .resize({ width: outputWidth, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
    const meta = await sharp(resized).metadata();
    buffers.push(resized);
    metas.push({ width: meta.width || outputWidth, height: meta.height || 400 });
  }

  const totalHeight = metas.reduce((sum, m) => sum + m.height, 0);
  const overlays = [];
  let yOffset = 0;
  for (let i = 0; i < buffers.length; i++) {
    overlays.push({
      input: buffers[i],
      top: yOffset,
      left: Math.max(0, Math.floor((outputWidth - metas[i].width) / 2)),
    });
    yOffset += metas[i].height;
  }

  const compositeBuffer = await sharp({
    create: {
      width: outputWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  }).composite(overlays).png().toBuffer();

  const fakeFile = {
    originalname: `detail_long_${Date.now()}.png`,
    buffer: compositeBuffer,
    size: compositeBuffer.length,
    mimetype: 'image/png',
  };
  const saveResult = await saveSimpleFile(fakeFile);

  return { buffer: compositeBuffer, file: saveResult, totalHeight, sceneCount: buffers.length };
}

// ==================== 单图缩放 ====================

async function resizeImage(buffer, width, height) {
  const sharp = (await import('sharp')).default;
  const resizeOpts = height
    ? { width, height, fit: 'cover' }
    : { width, fit: 'inside', withoutEnlargement: true };
  return sharp(buffer).resize(resizeOpts).png().toBuffer();
}

// ==================== 异步任务提交 ====================

export async function submitDetailLongImageJob(params) {
  const { userId, tenantId, ...pipelineParams } = params;
  const job = await jobQueueService.submitJob(userId, 'detail_long_image', {
    ...pipelineParams,
    tenantId,
  }, { priority: params.priority || 5 });
  return { jobId: job.id, status: 'queued' };
}

export default { executeDetailLongImage, submitDetailLongImageJob, SCENE_TEMPLATES, SIZE_PRESETS };
